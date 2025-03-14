// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Test.sol";

import {UniswapV2Factory}       from "src/core/UniswapV2Factory.sol";
import {UniswapV2Pair}          from "src/core/UniswapV2Pair.sol";
import {UniswapV2Router02}      from "src/periphery/UniswapV2Router02.sol";
import {TestERC20}              from "./TestERC20.sol";
import {WETH9}                  from "src/periphery/test/WETH9.sol";
import {IERC20}                 from "src/core/interfaces/IERC20.sol";

interface IUniswapV2ERC20 {
    function permit(
        address owner,
        address spender,
        uint value,
        uint deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
    function nonces(address owner) external view returns (uint);
    function DOMAIN_SEPARATOR() external view returns (bytes32);
    function PERMIT_TYPEHASH() external pure returns (bytes32);
}

/// @dev Full coverage test suite for Uniswap V2 contracts.
contract UniswapV2FullCoverageTest is Test {
    // Core contracts
    UniswapV2Factory  public factory;
    UniswapV2Router02 public router;
    WETH9             public weth;
    TestERC20         public tokenA;
    TestERC20         public tokenB;

    // Pair for tokenA-tokenB (for token-token liquidity tests)
    UniswapV2Pair public pair;
    address       public pairAddress;

    // Test addresses
    address public alice = address(0x1111);
    address public bob   = address(0x2222);
    address public carol = address(0x3333);
    address public feeToSetterEOA;

    // ========================================================
    // = Setup
    // ========================================================
    function setUp() public {
        vm.warp(1000); // avoid deadline issues

        // Provide ample ETH to test addresses.
        vm.deal(alice, 5_000_000 ether);
        vm.deal(bob,   5_000_000 ether);
        vm.deal(carol, 5_000_000 ether);

        // Deploy factory with feeToSetterEOA.
        feeToSetterEOA = makeAddr("feeToSetter");
        factory = new UniswapV2Factory(feeToSetterEOA);

        // Deploy WETH and Router.
        weth = new WETH9();
        router = new UniswapV2Router02(address(factory), address(weth));

        // Deploy test tokens.
        tokenA = new TestERC20("TokenA", "TKA", 18);
        tokenB = new TestERC20("TokenB", "TKB", 18);

        // Mint tokens to alice, bob, carol, and this contract.
        tokenA.mint(alice, 1_000_000 ether);
        tokenB.mint(alice, 1_000_000 ether);
        tokenA.mint(bob,   1_000_000 ether);
        tokenB.mint(bob,   1_000_000 ether);
        tokenA.mint(carol, 1_000_000 ether);
        tokenB.mint(carol, 1_000_000 ether);
        tokenA.mint(address(this), 100_000 ether);
        tokenB.mint(address(this), 100_000 ether);

        // Create tokenA-tokenB pair (for token-token liquidity tests).
        vm.startPrank(feeToSetterEOA);
        pairAddress = factory.createPair(address(tokenA), address(tokenB));
        vm.stopPrank();
        pair = UniswapV2Pair(pairAddress);

        // Fee configuration calls.
        vm.prank(feeToSetterEOA);
        factory.setFeeToSetter(address(0x1234));
        vm.prank(address(0x1234));
        factory.setFeeTo(address(0x9999));
        vm.prank(address(0x1234));
        factory.setFeeToSetter(address(this));
        vm.prank(address(this));
        factory.setFeeTo(address(0));

        // Approve router from alice.
        vm.startPrank(alice);
        tokenA.approve(address(router), type(uint).max);
        tokenB.approve(address(router), type(uint).max);
        vm.stopPrank();
    }

    // ========================================================
    // = Factory Tests
    // ========================================================
    function testAllPairsList() public {
        assertEq(factory.allPairsLength(), 1, "Factory should have 1 pair");
        assertEq(factory.allPairs(0), pairAddress, "allPairs(0) should equal pairAddress");
    }

    // ========================================================
    // = Pair Tests: mint, burn, skim, sync
    // ========================================================
    function testPairBurnSkimSync() public {
        // To avoid "INSUFFICIENT_LIQUIDITY_BURNED" we transfer very large amounts.
        vm.prank(alice);
        tokenA.transfer(address(pair), 100000 ether);
        vm.prank(alice);
        tokenB.transfer(address(pair), 100000 ether);

        // Mint LP tokens.
        vm.prank(alice);
        pair.mint(alice);
        uint lpBal = pair.balanceOf(alice);
        assertGt(lpBal, 0, "Mint should create LP tokens");

        // Burn only half of LP tokens so that burn returns nonzero amounts.
        vm.prank(alice);
        IERC20(address(pair)).transfer(address(pair), lpBal / 2);
        vm.prank(alice);
        (uint amount0, uint amount1) = pair.burn(alice);
        assertTrue(amount0 > 0 && amount1 > 0, "Burn returns nonzero amounts");

        // Test skim: transfer extra tokenA to the Pair and skim them to bob.
        vm.prank(alice);
        tokenA.transfer(address(pair), 10 ether);
        uint balBefore = tokenA.balanceOf(bob);
        vm.prank(alice);
        pair.skim(bob);
        uint balAfter = tokenA.balanceOf(bob);
        assertTrue(balAfter > balBefore, "Skim should transfer extra tokens");

        // Test sync: simply call sync.
        vm.prank(alice);
        pair.sync();
    }

    // ========================================================
    // = Router Library Function Tests: quote, getAmountOut, getAmountIn, getAmountsOut, getAmountsIn
    // ========================================================
    function testRouterQuoteGetAmounts() public {
        // Add liquidity to token-token pair with 3000 ether each so reserves are nonzero.
        vm.startPrank(alice);
        router.addLiquidity(
            address(tokenA),
            address(tokenB),
            3000 ether,
            3000 ether,
            0,
            0,
            alice,
            block.timestamp + 100
        );
        vm.stopPrank();

        uint quoteResult = router.quote(2000, 10000, 20000);
        assertEq(quoteResult, (2000 * 20000) / 10000, "Quote result incorrect");

        uint amountOut = router.getAmountOut(100, 1000, 2000);
        assertTrue(amountOut > 0, "getAmountOut should be > 0");

        uint amountIn = router.getAmountIn(100, 1000, 2000);
        assertTrue(amountIn > 0, "getAmountIn should be > 0");

        address[] memory path = new address[](2);
        path[0] = address(tokenA);
        path[1] = address(tokenB);
        // Use a moderate input amount.
        uint[] memory amountsOut = router.getAmountsOut(10 ether, path);
        assertEq(amountsOut.length, 2, "getAmountsOut: path length mismatch");
        assertTrue(amountsOut[1] > 0, "getAmountsOut returns zero");

        uint[] memory amountsIn = router.getAmountsIn(1 ether, path);
        assertEq(amountsIn.length, 2, "getAmountsIn: path length mismatch");
        assertTrue(amountsIn[0] > 0, "getAmountsIn returns zero");
    }

    // ========================================================
    // = Router Liquidity Tests (Token-Token)
    // ========================================================
    function testAddAndRemoveLiquidityTokenToken() public {
        vm.startPrank(alice);
        ( , , uint liq) = router.addLiquidity(
            address(tokenA),
            address(tokenB),
            2000 ether,
            2000 ether,
            0,
            0,
            alice,
            block.timestamp + 100
        );
        assertGt(liq, 0, "LP tokens should be minted");
        IERC20(pairAddress).approve(address(router), liq);
        (uint outA, uint outB) = router.removeLiquidity(
            address(tokenA),
            address(tokenB),
            liq / 2,
            0,
            0,
            alice,
            block.timestamp + 100
        );
        assertTrue(outA > 0 && outB > 0, "Remove liquidity returns nonzero amounts");
        vm.stopPrank();
    }

    // ========================================================
    // = Router ETH Liquidity Tests
    // ========================================================

    // (1) addLiquidityETH
    function testAddLiquidityETH() public {
        vm.startPrank(alice);
        tokenA.approve(address(router), type(uint).max);
        (uint amtToken, uint amtETH, uint liq) = router.addLiquidityETH{value: 2000 ether}(
            address(tokenA),
            2000 ether,
            0,
            0,
            alice,
            block.timestamp + 100
        );
        assertGt(liq, 0, "LP tokens should be minted");
        vm.stopPrank();
    }

    // (2) removeLiquidityETHSupportingFeeOnTransferTokens
    function testRemoveLiquidityETHSupportingFee() public {
        vm.startPrank(alice);
        tokenA.approve(address(router), type(uint).max);
        // Add liquidityETH; let the Router create the (tokenA, WETH) pair.
        ( , , uint liq) = router.addLiquidityETH{value: 2000 ether}(
            address(tokenA),
            2000 ether,
            0,
            0,
            alice,
            block.timestamp + 10000
        );
        // Retrieve the actual pair address.
        address pairAWeth = factory.getPair(address(tokenA), address(weth));
        // Force sync so the pair's reserves are updated.
        UniswapV2Pair(pairAWeth).sync();
        IERC20(pairAWeth).approve(address(router), liq);

        uint oldTokenBal = tokenA.balanceOf(alice);
        uint oldEthBal   = alice.balance;

        router.removeLiquidityETHSupportingFeeOnTransferTokens(
            address(tokenA),
            liq / 2,
            0,
            0,
            alice,
            block.timestamp + 10000
        );
        vm.stopPrank();

        assertTrue(tokenA.balanceOf(alice) > oldTokenBal, "Alice should receive tokenA");
        assertTrue(alice.balance > oldEthBal, "Alice should receive ETH");
    }

    // (3) removeLiquidityETHWithPermit with approveMax = true – using valid signature.
    function testRemoveLiquidityETHWithPermitApproveMaxTrue() public {
        vm.startPrank(alice);
        tokenA.approve(address(router), type(uint).max);
        ( , , uint liq) = router.addLiquidityETH{value: 2000 ether}(
            address(tokenA),
            2000 ether,
            0,
            0,
            alice,
            block.timestamp + 10000
        );
        vm.stopPrank();

        address pairAWeth = factory.getPair(address(tokenA), address(weth));
        IUniswapV2ERC20 pairERC20 = IUniswapV2ERC20(pairAWeth);

        // Use an ephemeral key for permit signing.
        uint256 ephemeralPk = 123456789;
        address ephemeralAlice = vm.addr(ephemeralPk);
        // Transfer LP tokens from alice to ephemeralAlice.
        vm.startPrank(alice);
        IERC20(pairAWeth).transfer(ephemeralAlice, liq);
        vm.stopPrank();
        assertEq(IERC20(pairAWeth).balanceOf(ephemeralAlice), liq);

        uint nonce = pairERC20.nonces(ephemeralAlice);
        uint deadline = block.timestamp + 10000;
        bool approveMax = true;
        uint value_ = approveMax ? type(uint).max : liq;
        bytes32 DOMAIN_SEPARATOR = pairERC20.DOMAIN_SEPARATOR();
        bytes32 PERMIT_TYPEHASH  = pairERC20.PERMIT_TYPEHASH();
        bytes32 permitHash = keccak256(
            abi.encode(
                PERMIT_TYPEHASH,
                ephemeralAlice,
                address(router),
                value_,
                nonce,
                deadline
            )
        );
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, permitHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ephemeralPk, digest);

        vm.startPrank(ephemeralAlice);
        router.removeLiquidityETHWithPermit(
            address(tokenA),
            liq,
            0,
            0,
            ephemeralAlice,
            deadline,
            true,
            v,
            r,
            s
        );
        vm.stopPrank();
    }

