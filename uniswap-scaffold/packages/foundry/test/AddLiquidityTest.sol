// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "forge-std/console.sol";

import "../contracts/periphery/test/TestERC20.sol";
import "../contracts/core/UniswapV2Factory.sol";
import "../contracts/periphery/test/WETH9.sol";
import "../contracts/periphery/UniswapV2Router02.sol";


contract AddLiquidityTest is Test {

    UniswapV2Router02 public router;
    address public tokenA;
    address public tokenB;
    address public sender;

    function setUp() public {
        address deployer = address(this);
        sender = address(this);
        UniswapV2Factory factory = new UniswapV2Factory(deployer);

        WETH9 weth = new WETH9();
        router = new UniswapV2Router02(address(factory), address(weth));

        // Deploy test tokens.
        tokenA = address(new TestERC20("TokenA", "TKA", 18));
        tokenB = address(new TestERC20("TokenB", "TKB", 18));

        TestERC20(tokenA).mint(sender, 10000);
        TestERC20(tokenB).mint(sender, 10000);


    address pair = factory.createPair(address(tokenA), address(tokenB));
        factory.setFeeToSetter(address(0x1234));
    }

    function testAddLiquidity() public {

        /*

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline*/

        uint256 amountA = 5000;
        uint256 amountB = 5000;

        vm.prank(sender);
        TestERC20(tokenA).approve(address(router), amountA);

        vm.prank(sender);
        TestERC20(tokenB).approve(address(router), amountB);

        vm.prank(sender);
        vm.warp(1);
        router.addLiquidity(tokenA, tokenB, amountA, amountB, 0, 0, sender, 2);

    }
}
