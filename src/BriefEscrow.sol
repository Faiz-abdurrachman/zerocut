// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract BriefEscrow {
    address public oracle;
    uint256 public disputeTimeout;
    uint256 public constant SUBMISSION_TIMEOUT = 14 days;

    enum JobStatus {
        OPEN,
        IN_PROGRESS,
        SUBMITTED,
        COMPLETED,
        REFUNDED,
        DISPUTED,
        RESOLVED
    }

    enum DisputeOutcome { RELEASE, REFUND, SPLIT }

    struct Job {
        address        client;
        address        freelancer;
        uint256        amount;
        string         description;
        string         workUrl;
        JobStatus      status;
        DisputeOutcome outcome;
        uint8          freelancerPercent;
        bytes32        verdictHash;
        uint256        fundedAt;
        uint256        submittedAt;
    }

    struct Application {
        address freelancer;
        string  pitch;
    }

    uint256 public jobCount;
    mapping(uint256 => Job) public jobs;
    mapping(uint256 => Application[]) private _applications;
    mapping(uint256 => mapping(address => bool)) public hasApplied;

    event JobCreated(uint256 indexed jobId, address indexed client, uint256 amount, string description);
    event JobApplied(uint256 indexed jobId, address indexed freelancer, string pitch);
    event FreelancerHired(uint256 indexed jobId, address indexed freelancer);
    event WorkSubmitted(uint256 indexed jobId, string workUrl);
    event WorkApproved(uint256 indexed jobId, address indexed freelancer, uint256 amount);
    event DisputeTriggered(uint256 indexed jobId);
    event DisputeResolved(
        uint256 indexed jobId,
        DisputeOutcome outcome,
        uint8 freelancerPercent,
        bytes32 verdictHash,
        string reasoning
    );
    event RefundClaimed(uint256 indexed jobId, address indexed client, uint256 amount);

    modifier onlyOracle() {
        require(msg.sender == oracle, "Not oracle");
        _;
    }

    constructor(address _oracle, uint256 _disputeTimeout) {
        oracle = _oracle;
        disputeTimeout = _disputeTimeout;
    }

    // Client: post job + lock funds
    function createJob(string calldata description) external payable {
        require(msg.value > 0, "Must fund the job");
        require(bytes(description).length > 0, "Description required");
        require(bytes(description).length <= 3000, "Description too long");

        uint256 id = jobCount++;
        jobs[id] = Job({
            client: msg.sender,
            freelancer: address(0),
            amount: msg.value,
            description: description,
            workUrl: "",
            status: JobStatus.OPEN,
            outcome: DisputeOutcome.RELEASE,
            freelancerPercent: 0,
            verdictHash: bytes32(0),
            fundedAt: block.timestamp,
            submittedAt: 0
        });

        emit JobCreated(id, msg.sender, msg.value, description);
    }

    // Freelancer: submit a proposal/application
    function applyForJob(uint256 id, string calldata pitch) external {
        Job storage j = jobs[id];
        require(j.status == JobStatus.OPEN, "Job not open");
        require(j.client != msg.sender, "Cannot apply to your own job");
        require(!hasApplied[id][msg.sender], "Already applied");
        require(bytes(pitch).length <= 500, "Pitch too long");

        hasApplied[id][msg.sender] = true;
        _applications[id].push(Application({ freelancer: msg.sender, pitch: pitch }));

        emit JobApplied(id, msg.sender, pitch);
    }

    // Client: hire one applicant → starts the job
    function hireFreelancer(uint256 id, address freelancer) external {
        Job storage j = jobs[id];
        require(j.status == JobStatus.OPEN, "Job not open");
        require(j.client == msg.sender, "Not the client");
        require(hasApplied[id][freelancer], "Freelancer has not applied");

        j.freelancer = freelancer;
        j.status = JobStatus.IN_PROGRESS;

        emit FreelancerHired(id, freelancer);
    }

    // Freelancer: deliver work URL
    function submitWork(uint256 id, string calldata workUrl) external {
        Job storage j = jobs[id];
        require(j.status == JobStatus.IN_PROGRESS, "Job not in progress");
        require(j.freelancer == msg.sender, "Not the assigned freelancer");
        require(bytes(workUrl).length > 0, "Work URL required");

        j.workUrl = workUrl;
        j.status = JobStatus.SUBMITTED;
        j.submittedAt = block.timestamp;

        emit WorkSubmitted(id, workUrl);
    }

    // Client: approve work → instant payout
    function approveWork(uint256 id) external {
        Job storage j = jobs[id];
        require(j.status == JobStatus.SUBMITTED, "Work not submitted");
        require(j.client == msg.sender, "Not the client");

        j.status = JobStatus.COMPLETED;
        uint256 amt = j.amount;
        j.amount = 0;

        (bool ok,) = j.freelancer.call{value: amt}("");
        require(ok, "Transfer failed");

        emit WorkApproved(id, j.freelancer, amt);
    }

    // Freelancer: trigger dispute if client goes silent past timeout
    function triggerDispute(uint256 id) external {
        Job storage j = jobs[id];
        require(j.status == JobStatus.SUBMITTED, "Work not submitted");
        require(j.freelancer == msg.sender, "Not the assigned freelancer");
        require(block.timestamp >= j.submittedAt + disputeTimeout, "Timeout not reached");

        j.status = JobStatus.DISPUTED;

        emit DisputeTriggered(id);
    }

    // Oracle: post AI verdict on-chain
    function resolveDispute(
        uint256 id,
        DisputeOutcome outcome,
        uint8 freelancerPercent,
        bytes32 verdictHash,
        string calldata reasoning
    ) external onlyOracle {
        Job storage j = jobs[id];
        require(j.status == JobStatus.DISPUTED, "Job not disputed");
        require(freelancerPercent <= 100, "Invalid percent");

        j.status = JobStatus.RESOLVED;
        j.outcome = outcome;
        j.freelancerPercent = freelancerPercent;
        j.verdictHash = verdictHash;

        uint256 total = j.amount;
        j.amount = 0;

        if (outcome == DisputeOutcome.RELEASE) {
            (bool ok,) = j.freelancer.call{value: total}("");
            require(ok, "Freelancer transfer failed");
        } else if (outcome == DisputeOutcome.REFUND) {
            (bool ok,) = j.client.call{value: total}("");
            require(ok, "Client transfer failed");
        } else {
            uint256 freelancerAmt = (total * freelancerPercent) / 100;
            uint256 clientAmt = total - freelancerAmt;
            if (freelancerAmt > 0) {
                (bool ok,) = j.freelancer.call{value: freelancerAmt}("");
                require(ok, "Freelancer split failed");
            }
            if (clientAmt > 0) {
                (bool ok,) = j.client.call{value: clientAmt}("");
                require(ok, "Client split failed");
            }
        }

        emit DisputeResolved(id, outcome, freelancerPercent, verdictHash, reasoning);
    }

    // Client: refund if freelancer never submitted (14 days)
    function claimRefund(uint256 id) external {
        Job storage j = jobs[id];
        require(j.status == JobStatus.IN_PROGRESS, "Job not in progress");
        require(j.client == msg.sender, "Not the client");
        require(block.timestamp >= j.fundedAt + SUBMISSION_TIMEOUT, "Timeout not reached");

        j.status = JobStatus.REFUNDED;
        uint256 amt = j.amount;
        j.amount = 0;

        (bool ok,) = j.client.call{value: amt}("");
        require(ok, "Refund failed");

        emit RefundClaimed(id, msg.sender, amt);
    }

    // View: all applications for a job (address + pitch)
    function getApplications(uint256 id) external view returns (Application[] memory) {
        return _applications[id];
    }

    // View: single job
    function getJob(uint256 id) external view returns (Job memory) {
        return jobs[id];
    }

    // View: all job IDs by status
    function getJobsByStatus(JobStatus status) external view returns (uint256[] memory) {
        uint256 cnt;
        for (uint256 i; i < jobCount; i++) {
            if (jobs[i].status == status) cnt++;
        }
        uint256[] memory ids = new uint256[](cnt);
        uint256 idx;
        for (uint256 i; i < jobCount; i++) {
            if (jobs[i].status == status) ids[idx++] = i;
        }
        return ids;
    }
}