    // ========================================================
    // = Router Swap Tests
    // ========================================================

    // (1) swapExactTokensForTokens
    function testSwapExactTokensForTokens() public {
        vm.startPrank(alice);
        router.addLiquidity(
            address(tokenA),
            address(tokenB),
            2000 ether,
            2000 ether,
            0,
            0,
            alice,
            block.timestamp + 100
        );
        vm.stopPrank();

        vm.startPrank(bob);
        tokenA.approve(address(router), type(uint).max);
        address[] memory path = new address[](2);
        path[0] = address(tokenA);
        path[1] = address(tokenB);
        uint[] memory amounts = router.swapExactTokensForTokens(
            50 ether,
            0,
            path,
            bob,
            block.timestamp + 100
        );
        assertEq(amounts.length, 2, "swapExactTokensForTokens: path length mismatch");
        vm.stopPrank();
    }

    // (2) swapTokensForExactTokens
    function testSwapTokensForExactTokens() public {
        vm.startPrank(alice);
        router.addLiquidity(
            address(tokenA),
            address(tokenB),
            2000 ether,
            2000 ether,
            0,
            0,
            alice,
            block.timestamp + 100
        );
        vm.stopPrank();

        vm.startPrank(bob);
        tokenA.approve(address(router), type(uint).max);
        address[] memory path = new address[](2);
        path[0] = address(tokenA);
        path[1] = address(tokenB);
        uint[] memory amounts = router.swapTokensForExactTokens(
            50 ether,
            1000 ether,
            path,
            bob,
            block.timestamp + 100
        );
        assertEq(amounts.length, 2, "swapTokensForExactTokens: path length mismatch");
        vm.stopPrank();
    }

