// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title SkillSwap - Onchain Peer Mentorship Matching
/// @notice Simple contract to register skills and find matches on Base

contract SkillSwap {
    struct User {
        uint256 id;
        address wallet;
        string name;
        string skillToTeach;
        string skillToLearn;
    }

    struct Match {
        uint256 matchId;
        uint256 user1Id;
        uint256 user2Id;
        uint256 timestamp;
    }

    uint256 public userCount;
    uint256 public matchCount;

    mapping(uint256 => User) public users;
    mapping(uint256 => Match) public matches;
    mapping(address => bool) public registered;

    event UserRegistered(uint256 id, address wallet, string name, string skillToTeach, string skillToLearn);
    event UsersMatched(uint256 matchId, uint256 user1Id, uint256 user2Id);

    /// @notice Register a new user
    function registerUser(string calldata _name, string calldata _skillToTeach, string calldata _skillToLearn) external {
        require(!registered[msg.sender], "User already registered");

        userCount++;
        users[userCount] = User(userCount, msg.sender, _name, _skillToTeach, _skillToLearn);
        registered[msg.sender] = true;

        emit UserRegistered(userCount, msg.sender, _name, _skillToTeach, _skillToLearn);
    }

    /// @notice Retrieve all users
    function getAllUsers() external view returns (User[] memory) {
        User[] memory allUsers = new User[](userCount);
        for (uint256 i = 1; i <= userCount; i++) {
            allUsers[i - 1] = users[i];
        }
        return allUsers;
    }

    /// @notice Match two users (must be called by one of the participants)
    function matchUsers(uint256 _user1Id, uint256 _user2Id) external {
        require(_user1Id != _user2Id, "Cannot match yourself");
        require(users[_user1Id].wallet != address(0) && users[_user2Id].wallet != address(0), "Invalid user ID");
        require(msg.sender == users[_user1Id].wallet || msg.sender == users[_user2Id].wallet, "Only participants can match");

        matchCount++;
        matches[matchCount] = Match(matchCount, _user1Id, _user2Id, block.timestamp);

        emit UsersMatched(matchCount, _user1Id, _user2Id);
    }

    /// @notice Retrieve all matches
    function getAllMatches() external view returns (Match[] memory) {
        Match[] memory allMatches = new Match[](matchCount);
        for (uint256 i = 1; i <= matchCount; i++) {
            allMatches[i - 1] = matches[i];
        }
        return allMatches;
    }
}
