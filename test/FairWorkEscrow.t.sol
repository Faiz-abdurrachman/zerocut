// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/FairWorkEscrow.sol";

contract FairWorkEscrowTest is Test {
    FairWorkEscrow public escrow;

    address client     = makeAddr("client");
    address freelancer = makeAddr("freelancer");
    address oracle     = makeAddr("oracle");
    address stranger   = makeAddr("stranger");

    uint256 constant TIMEOUT = 30; // 30 seconds for test
    uint256 constant JOB_AMOUNT = 0.01 ether;

    function setUp() public {
        escrow = new FairWorkEscrow(oracle, TIMEOUT);
        vm.deal(client, 1 ether);
        vm.deal(freelancer, 0.1 ether);
    }

    // ─── Happy Path ────────────────────────────────────────────────────────

    function test_CreateJob() public {
        vm.prank(client);
        escrow.createJob{value: JOB_AMOUNT}("Design a logo for cafe");

        FairWorkEscrow.Job memory job = escrow.getJob(0);
        assertEq(job.client, client);
        assertEq(job.amount, JOB_AMOUNT);
        assertEq(uint(job.status), uint(FairWorkEscrow.JobStatus.OPEN));
    }

    function test_AcceptJob() public {
        _createJob();

        vm.prank(freelancer);
        escrow.acceptJob(0);

        FairWorkEscrow.Job memory job = escrow.getJob(0);
        assertEq(job.freelancer, freelancer);
        assertEq(uint(job.status), uint(FairWorkEscrow.JobStatus.IN_PROGRESS));
    }

    function test_SubmitWork() public {
        _createAndAcceptJob();

        vm.prank(freelancer);
        escrow.submitWork(0, "https://figma.com/my-design");

        FairWorkEscrow.Job memory job = escrow.getJob(0);
        assertEq(uint(job.status), uint(FairWorkEscrow.JobStatus.SUBMITTED));
        assertEq(job.workUrl, "https://figma.com/my-design");
    }

    function test_ApproveWork_ReleasesToFreelancer() public {
        _submitWork();
        uint256 balanceBefore = freelancer.balance;

        vm.prank(client);
        escrow.approveWork(0);

        assertEq(freelancer.balance, balanceBefore + JOB_AMOUNT);
        assertEq(uint(escrow.getJob(0).status), uint(FairWorkEscrow.JobStatus.COMPLETED));
    }

    // ─── Dispute Path ──────────────────────────────────────────────────────

    function test_TriggerDispute_AfterTimeout() public {
        _submitWork();
        vm.warp(block.timestamp + TIMEOUT + 1);

        vm.prank(freelancer);
        escrow.triggerDispute(0);

        assertEq(uint(escrow.getJob(0).status), uint(FairWorkEscrow.JobStatus.DISPUTED));
    }

    function test_TriggerDispute_BeforeTimeout_Reverts() public {
        _submitWork();

        vm.prank(freelancer);
        vm.expectRevert("Timeout not reached yet");
        escrow.triggerDispute(0);
    }

    function test_ResolveDispute_Release() public {
        _triggerDispute();
        uint256 balanceBefore = freelancer.balance;
        bytes32 hash = keccak256(bytes("Work matches brief"));

        vm.prank(oracle);
        escrow.resolveDispute(0, FairWorkEscrow.DisputeOutcome.RELEASE, 100, hash, "Work matches brief");

        assertEq(freelancer.balance, balanceBefore + JOB_AMOUNT);
        assertEq(uint(escrow.getJob(0).status), uint(FairWorkEscrow.JobStatus.RESOLVED));
    }

    function test_ResolveDispute_Refund() public {
        _triggerDispute();
        uint256 balanceBefore = client.balance;
        bytes32 hash = keccak256(bytes("Work does not match brief"));

        vm.prank(oracle);
        escrow.resolveDispute(0, FairWorkEscrow.DisputeOutcome.REFUND, 0, hash, "Work does not match brief");

        assertEq(client.balance, balanceBefore + JOB_AMOUNT);
    }

    function test_ResolveDispute_Split() public {
        _triggerDispute();
        bytes32 hash = keccak256(bytes("Partially matches"));

        uint256 freelancerBefore = freelancer.balance;
        uint256 clientBefore = client.balance;

        vm.prank(oracle);
        escrow.resolveDispute(0, FairWorkEscrow.DisputeOutcome.SPLIT, 70, hash, "Partially matches");

        assertEq(freelancer.balance, freelancerBefore + (JOB_AMOUNT * 70 / 100));
        assertEq(client.balance, clientBefore + (JOB_AMOUNT * 30 / 100));
    }

    function test_ResolveDispute_OnlyOracle() public {
        _triggerDispute();

        vm.prank(stranger);
        vm.expectRevert("Not oracle");
        escrow.resolveDispute(0, FairWorkEscrow.DisputeOutcome.RELEASE, 100, bytes32(0), "");
    }

    // ─── Security ──────────────────────────────────────────────────────────

    function test_CannotAcceptOwnJob() public {
        _createJob();

        vm.prank(client);
        vm.expectRevert("Cannot accept your own job");
        escrow.acceptJob(0);
    }

    function test_CannotDoubleAccept() public {
        _createAndAcceptJob();

        // status is IN_PROGRESS after accept, so "Job not open" fires first
        vm.prank(stranger);
        vm.expectRevert("Job not open");
        escrow.acceptJob(0);
    }

    function test_CreateJob_NoEth_Reverts() public {
        vm.prank(client);
        vm.expectRevert("Must send ETH to fund job");
        escrow.createJob{value: 0}("Test job");
    }

    function test_GetJobsByStatus() public {
        vm.startPrank(client);
        escrow.createJob{value: JOB_AMOUNT}("Job 1");
        escrow.createJob{value: JOB_AMOUNT}("Job 2");
        escrow.createJob{value: JOB_AMOUNT}("Job 3");
        vm.stopPrank();

        uint256[] memory openJobs = escrow.getJobsByStatus(FairWorkEscrow.JobStatus.OPEN);
        assertEq(openJobs.length, 3);
    }

    // ─── Helpers ───────────────────────────────────────────────────────────

    function _createJob() internal {
        vm.prank(client);
        escrow.createJob{value: JOB_AMOUNT}("Design a logo for cafe");
    }

    function _createAndAcceptJob() internal {
        _createJob();
        vm.prank(freelancer);
        escrow.acceptJob(0);
    }

    function _submitWork() internal {
        _createAndAcceptJob();
        vm.prank(freelancer);
        escrow.submitWork(0, "https://figma.com/my-design");
    }

    function _triggerDispute() internal {
        _submitWork();
        vm.warp(block.timestamp + TIMEOUT + 1);
        vm.prank(freelancer);
        escrow.triggerDispute(0);
    }
}
