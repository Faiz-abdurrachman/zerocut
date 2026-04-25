// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/FairWorkEscrow.sol";

contract Deploy is Script {
    function run() external {
        address oracle = vm.envAddress("ORACLE_ADDRESS");
        uint256 disputeTimeout = vm.envUint("DISPUTE_TIMEOUT");

        vm.startBroadcast();
        FairWorkEscrow escrow = new FairWorkEscrow(oracle, disputeTimeout);
        vm.stopBroadcast();

        console.log("FairWorkEscrow deployed at:", address(escrow));
        console.log("Oracle:", oracle);
        console.log("Dispute timeout:", disputeTimeout, "seconds");
    }
}