    // (3) swapExactETHForTokens
    function testSwapExactETHForTokens() public {
        vm.startPrank(alice);
        tokenA.approve(address(router), type(uint).max);
        router.addLiquidityETH{value: 2000 ether}(
            address(tokenA),
            2000 ether,
            0,
            0,
            alice,
            block.timestamp + 100
        );
        vm.stopPrank();

        vm.startPrank(bob);
        address[] memory path = new address[](2);
        path[0] = address(weth);
        path[1] = address(tokenA);
        uint[] memory amounts = router.swapExactETHForTokens{value: 50 ether}(
            0,
            path,
            bob,
            block.timestamp + 100
        );
        assertEq(amounts.length, 2, "swapExactETHForTokens: path length mismatch");
        vm.stopPrank();
    }

    // (4) swapTokensForExactETH
    function testSwapTokensForExactETH() public {
        vm.startPrank(alice);
        tokenA.approve(address(router), type(uint).max);
        router.addLiquidityETH{value: 2000 ether}(
            address(tokenA),
            2000 ether,
            0,
            0,
            alice,
            block.timestamp + 100
        );
        vm.stopPrank();

        vm.startPrank(bob);
        tokenA.approve(address(router), type(uint).max);
        address[] memory path = new address[](2);
        path[0] = address(tokenA);
        path[1] = address(weth);
        uint[] memory amounts = router.swapTokensForExactETH(
            50 ether,
            1000 ether,
            path,
            bob,
            block.timestamp + 100
        );
        assertEq(amounts.length, 2, "swapTokensForExactETH: path length mismatch");
        vm.stopPrank();
    }

