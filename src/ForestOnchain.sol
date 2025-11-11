// SPDX-License-Identifier: MIT
// TODO:
// 1. Change vars to internal and create getter functions
// 2. Add tree types
pragma solidity ^0.8.13;

import {AutomationCompatibleInterface} from "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

contract ForestOnchain {
    error ForestOnchain__AddAnActivityType();
    error ForestOnchain_AnotherSessionOngoing(string currentSession);
    error ForestOnchain_NoOngoingSession(address user);
    error ForestOnchain_BreakNeeded();

    mapping(address => string[]) public userActivityTypes;
    mapping(address => UserSession) public currentUserSession;
    mapping(address => uint256) public numberOfTrees;
    mapping(address => bool) public breakNeeded;
    address[] public users;
    mapping(address => uint256) public activeUserIdx;

    event ActivityAdded(string indexed activityType);
    event SessionStarted(
        address indexed user,
        string indexed activityType,
        uint256 startTime,
        uint256 endTime
    );

    struct UserSession {
        string activityType;
        uint256 startTime;
        uint256 endTime;
        bool active;
    }

    function addActivityType(string calldata _activityType) public {
        userActivityTypes[msg.sender].push(_activityType);
        emit ActivityAdded(_activityType);
    }

    function startFocusSession(
        string calldata _activityType,
        uint256 _duration
    ) public {
        uint activitiesLength = userActivityTypes[msg.sender].length;
        if (activitiesLength == 0) {
            revert ForestOnchain__AddAnActivityType();
        }
        bool sessionActive = currentUserSession[msg.sender].active;
        if (sessionActive) {
            revert ForestOnchain_AnotherSessionOngoing(
                currentUserSession[msg.sender].activityType
            );
        }
        if (breakNeeded[msg.sender]) {
            revert ForestOnchain_BreakNeeded();
        }
        currentUserSession[msg.sender] = UserSession({
            activityType: _activityType,
            startTime: block.timestamp,
            endTime: block.timestamp + _duration,
            active: true
        });
        emit SessionStarted(
            msg.sender,
            _activityType,
            currentUserSession[msg.sender].startTime,
            currentUserSession[msg.sender].endTime
        );
    }

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

    function performUpkeep(bytes calldata performData) external {
        address user = abi.decode(performData, (address));
        endFocusSession(user);
    }

    function endFocusSession(address _user) public {
        bool sessionActive = currentUserSession[_user].active;
        if (!sessionActive) {
            revert ForestOnchain_NoOngoingSession(_user);
        }
        if (currentUserSession[_user].endTime > block.timestamp) {
            delete currentUserSession[_user];
        } else {
            numberOfTrees[_user] += 1;
            delete currentUserSession[_user];
            breakNeeded[_user] = true;
        }
    }
}
