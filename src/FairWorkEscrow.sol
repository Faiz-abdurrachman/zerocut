// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract FairWorkEscrow {
    address public oracle;
    uint256 public disputeTimeout;       // 30s for demo/testnet, 7 days for prod
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
        address   client;
        address   freelancer;
        uint256   amount;
        string    description;
        string    workUrl;
        JobStatus status;
        DisputeOutcome outcome;
        uint8     freelancerPercent; // 0-100, used for SPLIT
        bytes32   verdictHash;       // keccak256 of AI reasoning, proof on-chain
        uint256   fundedAt;
        uint256   submittedAt;
    }

    uint256 public jobCount;
    mapping(uint256 => Job) public jobs;

    event JobCreated(uint256 indexed jobId, address indexed client, uint256 amount, string description);
    event JobAccepted(uint256 indexed jobId, address indexed freelancer);
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

    // Client: create job + lock ETH in one tx
    function createJob(string calldata description) external payable {
        require(msg.value > 0, "Must send ETH to fund job");
        require(bytes(description).length > 0, "Description required");
        require(bytes(description).length <= 1000, "Description too long");

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

    // Freelancer: take an open job
    function acceptJob(uint256 id) external {
        Job storage j = jobs[id];
        require(j.status == JobStatus.OPEN, "Job not open");
        require(j.freelancer == address(0), "Job already taken");
        require(j.client != msg.sender, "Cannot accept your own job");

        j.freelancer = msg.sender;
        j.status = JobStatus.IN_PROGRESS;

        emit JobAccepted(id, msg.sender);
    }

    // Freelancer: submit work URL (Figma, Drive, Notion, etc.)
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

    // Client: approve work → ETH released to freelancer instantly
    function approveWork(uint256 id) external {
        Job storage j = jobs[id];
        require(j.status == JobStatus.SUBMITTED, "Work not submitted");
        require(j.client == msg.sender, "Not the client");

        j.status = JobStatus.COMPLETED;
        uint256 amt = j.amount;
        j.amount = 0;

        (bool ok,) = j.freelancer.call{value: amt}("");
        require(ok, "Transfer to freelancer failed");

        emit WorkApproved(id, j.freelancer, amt);
    }

    // Freelancer: trigger dispute after client goes silent
    function triggerDispute(uint256 id) external {
        Job storage j = jobs[id];
        require(j.status == JobStatus.SUBMITTED, "Work not submitted");
        require(j.freelancer == msg.sender, "Not the assigned freelancer");
        require(block.timestamp >= j.submittedAt + disputeTimeout, "Timeout not reached yet");

        j.status = JobStatus.DISPUTED;

        emit DisputeTriggered(id);
    }

    // Oracle (backend): execute AI verdict on-chain
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
            require(ok, "Transfer to freelancer failed");
        } else if (outcome == DisputeOutcome.REFUND) {
            (bool ok,) = j.client.call{value: total}("");
            require(ok, "Transfer to client failed");
        } else {
            // SPLIT
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

    // Client: refund if freelancer never submitted after 14 days
    function claimRefund(uint256 id) external {
        Job storage j = jobs[id];
        require(j.status == JobStatus.IN_PROGRESS, "Job not in progress");
        require(j.client == msg.sender, "Not the client");
        require(block.timestamp >= j.fundedAt + SUBMISSION_TIMEOUT, "Submission timeout not reached");

        j.status = JobStatus.REFUNDED;
        uint256 amt = j.amount;
        j.amount = 0;

        (bool ok,) = j.client.call{value: amt}("");
        require(ok, "Refund failed");

        emit RefundClaimed(id, msg.sender, amt);
    }

    // View: get single job
    function getJob(uint256 id) external view returns (Job memory) {
        return jobs[id];
    }

    // View: get all job IDs with a specific status (for frontend listing)
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
