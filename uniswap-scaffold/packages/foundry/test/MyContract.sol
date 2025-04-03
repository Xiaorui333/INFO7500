// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {UniswapV2Pair} from "contracts/core/UniswapV2Pair.sol";  // Adjust path as needed

contract MyContract {
    bytes32 public computedHash;

    constructor() {
        computedHash = keccak256(type(UniswapV2Pair).creationCode);
    }
}
