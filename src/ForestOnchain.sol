// SPDX-License-Identifier: MIT
// TODO:
// 1. Change vars to internal and create getter functions
// 2. Add tree types
pragma solidity ^0.8.13;

contract ForestOnchain {
    error ForestOnchain__AddAnActivityType();
    error ForestOnchain_AnotherSessionOngoing(string currentSession);
    error ForestOnchain_NoOngoingSession(msg.sender);

    mapping(address => string[]) public userActivityTypes;
    mapping(address => UserSession) public currentUserSession;
    mapping(address => uint256) public numberOfTrees;
    mapping(address => bool) public breakNeeded;

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
        // ADD BREAK CHECK
        currentUserSession[msg.sender] = UserSession({
            activityType: _activityType,
            startTime: block.timestamp,
            endTime: block.timestamp + _duration,
            active: true
        });
        emit SessionStarted(
            msg.sender,
            _activityType,
            currentUserSession.startTime,
            currentUserSession.endTime
        );
    }

    function endFocusSession() public {
        bool sessionActive = currentUserSession[msg.sender].active;
        if (!sessionActive) {
            revert ForestOnchain_NoOngoingSession(msg.sender);
        }
        if (currentUserSession[msg.sender].endTime > block.timestamp) {
            delete currentCampaign;
        } else {
            numberOfTrees += 1;
            delete currentCampaign;
            breakNeeded[msg.sender] = true;
        }
    }
}
