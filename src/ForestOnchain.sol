// SPDX-License-Identifier: MIT
// Deployed at: 0xA70C21d6577de79270BcA81065Ca42D7BE0CeF2d
pragma solidity ^0.8.13;

import {AutomationCompatibleInterface} from "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

/**
 * @title  ForestOnchain
 * @author Lada Zimina
 * @notice A Pomodoro-style focus and goal-tracking contract with on-chain stakes.
 */
contract ForestOnchain {
    error ForestOnchain__AddActivityType();
    error ForestOnchain__AnotherSessionOngoing(string currentSession);
    error ForestOnchain__NoOngoingSession(address user);
    error ForestOnchain__BreakNeeded();
    error ForestOnchain__SessionOngoing(address user);
    error ForestOnchain__BreakNotNeeded(address user);
    error ForestOnchain__DurationOutOfRange(uint duration);
    error ForestOnchain__GoalDurationShouldBeMoreThan60Minutes(uint duration);
    error ForestOnchain__EnterMoreThankMinNumOfTreesPerGoal(uint numberOfTrees);
    error ForestOnchain__GoalAlreadyExists();
    error ForestOnchain__IncorrectStakeSent(uint sentValue, uint requiredStake);
    error ForestOnchain__NoActiveGoal(string activityType);
    error ForestOnchain__GoalNotReached(uint numberOfTrees);
    error ForestOnchain__GoalDurationIsOver(uint endTime, uint currentTime);
    error ForestOnchain__TransferFailed();
    error ForestOnchain__InsufficientFunds();
    error ForestOnchain__CannotSendToZeroAddress();
    error ForestOnchain__SessionNotEndedYet(uint sessionEndTime);

    struct UserSession {
        string activityType;
        uint256 startTime;
        uint256 endTime;
        bool active;
        address owner;
    }

    struct UserGoal {
        string activityType;
        uint256 startTime;
        uint256 endTime;
        bool active;
        uint numberOfTrees;
        uint stakeAmount;
    }

    mapping(address => string[]) internal userActivityTypes;
    mapping(address => UserSession) internal currentUserSession;
    mapping(address => mapping(string => uint256)) internal numberOfTrees;
    mapping(address => bool) internal breakNeeded;
    mapping(address => mapping(string => UserGoal)) internal userGoals;
    address[] internal users;
    uint public cost_per_tree;
    address public immutable CONTRACT_OWNER;
    uint constant MAX_SESSION_DURATION = 60 minutes;
    uint constant MIN_SESSION_DURATION = 20 minutes;
    uint constant MIN_NUM_TREES_PER_GOAL = 1;

    event ActivityAdded(string indexed activityType);
    event SessionStarted(
        address indexed user,
        string indexed activityType,
        uint256 indexed startTime,
        uint256 endTime
    );
    event BreakTaken(address indexed user);
    event SessionEnded(address indexed user);
    event GoalStarted(
        address indexed user,
        string indexed activityType,
        uint indexed startTime,
        uint endTime,
        bool active,
        uint numOfTrees,
        uint stakeAmount
    );
    event GoalClaimed(
        address indexed user,
        string indexed activityType,
        uint stakeAmount
    );

    event EtherWithdrawn(address indexed to, uint indexed amount);
    event CostPerTreeChanged(uint costPerTree);

    modifier onlyOwner() {
        require(
            msg.sender == CONTRACT_OWNER,
            "Only owner can call this function"
        );
        _;
    }

    /**
     * @notice Initializes the contract with a cost per tree and sets the owner.
     * @param  _costPerTree The stake amount per tree in wei.
     */
    constructor(uint _costPerTree) {
        cost_per_tree = _costPerTree;
        CONTRACT_OWNER = msg.sender;
    }

    receive() external payable {}

    fallback() external payable {
        revert("Function does not exist");
    }

    /**
     * @notice Called by Chainlink Automation to check if any session has ended.
     * @dev Returns the first user with an ended active session.
     * @return upkeepNeeded True if at least one session needs to be ended.
     * @return performData  Encoded address of the user whose session ended.
     */
    function checkUpkeep(
        bytes calldata /* checkData */
    ) external view returns (bool upkeepNeeded, bytes memory performData) {
        uint256 numberUsers = users.length;
        if (numberUsers == 0) {
            return (false, bytes(""));
        }
        for (uint i = 0; i < numberUsers; i++) {
            address user = users[i];
            UserSession memory session = currentUserSession[user];
            if (session.active && block.timestamp >= session.endTime) {
                return (true, abi.encode(user));
            }
        }
        return (false, bytes(""));
    }

    /**
     * @notice Called by Chainlink Automation to end a finished focus session.
     * @param performData Encoded address of the user whose session should be ended.
     */
    function performUpkeep(bytes calldata performData) external {
        address user = abi.decode(performData, (address));
        endFocusSession(user);
    }

    /**
     * @notice Claims the staked amount for a completed and active goal.
     * @param _activityType The activity type of the goal to claim for.
     */
    function claimStake(string calldata _activityType) external {
        UserGoal storage goal = userGoals[msg.sender][_activityType];
        if (!goal.active) {
            revert ForestOnchain__NoActiveGoal(_activityType);
        }
        if (goal.numberOfTrees != 0) {
            revert ForestOnchain__GoalNotReached(goal.numberOfTrees);
        }
        if (goal.endTime < block.timestamp) {
            revert ForestOnchain__GoalDurationIsOver(
                goal.endTime,
                block.timestamp
            );
        }
        uint stakeAmount = goal.stakeAmount;
        delete userGoals[msg.sender][_activityType];
        (bool success, ) = payable(msg.sender).call{value: stakeAmount}("");
        if (!success) {
            revert ForestOnchain__TransferFailed();
        }
        emit GoalClaimed(msg.sender, _activityType, stakeAmount);
    }

    /**
     * @notice Withdraws ETH from the contract balance to a given address.
     * @dev Only callable by the contract owner.
     * @param _to The recipient address of the withdrawal.
     * @param _amount The amount of ETH to withdraw in wei.
     */
    function withdraw(address payable _to, uint256 _amount) external onlyOwner {
        if (_to == payable(address(0))) {
            revert ForestOnchain__CannotSendToZeroAddress();
        }
        if (_amount > address(this).balance) {
            revert ForestOnchain__InsufficientFunds();
        }
        (bool success, ) = _to.call{value: _amount}("");
        if (!success) {
            revert ForestOnchain__TransferFailed();
        }
        emit EtherWithdrawn(_to, _amount);
    }

    /**
     * @notice Checks if a user has already registered an activity type.
     * @param _user The address of the user.
     * @param _activityType The name of the activity type to check.
     * @return True if the activity exists for the user, false otherwise.
     */
    function checkActivityExists(
        address _user,
        string calldata _activityType
    ) public returns (bool) {
        string[] memory userActivities = userActivityTypes[_user];
        bytes32 targetActivityHash = keccak256(bytes(_activityType));
        for (uint i = 0; i < userActivities.length; i++) {
            if (keccak256(bytes(userActivities[i])) == targetActivityHash) {
                return true;
            }
        }
        return false;
    }

    /**
     * @notice Updates the global cost per tree used to calculate stakes.
     * @dev Only callable by the contract owner.
     * @param _costPerTree New cost per tree in wei.
     */
    function changeCostPerTree(uint _costPerTree) external onlyOwner {
        cost_per_tree = _costPerTree;
        emit CostPerTreeChanged(_costPerTree);
    }

    /**
     * @notice Starts a new focus session for the caller for a given activity.
     * @param _activityType The activity type to focus on.
     * @param _duration The session duration in seconds.
     */
    function startFocusSession(
        string calldata _activityType,
        uint256 _duration
    ) public {
        bool sessionActive = currentUserSession[msg.sender].active;
        if (sessionActive) {
            revert ForestOnchain__AnotherSessionOngoing(
                currentUserSession[msg.sender].activityType
            );
        }
        if (breakNeeded[msg.sender]) {
            revert ForestOnchain__BreakNeeded();
        }
        if (
            _duration < MIN_SESSION_DURATION || _duration > MAX_SESSION_DURATION
        ) {
            revert ForestOnchain__DurationOutOfRange(_duration);
        }
        bool activityExists = checkActivityExists(msg.sender, _activityType);
        if (!activityExists) {
            addActivityType(_activityType, msg.sender);
        }
        UserGoal storage goal = userGoals[msg.sender][_activityType];
        if (!goal.active) {
            revert ForestOnchain__NoActiveGoal(_activityType);
        }
        currentUserSession[msg.sender] = UserSession({
            activityType: _activityType,
            startTime: block.timestamp,
            endTime: block.timestamp + _duration,
            active: true,
            owner: msg.sender
        });
        users.push(msg.sender);
        emit SessionStarted(
            msg.sender,
            _activityType,
            currentUserSession[msg.sender].startTime,
            currentUserSession[msg.sender].endTime
        );
    }

    /**
     * @notice Ends a finished focus session for a given user and updates their goal and tree count.
     * @param _user The address of the user whose session should be ended.
     */
    function endFocusSession(address _user) public {
        bool sessionActive = currentUserSession[_user].active;
        string memory sessionActivityType = currentUserSession[_user]
            .activityType;
        if (!sessionActive) {
            revert ForestOnchain__NoOngoingSession(_user);
        }
        if (currentUserSession[_user].endTime > block.timestamp) {
            revert ForestOnchain__SessionNotEndedYet(
                currentUserSession[_user].endTime
            );
        } else {
            numberOfTrees[_user][sessionActivityType] += 1;
            UserGoal storage goal = userGoals[_user][sessionActivityType];
            goal.numberOfTrees -= 1;
            delete currentUserSession[_user];
            breakNeeded[_user] = true;
            emit SessionEnded(_user);
        }
    }

    /**
     * @notice Marks the required break as taken for the caller after a session.
     */
    function takeBreak() public {
        bool sessionActive = currentUserSession[msg.sender].active;
        if (sessionActive) {
            revert ForestOnchain__SessionOngoing(msg.sender);
        }
        if (!breakNeeded[msg.sender]) {
            revert ForestOnchain__BreakNotNeeded(msg.sender);
        }
        breakNeeded[msg.sender] = false;
        emit BreakTaken(msg.sender);
    }

    /**
     * @notice Starts a new goal with a stake for a given activity type.
     * @param _activityType The activity type associated with the goal.
     * @param _duration Total time window in seconds to complete the goal.
     * @param _numOfTrees Number of trees (sessions) required to meet the goal.
     */
    function startGoal(
        string calldata _activityType,
        uint _duration,
        uint _numOfTrees
    ) public payable {
        if (_duration < MAX_SESSION_DURATION) {
            revert ForestOnchain__GoalDurationShouldBeMoreThan60Minutes(
                _duration
            );
        }
        if (_numOfTrees < MIN_NUM_TREES_PER_GOAL) {
            revert ForestOnchain__EnterMoreThankMinNumOfTreesPerGoal(
                _numOfTrees
            );
        }
        bool goalExists = userGoals[msg.sender][_activityType].active;
        if (goalExists) {
            revert ForestOnchain__GoalAlreadyExists();
        } else {
            uint stakeAmount = getStakeAmount(_numOfTrees);
            if (msg.value != stakeAmount) {
                revert ForestOnchain__IncorrectStakeSent(
                    msg.value,
                    stakeAmount
                );
            }
            userGoals[msg.sender][_activityType].activityType = _activityType;
            userGoals[msg.sender][_activityType].startTime = block.timestamp;
            userGoals[msg.sender][_activityType].endTime =
                block.timestamp +
                _duration;
            userGoals[msg.sender][_activityType].active = true;
            userGoals[msg.sender][_activityType].numberOfTrees = _numOfTrees;
            userGoals[msg.sender][_activityType].stakeAmount = stakeAmount;
            emit GoalStarted(
                msg.sender,
                _activityType,
                block.timestamp,
                block.timestamp + _duration,
                true,
                _numOfTrees,
                stakeAmount
            );
        }
    }

    /**
     * @notice Adds a new activity type for a user.
     * @dev Internal helper used by other functions.
     * @param _activityType The activity type name to add.
     * @param _user The address of the user.
     */
    function addActivityType(
        string calldata _activityType,
        address _user
    ) internal {
        userActivityTypes[_user].push(_activityType);
        emit ActivityAdded(_activityType);
    }

    /* Getter Functions */
    function getUserActivityTypes(
        address _user
    ) external returns (string[] memory) {
        return userActivityTypes[_user];
    }

    function getCurrentUserSession(
        address _user
    ) external returns (UserSession memory) {
        return currentUserSession[_user];
    }

    function getNumberOfTrees(
        address _user,
        string calldata _activityType
    ) external returns (uint256) {
        return numberOfTrees[_user][_activityType];
    }

    function getBreakNeeded(address _user) external returns (bool) {
        return breakNeeded[_user];
    }

    function getUsers() external returns (address[] memory) {
        return users;
    }

    function getStakeAmount(uint _numOfTrees) public returns (uint) {
        return _numOfTrees * cost_per_tree;
    }

    function getGoal(
        address _user,
        string calldata _activityType
    ) public returns (uint) {
        return userGoals[_user][_activityType].numberOfTrees;
    }

    function getEndTime(
        address _user,
        string calldata _activityType
    ) public returns (uint) {
        return userGoals[_user][_activityType].endTime;
    }
}