    // (5) swapExactTokensForETH
    function testSwapExactTokensForETH() public {
        vm.startPrank(alice);
        tokenA.approve(address(router), type(uint).max);
        router.addLiquidityETH{value: 2000 ether}(
            address(tokenA),
            2000 ether,
            0,
            0,
            alice,
            block.timestamp + 100
        );
        vm.stopPrank();

        vm.startPrank(bob);
        tokenA.approve(address(router), type(uint).max);
        address[] memory path = new address[](2);
        path[0] = address(tokenA);
        path[1] = address(weth);
        uint[] memory amounts = router.swapExactTokensForETH(
            50 ether,
            0,
            path,
            bob,
            block.timestamp + 100
        );
        assertEq(amounts.length, 2, "swapExactTokensForETH: path length mismatch");
        vm.stopPrank();
    }

    // (6) swapETHForExactTokens
    function testSwapETHForExactTokens() public {
        vm.startPrank(alice);
        tokenA.approve(address(router), type(uint).max);
        router.addLiquidityETH{value: 2000 ether}(
            address(tokenA),
            2000 ether,
            0,
            0,
            alice,
            block.timestamp + 100
        );
        vm.stopPrank();

        vm.startPrank(bob);
        address[] memory path = new address[](2);
        path[0] = address(weth);
        path[1] = address(tokenA);
        uint[] memory amounts = router.swapETHForExactTokens{value: 1000 ether}(
            50 ether,
            path,
            bob,
            block.timestamp + 100
        );
        assertEq(amounts.length, 2, "swapETHForExactTokens: path length mismatch");
        vm.stopPrank();
    }

