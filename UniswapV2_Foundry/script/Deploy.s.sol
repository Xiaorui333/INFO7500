// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";

// Import your contracts
import {UniswapV2Factory} from "src/core/UniswapV2Factory.sol";
import {UniswapV2Router02} from "src/periphery/UniswapV2Router02.sol";
import {TestERC20} from "test/TestERC20.sol";
import {WETH9} from "src/periphery/test/WETH9.sol";

contract DeployContracts is Script {
    function run() external {
        // Begin broadcasting transactions to the network
        vm.startBroadcast();

        // Deploy WETH9 contract (used for wrapping ETH)
        WETH9 weth = new WETH9();
        
        // Deploy UniswapV2Factory first; usually, the feeToSetter is set to msg.sender
        UniswapV2Factory factory = new UniswapV2Factory(msg.sender);

        // Deploy two TestERC20 tokens (for example, Token A and Token B)
        TestERC20 tokenA = new TestERC20("Token A", "TKA", 18);
        TestERC20 tokenB = new TestERC20("Token B", "TKB", 18);

        // Now, create a pair using the factory.
        // Pass the token addresses (not the contract instances).
        address pair = factory.createPair(address(tokenA), address(tokenB));

        // Deploy UniswapV2Router02 with the factory and WETH addresses
        UniswapV2Router02 router = new UniswapV2Router02(address(factory), address(weth));
        
        vm.stopBroadcast();

        // Log the deployed contract addresses
        console.log("WETH9 deployed at:", address(weth));
        console.log("TestERC20 Token A deployed at:", address(tokenA));
        console.log("TestERC20 Token B deployed at:", address(tokenB));
        console.log("UniswapV2Factory deployed at:", address(factory));
        console.log("Pair Address:", pair);
        console.log("UniswapV2Router02 deployed at:", address(router));
    }
}
