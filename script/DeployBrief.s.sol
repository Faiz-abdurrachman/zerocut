// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/BriefEscrow.sol";

contract DeployBrief is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);
        new BriefEscrow(
            0x270A4C4619dE984cdb44CfC5D08C0D4fa07e3Ceb,
            30
        );
        vm.stopBroadcast();
    }
}
