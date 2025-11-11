// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {ForestOnchain} from "../src/ForestOnchain.sol";

contract ForestOnchainTest is Test {
    ForestOnchain public forestOnchain;
    uint public CONTRACT_FUND_AMOUNT = 1e17;
    address USER1 = makeAddr("USER1");

    function setUp() public {
        forestOnchain = new ForestOnchain();
        vm.deal(address(forestOnchain), CONTRACT_FUND_AMOUNT);
    }

    function testActivityAdded() public {
        // Arrange
        string memory activity = "Study";

        // Act / Assert
        vm.expectEmit(address(forestOnchain));
        emit ForestOnchain.ActivityAdded(activity);

        vm.prank(USER1);
        forestOnchain.addActivityType(activity);
    }
}
