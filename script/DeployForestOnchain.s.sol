// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console2} from "forge-std/Script.sol";
import {ForestOnchain} from "../src/ForestOnchain.sol";

contract DeployForestOnchainLocal is Script {
    uint public constant COST_PER_TREE = 1e9;
    ForestOnchain public forestOnchain;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();
        forestOnchain = new ForestOnchain(COST_PER_TREE);
        vm.stopBroadcast();
    }
}

contract DeployForestOchainSepolia is Script {
    uint public constant COST_PER_TREE = 1e9;

    function run() external {
        require(
            block.chainid == 11155111,
            "DeployGovernanceSepolia: wrong network (not Sepolia)"
        );

        uint256 deployerKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerKey);
        ForestOnchain forestOnchain = new ForestOnchain(COST_PER_TREE);
        vm.stopBroadcast();

        console2.log("Sepolia ForestOnchain:   %s", address(forestOnchain));
        console2.log("Deployer:                %s", vm.addr(deployerKey));
        console2.log("Chain ID:                %s", block.chainid);
    }
}