    // (7) swapExactTokensForTokensSupportingFeeOnTransferTokens
    function testSwapExactTokensForTokensSupportingFeeOnTransferTokens() public {
        vm.startPrank(alice);
        router.addLiquidity(
            address(tokenA),
            address(tokenB),
            2000 ether,
            2000 ether,
            0,
            0,
            alice,
            block.timestamp + 100
        );
        vm.stopPrank();
        vm.startPrank(bob);
        tokenA.approve(address(router), type(uint).max);
        address[] memory path = new address[](2);
        path[0] = address(tokenA);
        path[1] = address(tokenB);
        router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
            50 ether,
            0,
            path,
            bob,
            block.timestamp + 100
        );
        vm.stopPrank();
    }

    // (8) swapExactETHForTokensSupportingFeeOnTransferTokens
    function testSwapExactETHForTokensSupportingFeeOnTransferTokens() public {
        vm.startPrank(alice);
        tokenA.approve(address(router), type(uint).max);
        router.addLiquidityETH{value: 2000 ether}(
            address(tokenA),
            2000 ether,
            0,
            0,
            alice,
            block.timestamp + 100
        );
        vm.stopPrank();
        vm.startPrank(bob);
        address[] memory path = new address[](2);
        path[0] = address(weth);
        path[1] = address(tokenA);
        router.swapExactETHForTokensSupportingFeeOnTransferTokens{value: 50 ether}(
            0,
            path,
            bob,
            block.timestamp + 100
        );
        vm.stopPrank();
    }

    // (9) swapExactTokensForETHSupportingFeeOnTransferTokens
    function testSwapExactTokensForETHSupportingFeeOnTransferTokens() public {
        vm.startPrank(alice);
        tokenA.approve(address(router), type(uint).max);
        router.addLiquidityETH{value: 2000 ether}(
            address(tokenA),
            2000 ether,
            0,
            0,
            alice,
            block.timestamp + 100
        );
        vm.stopPrank();
        vm.startPrank(bob);
        tokenA.approve(address(router), type(uint).max);
        address[] memory path = new address[](2);
        path[0] = address(tokenA);
        path[1] = address(weth);
        router.swapExactTokensForETHSupportingFeeOnTransferTokens(
            50 ether,
            0,
            path,
            bob,
            block.timestamp + 100
        );
        vm.stopPrank();
    }
