// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "./MyContract.sol";

contract MyContractTest is Test {
    function testComputedHash() public {
        MyContract myContract = new MyContract();
        bytes32 hash = myContract.computedHash();
        console.logBytes32(hash);
        
        // You can also assert something if needed
        assertTrue(hash != bytes32(0), "Hash should not be zero");
    }
}
