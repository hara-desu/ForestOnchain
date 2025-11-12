// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {ForestOnchain} from "../src/ForestOnchain.sol";

contract ForestOnchainTest is Test {
    ForestOnchain public forestOnchain;
    uint public CONTRACT_FUND_AMOUNT = 1e17;
    uint public USER_FUND_AMOUNT = 5 ether;
    address USER1 = makeAddr("USER1");
    address USER2 = makeAddr("USER2");
    uint public constant COST_PER_TREE = 1e9;
    string constant ACTIVITY_TYPE_1 = "Study";
    string constant ACTIVITY_TYPE_2 = "Work";
    uint constant GOAL_DURATION = 3 days;
    uint constant GOAL_TREES = 2;
    uint constant SESSION_DURATION = 40 minutes;
    uint constant MAX_SESSION_DURATION = 60 minutes;
    uint constant MIN_SESSION_DURATION = 20 minutes;
    uint constant MIN_NUM_TREES_PER_GOAL = 1;

    function setUp() public {
        forestOnchain = new ForestOnchain(COST_PER_TREE);
        vm.deal(address(forestOnchain), CONTRACT_FUND_AMOUNT);
        vm.deal(USER1, USER_FUND_AMOUNT);
    }

    ////////////////////////////////////////
    /* ForestOnchain: checkActivityExists */
    ////////////////////////////////////////
    function testCheckActivityExistsReturnsFalse() public {
        // Arrange
        // Act
        bool activityExists = forestOnchain.checkActivityExists(
            USER1,
            ACTIVITY_TYPE_1
        );
        // Assert
        assert(!activityExists);
    }

    function testCheckActivityExistsReturnsTrue() public {
        // Arrange
        uint stakeAmount = forestOnchain.getStakeAmount(GOAL_TREES);
        vm.prank(USER1);
        forestOnchain.startGoal{value: stakeAmount}(
            ACTIVITY_TYPE_1,
            GOAL_DURATION,
            GOAL_TREES
        );
        vm.prank(USER1);
        forestOnchain.startFocusSession(ACTIVITY_TYPE_1, SESSION_DURATION);

        // Act
        bool activityExists = forestOnchain.checkActivityExists(
            USER1,
            ACTIVITY_TYPE_1
        );

        // Assert
        assert(activityExists);
    }

    //////////////////////////////////////
    /* ForestOnchain: startFocusSession */
    //////////////////////////////////////
    function testStartFocusSessionRevertsIfAnotherSessionIsActive() public {
        // Arrange
        uint stakeAmount = forestOnchain.getStakeAmount(GOAL_TREES);
        vm.prank(USER1);
        forestOnchain.startGoal{value: stakeAmount}(
            ACTIVITY_TYPE_1,
            GOAL_DURATION,
            GOAL_TREES
        );
        vm.prank(USER1);
        forestOnchain.startFocusSession(ACTIVITY_TYPE_1, SESSION_DURATION);

        // Act
        vm.expectRevert(
            abi.encodeWithSelector(
                ForestOnchain.ForestOnchain__AnotherSessionOngoing.selector,
                ACTIVITY_TYPE_1
            )
        );
        vm.prank(USER1);
        forestOnchain.startFocusSession(ACTIVITY_TYPE_1, SESSION_DURATION);
        // Assert
    }

    function testStartFocusSessionRevertsIfBreakNeeded() public {
        // Arrange
        uint stakeAmount = forestOnchain.getStakeAmount(GOAL_TREES);
        vm.prank(USER1);
        forestOnchain.startGoal{value: stakeAmount}(
            ACTIVITY_TYPE_1,
            GOAL_DURATION,
            GOAL_TREES
        );
        vm.prank(USER1);
        forestOnchain.startFocusSession(ACTIVITY_TYPE_1, SESSION_DURATION);
        vm.warp(block.timestamp + SESSION_DURATION + 1);
        vm.prank(USER1);
        forestOnchain.endFocusSession(USER1);

        // Act
        vm.expectRevert(
            abi.encodeWithSelector(
                ForestOnchain.ForestOnchain__BreakNeeded.selector
            )
        );
        vm.prank(USER1);
        forestOnchain.startFocusSession(ACTIVITY_TYPE_1, SESSION_DURATION);
        // Assert
    }

    function testStartFocusSessionRevertsIfDurationNotEnough() public {
        // Arrange
        uint stakeAmount = forestOnchain.getStakeAmount(GOAL_TREES);
        vm.prank(USER1);
        forestOnchain.startGoal{value: stakeAmount}(
            ACTIVITY_TYPE_1,
            GOAL_DURATION,
            GOAL_TREES
        );
        uint sessionDuration = MIN_SESSION_DURATION - 1;

        // Act
        vm.expectRevert(
            abi.encodeWithSelector(
                ForestOnchain.ForestOnchain__DurationOutOfRange.selector,
                sessionDuration
            )
        );
        vm.prank(USER1);
        forestOnchain.startFocusSession(ACTIVITY_TYPE_1, sessionDuration);
        // Assert
    }

    function testStartFocusSessionRevertsIfNoActiveGoal() public {
        // Arrange
        // Act
        vm.expectRevert(
            abi.encodeWithSelector(
                ForestOnchain.ForestOnchain__NoActiveGoal.selector,
                ACTIVITY_TYPE_1
            )
        );
        vm.prank(USER1);
        forestOnchain.startFocusSession(ACTIVITY_TYPE_1, SESSION_DURATION);
        // Assert
    }

    function testStartFocusSessionRevertsIfAnotherGoalActive() public {
        // Arrange
        uint stakeAmount = forestOnchain.getStakeAmount(GOAL_TREES);
        vm.prank(USER1);
        forestOnchain.startGoal{value: stakeAmount}(
            ACTIVITY_TYPE_2,
            GOAL_DURATION,
            GOAL_TREES
        );

        // Act
        vm.expectRevert(
            abi.encodeWithSelector(
                ForestOnchain.ForestOnchain__NoActiveGoal.selector,
                ACTIVITY_TYPE_1
            )
        );
        vm.prank(USER1);
        forestOnchain.startFocusSession(ACTIVITY_TYPE_1, SESSION_DURATION);
        // Assert
    }

    function testStartFocusSessionEmitsEvent() public {
        // Arrange
        uint stakeAmount = forestOnchain.getStakeAmount(GOAL_TREES);
        vm.prank(USER1);
        forestOnchain.startGoal{value: stakeAmount}(
            ACTIVITY_TYPE_1,
            GOAL_DURATION,
            GOAL_TREES
        );

        // Act
        vm.expectEmit(address(forestOnchain));
        emit ForestOnchain.SessionStarted(
            USER1,
            ACTIVITY_TYPE_1,
            block.timestamp,
            block.timestamp + SESSION_DURATION
        );

        vm.prank(USER1);
        forestOnchain.startFocusSession(ACTIVITY_TYPE_1, SESSION_DURATION);
        // Assert
    }

    ////////////////////////////////
    /* ForestOnchain: checkUpkeep */
    ////////////////////////////////
    function testCheckUpkeepReturnsFalseIfNoActiveUsers() public {
        // Arrange
        // Act
        (bool upkeepNeeded, bytes memory performData) = forestOnchain
            .checkUpkeep("");
        // Assert
        assert(!upkeepNeeded);
    }

    function testCheckUpkeepReturnsFalseIfSessionTimeNotEnded() public {
        // Arrange
        uint stakeAmount = forestOnchain.getStakeAmount(GOAL_TREES);
        vm.prank(USER1);
        forestOnchain.startGoal{value: stakeAmount}(
            ACTIVITY_TYPE_1,
            GOAL_DURATION,
            GOAL_TREES
        );

        // Act
        vm.prank(USER1);
        forestOnchain.startFocusSession(ACTIVITY_TYPE_1, SESSION_DURATION);
        (bool upkeepNeeded, bytes memory performData) = forestOnchain
            .checkUpkeep("");
        // Assert
        assert(!upkeepNeeded);
    }

    function testCheckUpkeepReturnsTrue() public {
        // Arrange
        uint stakeAmount = forestOnchain.getStakeAmount(GOAL_TREES);
        vm.prank(USER1);
        forestOnchain.startGoal{value: stakeAmount}(
            ACTIVITY_TYPE_1,
            GOAL_DURATION,
            GOAL_TREES
        );

        // Act
        vm.prank(USER1);
        forestOnchain.startFocusSession(ACTIVITY_TYPE_1, SESSION_DURATION);
        vm.warp(block.timestamp + SESSION_DURATION);
        (bool upkeepNeeded, bytes memory performData) = forestOnchain
            .checkUpkeep("");
        // Assert
        assert(upkeepNeeded);
    }

    //////////////////////////////////
    /* ForestOnchain: performUpkeep */
    //////////////////////////////////
    function testPerformUpkeepWorks() public {
        // Arrange
        uint stakeAmount = forestOnchain.getStakeAmount(GOAL_TREES);
        vm.prank(USER1);
        forestOnchain.startGoal{value: stakeAmount}(
            ACTIVITY_TYPE_1,
            GOAL_DURATION,
            GOAL_TREES
        );

        // Act
        vm.prank(USER1);
        forestOnchain.startFocusSession(ACTIVITY_TYPE_1, SESSION_DURATION);
        vm.warp(block.timestamp + SESSION_DURATION);
        (bool upkeepNeeded, bytes memory performData) = forestOnchain
            .checkUpkeep("");

        vm.expectEmit(address(forestOnchain));
        emit ForestOnchain.SessionEnded(USER1);

        forestOnchain.performUpkeep(performData);
        // Assert
    }

    ////////////////////////////////////
    /* ForestOnchain: endFocusSession */
    ////////////////////////////////////
    function testEndFocusSessionRevertsIfUserIsNotSessionOwner() public {}
}
