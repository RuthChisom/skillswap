// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title SkillSwap - decentralized peer-mentorship registry & matcher
/// @author SkillSwap
/// @notice Register once, update allowed fields, find reciprocal skill matches, onchain proof via events
contract SkillSwap {
    uint256 public constant MAX_USERS = 10_000;

    uint256 public userCount;

    struct Socials {
        string twitter;
        string farcaster;
        string email;
    }

    struct User {
        uint256 id;
        address wallet;      // immutable after registration
        string name;         // immutable after registration
        bytes32 skillToTeach; // hashed skill
        bytes32 skillToLearn; // hashed skill
        string bio;
        Socials socials;
        uint256 registeredAt;
        uint256 updatedAt;
    }

    struct MatchRecord {
        uint256 a;
        uint256 b;
        uint256 timestamp;
    }

    // userId => User
    mapping(uint256 => User) private users;

    // wallet => userId (0 means not registered)
    mapping(address => uint256) private walletToUserId;

    // registration flag by wallet
    mapping(address => bool) public hasRegistered;

    // userId => list of matched userIds
    mapping(uint256 => uint256[]) private userMatches;

    // canonical pair hash => exists (to avoid duplicate records)
    mapping(bytes32 => bool) private matchExists;

    // global recorded matches
    MatchRecord[] private matches;

    // EVENTS (include timestamps for BaseScan / onchain proof)
    event UserRegistered(
        uint256 indexed userId,
        address indexed wallet,
        string name,
        bytes32 skillToTeach,
        bytes32 skillToLearn,
        uint256 timestamp
    );

    event UserUpdated(
        uint256 indexed userId,
        address indexed wallet,
        bytes32 newSkillToTeach,
        bytes32 newSkillToLearn,
        uint256 timestamp
    );

    event UsersMatched(
        uint256 indexed userId,
        uint256[] matchedIds,
        address indexed wallet,
        uint256 timestamp
    );

    /// --------------------
    /// Modifiers & Helpers
    /// --------------------

    modifier onlyRegistered() {
        require(hasRegistered[msg.sender], "Not registered");
        _;
    }

    modifier onlyUserOwner(uint256 _userId) {
        require(_userId > 0 && _userId <= userCount, "Invalid userId");
        require(users[_userId].wallet == msg.sender, "Not user owner");
        _;
    }

    /// @notice Convert a UTF-8 skill string to a bytes32 hash for storage/comparison
    /// @dev Use keccak256 to produce bytes32 (collision extremely unlikely for purpose)
    function _hashSkill(string memory _skill) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(_skill));
    }

    /// @notice Check if at least one social contact is provided
    function _hasAnySocial(Socials memory s) internal pure returns (bool) {
        return (bytes(s.twitter).length > 0 || bytes(s.farcaster).length > 0 || bytes(s.email).length > 0);
    }

    /// @notice Create canonical pair key (smallerId first) to prevent duplicate match records
    function _pairKey(uint256 a, uint256 b) internal pure returns (bytes32) {
        if (a < b) {
            return keccak256(abi.encodePacked(a, b));
        } else {
            return keccak256(abi.encodePacked(b, a));
        }
    }

    /// @notice Internal: record a match if not already recorded
    function _recordMatch(uint256 a, uint256 b) internal {
        if (a == b) return; // no self match
        bytes32 key = _pairKey(a, b);
        if (matchExists[key]) return;

        matchExists[key] = true;

        // store canonical with smaller id first
        uint256 first = a < b ? a : b;
        uint256 second = a < b ? b : a;

        matches.push(MatchRecord({
            a: first,
            b: second,
            timestamp: block.timestamp
        }));

        // push to each user's match list (allow duplicates avoided above)
        userMatches[a].push(b);
        userMatches[b].push(a);
    }

    /// --------------------
    /// Registration
    /// --------------------

    /// @notice Register a new user (one per wallet)
    /// @param _name display name (immutable)
    /// @param _skillToTeach skill the user will teach (string -> hashed)
    /// @param _skillToLearn skill the user wants to learn (string -> hashed)
    /// @param _twitter optional twitter handle (empty string if none)
    /// @param _farcaster optional farcaster handle (empty string if none)
    /// @param _email optional email (empty string if none)
    function register(
        string calldata _name,
        string calldata _skillToTeach,
        string calldata _skillToLearn,
        string calldata _twitter,
        string calldata _farcaster,
        string calldata _email
    ) external {
        require(!hasRegistered[msg.sender], "Already registered");
        require(bytes(_name).length > 0, "Name required");
        require(bytes(_skillToTeach).length > 0, "skillToTeach required");
        require(bytes(_skillToLearn).length > 0, "skillToLearn required");

        require(userCount < MAX_USERS, "Max users reached");

        bytes32 teachHash = _hashSkill(_skillToTeach);
        bytes32 learnHash = _hashSkill(_skillToLearn);

        require(teachHash != learnHash, "skillToTeach must differ from skillToLearn");

        Socials memory s = Socials({twitter: _twitter, farcaster: _farcaster, email: _email});
        require(_hasAnySocial(s), "At least one social contact required (twitter, farcaster, or email)");

        userCount += 1;
        uint256 newId = userCount;

        users[newId] = User({
            id: newId,
            wallet: msg.sender,
            name: _name,
            skillToTeach: teachHash,
            skillToLearn: learnHash,
            bio: "",
            socials: s,
            registeredAt: block.timestamp,
            updatedAt: block.timestamp
        });

        walletToUserId[msg.sender] = newId;
        hasRegistered[msg.sender] = true;

        emit UserRegistered(newId, msg.sender, _name, teachHash, learnHash, block.timestamp);
    }

    /// --------------------
    /// Profile Updates
    /// --------------------

    /// @notice Update mutable profile fields. Name and wallet are immutable.
    /// @param _userId id of the caller's user entry
    /// @param _skillToTeach new skill to teach (empty string to keep unchanged)
    /// @param _skillToLearn new skill to learn (empty string to keep unchanged)
    /// @param _bio new bio (empty string allowed)
    /// @param _twitter updated twitter (empty string to clear)
    /// @param _farcaster updated farcaster (empty string to clear)
    /// @param _email updated email (empty string to clear)
    function updateProfile(
        uint256 _userId,
        string calldata _skillToTeach,
        string calldata _skillToLearn,
        string calldata _bio,
        string calldata _twitter,
        string calldata _farcaster,
        string calldata _email
    ) external onlyUserOwner(_userId) {
        User storage u = users[_userId];

        bytes32 newTeach = u.skillToTeach;
        bytes32 newLearn = u.skillToLearn;

        if (bytes(_skillToTeach).length > 0) {
            newTeach = _hashSkill(_skillToTeach);
        }
        if (bytes(_skillToLearn).length > 0) {
            newLearn = _hashSkill(_skillToLearn);
        }

        require(newTeach != newLearn, "skillToTeach must differ from skillToLearn");

        // apply updates
        u.skillToTeach = newTeach;
        u.skillToLearn = newLearn;
        u.bio = _bio;

        u.socials.twitter = _twitter;
        u.socials.farcaster = _farcaster;
        u.socials.email = _email;

        u.updatedAt = block.timestamp;

        emit UserUpdated(_userId, u.wallet, newTeach, newLearn, block.timestamp);
    }

    /// --------------------
    /// Matching Logic
    /// --------------------

    /// @notice Find reciprocal matches for given userId: a user's skillToTeach must equal other's skillToLearn AND user's skillToLearn must equal other's skillToTeach
    /// @dev Single-loop over registered users (bounded by MAX_USERS and current userCount)
    /// @param _userId id to find matches for
    function findMatches(uint256 _userId) external {
        require(_userId > 0 && _userId <= userCount, "Invalid userId");
        User storage u = users[_userId];

        bytes32 myTeach = u.skillToTeach;
        bytes32 myLearn = u.skillToLearn;

        uint256 localCount = userCount;
        if (localCount > MAX_USERS) localCount = MAX_USERS; // safety bound

        // collect matches for emitting (memory array)
        uint256[] memory tempMatches = new uint256[](localCount);
        uint256 found = 0;

        for (uint256 i = 1; i <= localCount; ++i) {
            if (i == _userId) continue;

            User storage other = users[i];

            // quick check: reciprocal skill swap
            if (other.skillToTeach == myLearn && other.skillToLearn == myTeach) {
                // record canonical match if not exists
                _recordMatch(_userId, i);
                tempMatches[found] = i;
                found += 1;
            }
        }

        // prepare final array trimmed to found
        uint256[] memory matchedIds = new uint256[](found);
        for (uint256 k = 0; k < found; ++k) {
            matchedIds[k] = tempMatches[k];
        }

        emit UsersMatched(_userId, matchedIds, u.wallet, block.timestamp);
    }

    /// --------------------
    /// Getters & Views
    /// --------------------

    /// @notice Return a user by wallet address (or id 0 if not registered)
    /// @param _wallet wallet address to lookup
    function getUserByWallet(address _wallet) external view returns (User memory) {
        uint256 id = walletToUserId[_wallet];
        require(id != 0, "User not found for wallet");
        return users[id];
    }

    /// @notice Return a user by id
    /// @param _userId id of the user
    function getUserById(uint256 _userId) external view returns (User memory) {
        require(_userId > 0 && _userId <= userCount, "Invalid userId");
        return users[_userId];
    }

    /// @notice Return all registered users (capped by MAX_USERS)
    function getAllUsers() external view returns (User[] memory) {
        uint256 localCount = userCount;
        if (localCount > MAX_USERS) localCount = MAX_USERS;

        User[] memory list = new User[](localCount);
        for (uint256 i = 0; i < localCount; ++i) {
            list[i] = users[i + 1];
        }
        return list;
    }

    /// @notice Return all recorded global matches (pairs)
    function getAllMatches() external view returns (MatchRecord[] memory) {
        return matches;
    }

    /// @notice Return matches for a single user
    /// @param _userId id to query
    function getUserMatches(uint256 _userId) external view returns (uint256[] memory) {
        require(_userId > 0 && _userId <= userCount, "Invalid userId");
        return userMatches[_userId];
    }

    /// @notice Helper to convert a skill string to the onchain stored bytes32 hash
    function skillToHash(string calldata _skill) external pure returns (bytes32) {
        require(bytes(_skill).length > 0, "Empty skill");
        return _hashSkill(_skill);
    }

    /// @notice Get user id for the caller (0 if not registered)
    function myUserId() external view returns (uint256) {
        return walletToUserId[msg.sender];
    }
}
