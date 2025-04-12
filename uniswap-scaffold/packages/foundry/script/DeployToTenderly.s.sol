pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../contracts/core/UniswapV2Factory.sol";
import "../contracts/periphery/UniswapV2Router02.sol";
import "../contracts/periphery/test/TestERC20.sol";
import "../contracts/periphery/test/WETH9.sol";
import "../contracts/core/interfaces/IUniswapV2Pair.sol";


contract DeployToTenderly is Script {
    function run() external {
        vm.startBroadcast();

        // 1. 部署 Factory
        UniswapV2Factory factory = new UniswapV2Factory(msg.sender);
        console.log("Factory deployed at:", address(factory));

        // 2. 部署 WETH
        WETH9 weth = new WETH9();
        console.log("WETH9 deployed at:", address(weth));

        // 3. 部署 Router
        UniswapV2Router02 router = new UniswapV2Router02(
            address(factory),
            address(weth)
        );
        console.log("Router deployed at:", address(router));

        // 4. 部署测试代币
        TestERC20 tokenA = new TestERC20("TokenA", "TKA", 18);
        console.log("TokenA deployed at:", address(tokenA));

        TestERC20 tokenB = new TestERC20("TokenB", "TKB", 18);
        console.log("TokenB deployed at:", address(tokenB));

        // 5. 创建 Pair
        address pairAddress = factory.createPair(address(tokenA), address(tokenB));
        console.log("Pair deployed at:", pairAddress);

        vm.stopBroadcast();
    }
}
