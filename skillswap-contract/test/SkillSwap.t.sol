// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/SkillSwap.sol";

contract SkillSwapTest is Test {
    SkillSwap public skillSwap;

    function setUp() public {
        skillSwap = new SkillSwap();
    }

    function testRegisterUser() public {
        skillSwap.registerUser("Alice", "Solidity", "React");
        (uint id, address wallet, , , ) = skillSwap.users(1);
        assertEq(id, 1);
        assertEq(wallet, address(this));
    }

    function testMatchUsers() public {
        skillSwap.registerUser("Alice", "Solidity", "React");
        vm.prank(address(0xBEEF));
        skillSwap.registerUser("Bob", "React", "Solidity");
        skillSwap.matchUsers(1, 2);
        (, uint user1Id, uint user2Id, ) = skillSwap.matches(1);
        assertEq(user1Id, 1);
        assertEq(user2Id, 2);
    }
}
