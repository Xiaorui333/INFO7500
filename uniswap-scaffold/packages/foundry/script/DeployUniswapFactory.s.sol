// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../contracts/core/UniswapV2Factory.sol";
import "../contracts/periphery/UniswapV2Router02.sol";
import "../contracts/periphery/test/TestERC20.sol";
import "../contracts/periphery/test/WETH9.sol";
import "../contracts/core/interfaces/IUniswapV2Pair.sol";

/**
 * @dev 在同一个脚本中：
 *      1) 用部署者(deployer)部署 Factory, Router, TestERC20
 *      2) 用 targetAccount(模拟用户)进行 approve, addLiquidity, removeLiquidity
 *      3) 测试 swap 功能
 */
contract DeployUniswapFactory is Script {
    // ========== "目标账号" (Anvil #2) ==========
    address constant TARGET_ACCOUNT = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC;

    // ========== 对应的私钥(换成你自己的) ==========
    // 一定要以 0x 开头，并且保证长度为 64 个十六进制字符
    uint256 constant TARGET_ACCOUNT_KEY =
    0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a;

    function run() external {
        /**
         * ---------------------------------------
         * (1) 由 "deployer" 部署合约
         *     在此示例中, deployer = 脚本默认账号
         * ---------------------------------------
         */
        vm.startBroadcast(); // 使用脚本默认配置(FOUNDARY_PRIVATE_KEY)或内置anvil[0]

        // 1.1 部署 Factory
        UniswapV2Factory factory = new UniswapV2Factory(msg.sender);
        console.log("Factory deployed at:", address(factory));

        // 1.2 部署 WETH
        WETH9 weth = new WETH9();
        console.log("WETH9 deployed at:", address(weth));

        // 1.3 部署 Router
        UniswapV2Router02 router = new UniswapV2Router02(
            address(factory),
            address(weth)
        );
        console.log("Router deployed at:", address(router));

        // 1.4 部署测试代币
        TestERC20 tokenA = new TestERC20("TokenA", "TKA", 18);
        tokenA.mint(TARGET_ACCOUNT, 10000 * 1e18);
        console.log("TokenA deployed at:", address(tokenA));

        TestERC20 tokenB = new TestERC20("TokenB", "TKB", 18);
        tokenB.mint(TARGET_ACCOUNT, 10000 * 1e18);
        console.log("TokenB deployed at:", address(tokenB));

        // 1.5 创建 Pair
        address pairAddress = factory.createPair(address(tokenA), address(tokenB));
        console.log("Pair deployed at:", pairAddress);

        vm.stopBroadcast(); // 部署者操作结束

        /**
         * ---------------------------------------
         * (2) 以 "targetAccount(用户)" 身份做流动性操作
         * ---------------------------------------
         */
        vm.startBroadcast(TARGET_ACCOUNT_KEY);

        // 2.1 Approve 让 router 拉取 tokenA / tokenB
        tokenA.approve(address(router), type(uint256).max);
        tokenB.approve(address(router), type(uint256).max);

        // 2.2 addLiquidity
        uint amountADesired = 5000 * 1e18;
        uint amountBDesired = 5000 * 1e18;

        (uint amountAUsed, uint amountBUsed, uint liquidity) =
                            router.addLiquidity(
                address(tokenA),
                address(tokenB),
                amountADesired,
                amountBDesired,
                (amountADesired * 90) / 100,
                (amountBDesired * 90) / 100,
                TARGET_ACCOUNT,
                block.timestamp + 1800
            );
        console.log("AddLiquidity => amountAUsed:", amountAUsed);
        console.log("AddLiquidity => amountBUsed:", amountBUsed);
        console.log("AddLiquidity => liquidity:", liquidity);

        // 2.3 验证 LP 余额
        uint256 lpBalance = IUniswapV2Pair(pairAddress).balanceOf(TARGET_ACCOUNT);
        console.log("LP balance of targetAccount:", lpBalance);

        // 2.4 removeLiquidity
        // 先把 LP approve 给 router
        IUniswapV2Pair(pairAddress).approve(address(router), lpBalance);

        (uint removedA, uint removedB) =
                            router.removeLiquidity(
                address(tokenA),
                address(tokenB),
                lpBalance,
                (amountAUsed * 95) / 100,
                (amountBUsed * 95) / 100,
                TARGET_ACCOUNT,
                block.timestamp + 1800
            );
        console.log("RemoveLiquidity => removedA:", removedA);
        console.log("RemoveLiquidity => removedB:", removedB);

        /**
         * ---------------------------------------
         * (3) 测试 swap 功能
         * ---------------------------------------
         */
        // 3.1 重新添加流动性
        (amountAUsed, amountBUsed, liquidity) = router.addLiquidity(
            address(tokenA),
            address(tokenB),
            amountADesired,
            amountBDesired,
            (amountADesired * 90) / 100,
            (amountBDesired * 90) / 100,
            TARGET_ACCOUNT,
            block.timestamp + 1800
        );
        console.log("Re-add liquidity => amountAUsed:", amountAUsed);
        console.log("Re-add liquidity => amountBUsed:", amountBUsed);
        console.log("Re-add liquidity => liquidity:", liquidity);

        // 3.2 测试 swapExactTokensForTokens (TokenA -> TokenB)
        console.log("\nTest swapExactTokensForTokens:");
        uint256 tokenABalanceBefore = tokenA.balanceOf(TARGET_ACCOUNT);
        uint256 tokenBBalanceBefore = tokenB.balanceOf(TARGET_ACCOUNT);
        console.log("Before swap => TokenA balance:", tokenABalanceBefore);
        console.log("Before swap => TokenB balance:", tokenBBalanceBefore);

        uint256 amountIn = 100 * 1e18; // 100 TokenA
        uint256 amountOutMin = 0; // 不设置最小输出量
        address[] memory path = new address[](2);
        path[0] = address(tokenA);
        path[1] = address(tokenB);

        router.swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            TARGET_ACCOUNT,
            block.timestamp + 1800
        );

        uint256 tokenABalanceAfter = tokenA.balanceOf(TARGET_ACCOUNT);
        uint256 tokenBBalanceAfter = tokenB.balanceOf(TARGET_ACCOUNT);
        console.log("After swap => TokenA balance:", tokenABalanceAfter);
        console.log("After swap => TokenB balance:", tokenBBalanceAfter);
        console.log("TokenA spent:", tokenABalanceBefore - tokenABalanceAfter);
        console.log("TokenB received:", tokenBBalanceAfter - tokenBBalanceBefore);

        // 3.3 测试 swapTokensForExactTokens (TokenB -> TokenA)
        console.log("\nTest swapTokensForExactTokens:");
        tokenABalanceBefore = tokenA.balanceOf(TARGET_ACCOUNT);
        tokenBBalanceBefore = tokenB.balanceOf(TARGET_ACCOUNT);
        console.log("Before swap => TokenA balance:", tokenABalanceBefore);
        console.log("Before swap => TokenB balance:", tokenBBalanceBefore);

        uint256 amountOut = 50 * 1e18; // 想要获得 50 TokenA
        uint256 amountInMax = 100 * 1e18; // 最多花费 100 TokenB
        path[0] = address(tokenB);
        path[1] = address(tokenA);

        router.swapTokensForExactTokens(
            amountOut,
            amountInMax,
            path,
            TARGET_ACCOUNT,
            block.timestamp + 1800
        );

        tokenABalanceAfter = tokenA.balanceOf(TARGET_ACCOUNT);
        tokenBBalanceAfter = tokenB.balanceOf(TARGET_ACCOUNT);
        console.log("After swap => TokenA balance:", tokenABalanceAfter);
        console.log("After swap => TokenB balance:", tokenBBalanceAfter);
        console.log("TokenA received:", tokenABalanceAfter - tokenABalanceBefore);
        console.log("TokenB spent:", tokenBBalanceBefore - tokenBBalanceAfter);

        vm.stopBroadcast(); // 用户操作结束
    }
}