// (10) Test token-token removeLiquidityWithPermit
function testRemoveLiquidityWithPermitTokenToken() public {
    // Add token-token liquidity from alice.
    vm.startPrank(alice);
    ( , , uint liq) = router.addLiquidity(
        address(tokenA),
        address(tokenB),
        2000 ether,
        2000 ether,
        0,
        0,
        alice,
        block.timestamp + 100
    );
    vm.stopPrank();

    // Use an ephemeral account to simulate permit signing.
    uint256 ephemeralPk = 123456789;
    address ephemeralAlice = vm.addr(ephemeralPk);

    // Transfer the LP tokens from alice to ephemeralAlice.
    vm.startPrank(alice);
    address pairTokenToken = factory.getPair(address(tokenA), address(tokenB));
    IERC20(pairTokenToken).transfer(ephemeralAlice, liq);
    vm.stopPrank();
    assertEq(IERC20(pairTokenToken).balanceOf(ephemeralAlice), liq);

    // Prepare permit parameters.
    IUniswapV2ERC20 pairERC20 = IUniswapV2ERC20(pairTokenToken);
    uint nonce = pairERC20.nonces(ephemeralAlice);
    uint deadline = block.timestamp + 10000;
    bool approveMax = true;
    uint value_ = approveMax ? type(uint).max : liq;
    bytes32 DOMAIN_SEPARATOR = pairERC20.DOMAIN_SEPARATOR();
    bytes32 PERMIT_TYPEHASH  = pairERC20.PERMIT_TYPEHASH();

    bytes32 permitHash = keccak256(
        abi.encode(
            PERMIT_TYPEHASH,
            ephemeralAlice,
            address(router),
            value_,
            nonce,
            deadline
        )
    );
    bytes32 digest = keccak256(
        abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, permitHash)
    );
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(ephemeralPk, digest);

    // Call removeLiquidityWithPermit for token-token liquidity.
    vm.startPrank(ephemeralAlice);
    (uint amountA, uint amountB) = router.removeLiquidityWithPermit(
        address(tokenA),
        address(tokenB),
        liq,
        0,
        0,
        ephemeralAlice,
        deadline,
        approveMax,
        v, r, s
    );
    vm.stopPrank();

    // Verify that tokens were returned.
    assertTrue(amountA > 0 && amountB > 0, "removeLiquidityWithPermit should return nonzero amounts");
}


    // (11) Test plain removeLiquidityETH (without permit)
    function testRemoveLiquidityETHPlain() public {
    // Add liquidity for the token/WETH pair using addLiquidityETH.
    vm.startPrank(alice);
    tokenA.approve(address(router), type(uint).max);
    (uint amountToken, uint amountETH, uint liq) = router.addLiquidityETH{value: 2000 ether}(
        address(tokenA),
        2000 ether,
        0,
        0,
        alice,
        block.timestamp + 100
    );
    vm.stopPrank();

    // Get the pair address for tokenA-WETH.
    address pairAWeth = factory.getPair(address(tokenA), address(weth));

    // Approve LP tokens to the router.
    vm.startPrank(alice);
    IERC20(pairAWeth).approve(address(router), liq);
    
    // Record balances before removal.
    uint tokenBalanceBefore = tokenA.balanceOf(alice);
    uint ethBalanceBefore   = alice.balance;

    // Remove liquidity using the plain removeLiquidityETH function.
    (uint receivedToken, uint receivedETH) = router.removeLiquidityETH(
        address(tokenA),
        liq,
        0,
        0,
        alice,
        block.timestamp + 100
    );
    vm.stopPrank();

    // Check that some tokens and ETH are returned.
    assertTrue(receivedToken > 0 && receivedETH > 0, "removeLiquidityETH should return nonzero amounts");
    // Optionally, verify that alice's balances increased.
    assertTrue(tokenA.balanceOf(alice) >= tokenBalanceBefore, "Alice's token balance should increase");
    assertTrue(alice.balance >= ethBalanceBefore, "Alice's ETH balance should increase");
}
    // (12) Test removeLiquidityETHWithPermitSupportingFeeOnTransferTokens
    function testRemoveLiquidityETHWithPermitSupportingFeeOnTransferTokens() public {
    // Step 1: Add liquidityETH from alice.
    vm.startPrank(alice);
    tokenA.approve(address(router), type(uint).max);
    (uint amtToken, uint amtETH, uint liq) = router.addLiquidityETH{value: 2000 ether}(
        address(tokenA),
        2000 ether,
        0,
        0,
        alice,
        block.timestamp + 100
    );
    vm.stopPrank();

    // Step 2: Get the pair address for tokenA-WETH.
    address pairAWeth = factory.getPair(address(tokenA), address(weth));

    // Step 3: Transfer LP tokens from alice to an ephemeral address.
    // Use an ephemeral key with a known private key.
    uint256 ephemeralPk = 987654321;
    address ephemeralAlice = vm.addr(ephemeralPk);
    vm.startPrank(alice);
    IERC20(pairAWeth).transfer(ephemeralAlice, liq);
    vm.stopPrank();
    assertEq(IERC20(pairAWeth).balanceOf(ephemeralAlice), liq, "Ephemeral must receive all LP tokens");

    // Step 4: Prepare permit parameters.
    IUniswapV2ERC20 pairERC20 = IUniswapV2ERC20(pairAWeth);
    uint nonce = pairERC20.nonces(ephemeralAlice);
    uint deadline = block.timestamp + 10000;
    bool approveMax = true;
    uint value_ = approveMax ? type(uint).max : liq;
    bytes32 DOMAIN_SEPARATOR = pairERC20.DOMAIN_SEPARATOR();
    bytes32 PERMIT_TYPEHASH  = pairERC20.PERMIT_TYPEHASH();

    bytes32 permitHash = keccak256(
        abi.encode(
            PERMIT_TYPEHASH,
            ephemeralAlice,
            address(router),
            value_,
            nonce,
            deadline
        )
    );
    bytes32 digest = keccak256(
        abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, permitHash)
    );
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(ephemeralPk, digest);

    // Record balances before removal.
    uint tokenBalanceBefore = tokenA.balanceOf(ephemeralAlice);
    uint ethBalanceBefore   = ephemeralAlice.balance;

    // Step 5: Call removeLiquidityETHWithPermitSupportingFeeOnTransferTokens.
    vm.startPrank(ephemeralAlice);
    uint amountETH = router.removeLiquidityETHWithPermitSupportingFeeOnTransferTokens(
        address(tokenA),
        liq,
        0,
        0,
        ephemeralAlice,
        deadline,
        approveMax,
        v, r, s
    );
    vm.stopPrank();

    // Step 6: Verify that ephemeralAlice receives tokens and ETH.
    uint tokenBalanceAfter = tokenA.balanceOf(ephemeralAlice);
    uint ethBalanceAfter   = ephemeralAlice.balance;
    assertTrue(tokenBalanceAfter > tokenBalanceBefore, "Ephemeral should receive tokenA");
    assertTrue(ethBalanceAfter > ethBalanceBefore, "Ephemeral should receive ETH");
}

function testFeeToGetter() public {
    // Initially, feeTo is address(0) (as set in setUp via factory.setFeeTo(address(0))).
    assertEq(factory.feeTo(), address(0), "Initial feeTo should be 0");
    
    // Since the feeToSetter is this contract (set in setUp), we can call setFeeTo directly.
    address newFeeTo = address(0xBEEF);
    factory.setFeeTo(newFeeTo);
    
    // Now the getter should return the new feeTo address.
    assertEq(factory.feeTo(), newFeeTo, "feeTo should be updated to newFeeTo");
}

}
