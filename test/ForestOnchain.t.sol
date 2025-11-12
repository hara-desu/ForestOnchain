// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {ForestOnchain} from "../src/ForestOnchain.sol";

contract ForestOnchainTest is Test {
    ForestOnchain public forestOnchain;
    uint public CONTRACT_FUND_AMOUNT = 1234000 ether;
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
    uint constant WITHDRAW_AMOUNT = 1234000;
    address OWNER = makeAddr("OWNER");

    function setUp() public {
        vm.deal(OWNER, 1 ether);
        vm.startPrank(OWNER);
        forestOnchain = new ForestOnchain(COST_PER_TREE);
        vm.stopPrank();
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
    function testEndFocusSessionRevertsIfNoActiveSession() public {
        // Arrange
        // Act
        vm.expectRevert(
            abi.encodeWithSelector(
                ForestOnchain.ForestOnchain__NoOngoingSession.selector,
                USER1
            )
        );
        vm.prank(USER1);
        forestOnchain.endFocusSession(USER1);
        // Assert
    }

    function testEndFocusSessionRevertsIfSessionNotEnded() public {
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
                ForestOnchain.ForestOnchain__SessionNotEndedYet.selector,
                forestOnchain.getCurrentUserSession(USER1).endTime
            )
        );
        forestOnchain.endFocusSession(USER1);
        // Assert
    }

    //////////////////////////////
    /* ForestOnchain: takeBreak */
    //////////////////////////////
    function testTakeBreakRevertsIfSessionActive() public {
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
                ForestOnchain.ForestOnchain__SessionOngoing.selector,
                USER1
            )
        );
        vm.prank(USER1);
        forestOnchain.takeBreak();
    }

    function testTakeBreakRevertsIfBreakNotNeeded() public {
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
                ForestOnchain.ForestOnchain__SessionOngoing.selector,
                USER1
            )
        );
        vm.prank(USER1);
        forestOnchain.takeBreak();
    }

    function testTakeBreakWorks() public {
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
        vm.warp(block.timestamp + SESSION_DURATION);
        (bool upkeepNeeded, bytes memory performData) = forestOnchain
            .checkUpkeep("");
        forestOnchain.performUpkeep(performData);

        // Act
        vm.expectEmit(address(forestOnchain));
        emit ForestOnchain.BreakTaken(USER1);

        vm.prank(USER1);
        forestOnchain.takeBreak();
    }

    //////////////////////////////////////
    /* ForestOnchain: changeCostPerTree */
    //////////////////////////////////////
    function testChangeCostPerTreeRevertsIfCalledByNonOwner() public {
        // Arrange
        // Act
        vm.expectRevert("Only owner can call this function");
        vm.prank(USER1);
        forestOnchain.changeCostPerTree(1);
    }

    function testChangeCostPerTreeWorks() public {
        // Arrange
        uint newCostPerTree = 1;
        // Act
        vm.expectEmit(address(forestOnchain));
        emit ForestOnchain.CostPerTreeChanged(newCostPerTree);
        vm.prank(address(forestOnchain.CONTRACT_OWNER()));
        forestOnchain.changeCostPerTree(newCostPerTree);
    }

    //////////////////////////////
    /* ForestOnchain: startGoal */
    //////////////////////////////
    function testStartGoalRevertsIfGoalDurationLessThanMaxSessionDuration()
        public
    {
        // Arrange
        uint stakeAmount = forestOnchain.getStakeAmount(GOAL_TREES);

        // Act
        vm.expectRevert(
            abi.encodeWithSelector(
                ForestOnchain
                    .ForestOnchain__GoalDurationShouldBeMoreThan60Minutes
                    .selector,
                MAX_SESSION_DURATION - 1
            )
        );
        vm.prank(USER1);
        forestOnchain.startGoal{value: stakeAmount}(
            ACTIVITY_TYPE_1,
            MAX_SESSION_DURATION - 1,
            GOAL_TREES
        );
        // Assert
    }

    function testStartGoalRevertsIfNumTreesLessThanMin() public {
        // Arrange
        uint stakeAmount = forestOnchain.getStakeAmount(GOAL_TREES);

        // Act
        vm.expectRevert(
            abi.encodeWithSelector(
                ForestOnchain
                    .ForestOnchain__EnterMoreThankMinNumOfTreesPerGoal
                    .selector,
                MIN_NUM_TREES_PER_GOAL - 1
            )
        );
        vm.prank(USER1);
        forestOnchain.startGoal{value: stakeAmount}(
            ACTIVITY_TYPE_1,
            GOAL_DURATION,
            MIN_NUM_TREES_PER_GOAL - 1
        );
        // Assert
    }

    function testStartGoalRevertsIfGoalExists() public {
        // Arrange
        uint stakeAmount = forestOnchain.getStakeAmount(GOAL_TREES);

        // Act
        vm.prank(USER1);
        forestOnchain.startGoal{value: stakeAmount}(
            ACTIVITY_TYPE_1,
            GOAL_DURATION,
            GOAL_TREES
        );

        vm.expectRevert(
            abi.encodeWithSelector(
                ForestOnchain.ForestOnchain__GoalAlreadyExists.selector
            )
        );
        vm.prank(USER1);
        forestOnchain.startGoal{value: stakeAmount}(
            ACTIVITY_TYPE_1,
            GOAL_DURATION,
            GOAL_TREES
        );
        // Assert
    }

    function testStartGoalRevertsIfIncorrectStakeAmount() public {
        // Arrange
        uint stakeAmount = 1;

        // Act
        vm.expectRevert(
            abi.encodeWithSelector(
                ForestOnchain.ForestOnchain__IncorrectStakeSent.selector,
                stakeAmount,
                forestOnchain.getStakeAmount(GOAL_TREES)
            )
        );
        vm.prank(USER1);
        forestOnchain.startGoal{value: stakeAmount}(
            ACTIVITY_TYPE_1,
            GOAL_DURATION,
            GOAL_TREES
        );
        // Assert
    }

    function testStartGoalEmitsEvent() public {
        // Arrange
        uint stakeAmount = forestOnchain.getStakeAmount(GOAL_TREES);

        // Act
        vm.expectEmit(address(forestOnchain));
        emit ForestOnchain.GoalStarted(
            USER1,
            ACTIVITY_TYPE_1,
            block.timestamp,
            block.timestamp + GOAL_DURATION,
            true,
            GOAL_TREES,
            stakeAmount
        );

        vm.prank(USER1);
        forestOnchain.startGoal{value: stakeAmount}(
            ACTIVITY_TYPE_1,
            GOAL_DURATION,
            GOAL_TREES
        );
        // Assert
    }

    ///////////////////////////////
    /* ForestOnchain: claimStake */
    ///////////////////////////////
    function testClaimStakeRevertsIfGoalNotActive() public {
        // Arrange
        // Act
        vm.expectRevert(
            abi.encodeWithSelector(
                ForestOnchain.ForestOnchain__NoActiveGoal.selector,
                ACTIVITY_TYPE_1
            )
        );
        vm.prank(USER1);
        forestOnchain.claimStake(ACTIVITY_TYPE_1);
        // Assert
    }

    function testClaimStakeRevertsIfGoalNoteReached() public {
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
        vm.warp(block.timestamp + SESSION_DURATION);
        (bool upkeepNeeded, bytes memory performData) = forestOnchain
            .checkUpkeep("");
        forestOnchain.performUpkeep(performData);

        // Act
        vm.expectRevert(
            abi.encodeWithSelector(
                ForestOnchain.ForestOnchain__GoalNotReached.selector,
                forestOnchain.getGoal(USER1, ACTIVITY_TYPE_1)
            )
        );
        vm.prank(USER1);
        forestOnchain.claimStake(ACTIVITY_TYPE_1);
    }

    function testClaimStakeRevertsIfDurationIsOver() public {
        // Arrange
        uint stakeAmount = forestOnchain.getStakeAmount(GOAL_TREES);
        vm.prank(USER1);
        forestOnchain.startGoal{value: stakeAmount}(
            ACTIVITY_TYPE_1,
            GOAL_DURATION,
            GOAL_TREES
        );

        // Session 1
        vm.prank(USER1);
        forestOnchain.startFocusSession(ACTIVITY_TYPE_1, SESSION_DURATION);
        vm.warp(block.timestamp + SESSION_DURATION);
        (bool upkeepNeeded1, bytes memory performData1) = forestOnchain
            .checkUpkeep("");
        forestOnchain.performUpkeep(performData1);
        vm.prank(USER1);
        forestOnchain.takeBreak();
        vm.warp(block.timestamp + GOAL_DURATION + 1);

        // Session 2
        vm.prank(USER1);
        forestOnchain.startFocusSession(ACTIVITY_TYPE_1, SESSION_DURATION);
        vm.warp(block.timestamp + SESSION_DURATION);
        (bool upkeepNeeded2, bytes memory performData2) = forestOnchain
            .checkUpkeep("");
        forestOnchain.performUpkeep(performData2);

        // Act
        vm.expectRevert(
            abi.encodeWithSelector(
                ForestOnchain.ForestOnchain__GoalDurationIsOver.selector,
                forestOnchain.getEndTime(USER1, ACTIVITY_TYPE_1),
                block.timestamp
            )
        );
        vm.prank(USER1);
        forestOnchain.claimStake(ACTIVITY_TYPE_1);
    }

    function testClaimStakeEmitsEvent() public {
        // Arrange
        uint stakeAmount = forestOnchain.getStakeAmount(GOAL_TREES);
        vm.prank(USER1);
        forestOnchain.startGoal{value: stakeAmount}(
            ACTIVITY_TYPE_1,
            GOAL_DURATION,
            GOAL_TREES
        );

        // Session 1
        vm.prank(USER1);
        forestOnchain.startFocusSession(ACTIVITY_TYPE_1, SESSION_DURATION);
        vm.warp(block.timestamp + SESSION_DURATION);
        (bool upkeepNeeded1, bytes memory performData1) = forestOnchain
            .checkUpkeep("");
        forestOnchain.performUpkeep(performData1);
        vm.prank(USER1);
        forestOnchain.takeBreak();

        // Session 2
        vm.prank(USER1);
        forestOnchain.startFocusSession(ACTIVITY_TYPE_1, SESSION_DURATION);
        vm.warp(block.timestamp + SESSION_DURATION);
        (bool upkeepNeeded2, bytes memory performData2) = forestOnchain
            .checkUpkeep("");
        forestOnchain.performUpkeep(performData2);

        // Act
        vm.expectEmit(address(forestOnchain));
        emit ForestOnchain.GoalClaimed(USER1, ACTIVITY_TYPE_1, stakeAmount);
        vm.prank(USER1);
        forestOnchain.claimStake(ACTIVITY_TYPE_1);
    }

    /////////////////////////////
    /* ForestOnchain: withdraw */
    /////////////////////////////
    function testWithdrawRevertsIfToZeroAddress() public {
        // Arrange
        address contractOwner = forestOnchain.CONTRACT_OWNER();

        // Act
        vm.expectRevert(
            abi.encodeWithSelector(
                ForestOnchain.ForestOnchain__CannotSendToZeroAddress.selector
            )
        );
        vm.prank(contractOwner);
        forestOnchain.withdraw(payable(address(0)), WITHDRAW_AMOUNT);

        // Assert
    }

    function testWithdrawRevertsInsufficientFunds() public {
        // Arrange
        address contractOwner = forestOnchain.CONTRACT_OWNER();

        // Act
        vm.expectRevert(
            abi.encodeWithSelector(
                ForestOnchain.ForestOnchain__InsufficientFunds.selector
            )
        );
        vm.prank(contractOwner);
        forestOnchain.withdraw(
            payable(contractOwner),
            WITHDRAW_AMOUNT + CONTRACT_FUND_AMOUNT
        );

        // Assert
    }

    function testWithdrawRevertsIfCalledByNonOwner() public {
        // Arrange

        // Act
        vm.prank(USER1);
        vm.expectRevert("Only owner can call this function");
        forestOnchain.withdraw(payable(USER1), WITHDRAW_AMOUNT);

        // Assert
    }

    function testWithdrawEmitsEvent() public {
        // Arrange
        address contractOwner = forestOnchain.CONTRACT_OWNER();

        // Act
        vm.expectEmit(address(forestOnchain));
        emit ForestOnchain.EtherWithdrawn(contractOwner, WITHDRAW_AMOUNT);

        vm.prank(contractOwner);
        forestOnchain.withdraw(payable(contractOwner), WITHDRAW_AMOUNT);

        // Assert
    }
}
