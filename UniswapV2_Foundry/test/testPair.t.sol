// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {UniswapV2Factory}  from "src/core/UniswapV2Factory.sol";
import {UniswapV2Pair}     from "src/core/UniswapV2Pair.sol";
import {UniswapV2Router02} from "src/periphery/UniswapV2Router02.sol";
import {TestERC20}         from "./TestERC20.sol";
import {WETH9}             from "src/periphery/test/WETH9.sol";
import {IERC20}            from "src/core/interfaces/IERC20.sol";
import {IUniswapV2Callee}  from "src/core/interfaces/IUniswapV2Callee.sol";

/// -----------------------------------------------------------------------
/// Helper contracts to simulate error conditions
/// -----------------------------------------------------------------------

// FailingERC20 always returns false on transfer.
contract FailingERC20 is IERC20 {
    string public constant name = "FailingToken";
    string public constant symbol = "FAIL";
    uint8 public constant decimals = 18;
    
    function balanceOf(address) external pure override returns (uint256) {
        return 1000 ether;
    }
    function totalSupply() external pure override returns (uint256) { return 1000 ether; }
    function allowance(address, address) external pure override returns (uint256) { return 0; }
    function approve(address, uint256) external pure override returns (bool) { return true; }
    function transfer(address, uint256) external pure override returns (bool) { return false; }
    function transferFrom(address, address, uint256) external pure override returns (bool) { return false; }
}

// DummyCallee implements the UniswapV2 callback.
// Behavior depends on the first byte of the provided data:
// • If data[0] == 0xFF, it sends nothing.
// • If data[0] == 0x01, it sends an insufficient amount for token1 (only 1 wei).
// • If data[0] == 0x02, then—assuming that amount0Out is 0—it sends nothing for token0 and sends exactly 10.03 ether for token1.
// • Otherwise, it sends back exactly the amounts passed.
contract DummyCallee is IUniswapV2Callee {
    bool public callbackCalled;
    uint public receivedAmount0;
    uint public receivedAmount1;
    bytes public receivedData;
    address public pairAddress;
    IERC20 public token0;
    IERC20 public token1;
    
    constructor(address _pair, address _token0, address _token1) {
        pairAddress = _pair;
        token0 = IERC20(_token0);
        token1 = IERC20(_token1);
    }
    
    function uniswapV2Call(address, uint amount0, uint amount1, bytes calldata data) external override {
        callbackCalled = true;
        receivedAmount0 = amount0;
        receivedAmount1 = amount1;
        receivedData = data;
        
        if (data.length > 0 && data[0] == 0xFF) {
            // Do nothing – simulate no tokens being sent.
        } else if (data.length > 0 && data[0] == 0x01) {
            // Send an insufficient amount for token1 (only 1 wei).
            token1.transfer(pairAddress, 1);
        } else if (data.length > 0 && data[0] == 0x02) {
            // For our testSwapCallback, we assume amount0Out==0 so we don't send token0.
            // Send exactly 10.03 ether for token1.
            token1.transfer(pairAddress, 10030000000000000000);
        } else {
            // Default: send back exactly the amounts.
            token0.transfer(pairAddress, amount0);
            token1.transfer(pairAddress, amount1);
        }
    }
}

/// -----------------------------------------------------------------------
/// Extended Test Contract for UniswapV2Pair
/// -----------------------------------------------------------------------
contract UniswapV2FullCoverageExtendedTest is Test {
    UniswapV2Factory  public factory;
    UniswapV2Router02 public router;
    WETH9             public weth;
    TestERC20         public tokenA;
    TestERC20         public tokenB;
    UniswapV2Pair     public pair;
    address           public pairAddress;

    // Test addresses.
    address public alice = address(0x1111);
    address public bob   = address(0x2222);
    address public carol = address(0x3333);
    address public feeToSetterEOA;

    function setUp() public {
        vm.warp(1000);
        vm.deal(alice, 5_000_000 ether);
        vm.deal(bob,   5_000_000 ether);
        vm.deal(carol, 5_000_000 ether);
        
        feeToSetterEOA = makeAddr("feeToSetter");
        factory = new UniswapV2Factory(feeToSetterEOA);
        
        weth = new WETH9();
        router = new UniswapV2Router02(address(factory), address(weth));
        
        tokenA = new TestERC20("TokenA", "TKA", 18);
        tokenB = new TestERC20("TokenB", "TKB", 18);
        
        // Mint tokens.
        tokenA.mint(alice, 1_000_000 ether);
        tokenB.mint(alice, 1_000_000 ether);
        tokenA.mint(bob,   1_000_000 ether);
        tokenB.mint(bob,   1_000_000 ether);
        tokenA.mint(carol, 1_000_000 ether);
        tokenB.mint(carol, 1_000_000 ether);
        tokenA.mint(address(this), 100_000 ether);
        tokenB.mint(address(this), 100_000 ether);
        
        // Create a tokenA-tokenB pair.
        vm.startPrank(feeToSetterEOA);
        pairAddress = factory.createPair(address(tokenA), address(tokenB));
        vm.stopPrank();
        pair = UniswapV2Pair(pairAddress);
        
        // Fee configuration: set feeToSetter to this contract and feeTo to 0.
        vm.prank(feeToSetterEOA);
        factory.setFeeToSetter(address(0x1234));
        vm.prank(address(0x1234));
        factory.setFeeTo(address(0x9999));
        vm.prank(address(0x1234));
        factory.setFeeToSetter(address(this));
        vm.prank(address(this));
        factory.setFeeTo(address(0));
        
        // Approve router for alice.
        vm.startPrank(alice);
        tokenA.approve(address(router), type(uint).max);
        tokenB.approve(address(router), type(uint).max);
        vm.stopPrank();
    }
    
    // Test: initialize() should revert if called by non-factory.
    function testInitializeForbidden() public {
        UniswapV2Pair pairLocal = new UniswapV2Pair();
        vm.prank(alice);
        vm.expectRevert(bytes("UniswapV2: FORBIDDEN"));
        pairLocal.initialize(address(tokenA), address(tokenB));
    }
    
    // Test: _safeTransfer fails when token returns false.
    function testSafeTransferFailure() public {
        UniswapV2Pair pairLocal = new UniswapV2Pair();
        pairLocal.initialize(address(new FailingERC20()), address(tokenB));
        vm.expectRevert(bytes("UniswapV2: TRANSFER_FAILED"));
        pairLocal.skim(alice);
    }
    
    // Test: mint() reverts if no liquidity is added.
    function testMintInsufficientLiquidity() public {
        UniswapV2Pair pairLocal = new UniswapV2Pair();
        pairLocal.initialize(address(tokenA), address(tokenB));
        vm.expectRevert();  // accept any revert
        pairLocal.mint(alice);
    }
    
    // Test: burn() reverts when LP tokens held by the pair are zero.
    function testBurnInsufficientLiquidity() public {
        vm.prank(alice);
        tokenA.transfer(address(pair), 100000 ether);
        vm.prank(alice);
        tokenB.transfer(address(pair), 100000 ether);
        vm.prank(alice);
        pair.mint(alice);
        vm.expectRevert(bytes("UniswapV2: INSUFFICIENT_LIQUIDITY_BURNED"));
        vm.prank(alice);
        pair.burn(alice);
    }
    
    // Test: swap() reverts if both output amounts are zero.
    function testSwapInsufficientOutput() public {
        vm.prank(alice);
        router.addLiquidity(address(tokenA), address(tokenB), 2000 ether, 2000 ether, 0, 0, alice, block.timestamp + 100);
        vm.prank(bob);
        vm.expectRevert(bytes("UniswapV2: INSUFFICIENT_OUTPUT_AMOUNT"));
        pair.swap(0, 0, bob, new bytes(0));
    }
    
    // Test: swap() reverts when output amounts are not less than reserves.
    function testSwapInsufficientLiquidity() public {
        vm.prank(alice);
        router.addLiquidity(address(tokenA), address(tokenB), 2000 ether, 2000 ether, 0, 0, alice, block.timestamp + 100);
        (uint112 reserve0, uint112 reserve1, ) = pair.getReserves();
        vm.prank(bob);
        vm.expectRevert(bytes("UniswapV2: INSUFFICIENT_LIQUIDITY"));
        pair.swap(reserve0, reserve1, bob, new bytes(0));
    }
    
    // Test: swap() reverts if recipient is one of the tokens.
    function testSwapInvalidTo() public {
        vm.prank(alice);
        router.addLiquidity(address(tokenA), address(tokenB), 2000 ether, 2000 ether, 0, 0, alice, block.timestamp + 100);
        vm.prank(bob);
        vm.expectRevert(bytes("UniswapV2: INVALID_TO"));
        pair.swap(10 ether, 0, address(tokenA), new bytes(0));
        vm.prank(bob);
        vm.expectRevert(bytes("UniswapV2: INVALID_TO"));
        pair.swap(0, 10 ether, address(tokenB), new bytes(0));
    }
    
    
    // Test: swap() reverts if no tokens are sent back (insufficient input).
    function testSwapInsufficientInput() public {
        vm.prank(alice);
        router.addLiquidity(address(tokenA), address(tokenB), 2000 ether, 2000 ether, 0, 0, alice, block.timestamp + 100);
        DummyCallee dummy = new DummyCallee(address(pair), address(tokenA), address(tokenB));
        bytes memory data = hex"ff";
        vm.prank(bob);
        vm.expectRevert(bytes("UniswapV2: INSUFFICIENT_INPUT_AMOUNT"));
        pair.swap(10 ether, 0, address(dummy), data);
    }
    
    // Test: swap() reverts because invariant (K) check fails.
    function testSwapInvariantK() public {
        vm.prank(alice);
        router.addLiquidity(address(tokenA), address(tokenB), 1000 ether, 1000 ether, 0, 0, alice, block.timestamp + 100);
        DummyCallee dummy = new DummyCallee(address(pair), address(tokenA), address(tokenB));
        vm.prank(alice);
        tokenB.transfer(address(dummy), 10 ether);
        bytes memory data = hex"01"; // dummy sends insufficient amount.
        vm.prank(bob);
        vm.expectRevert(bytes("UniswapV2: K"));
        pair.swap(10 ether, 0, address(dummy), data);
    }
    
    // Test: Fee logic branch – when fee is ON, fee tokens are minted.
    function testMintFeeLogic() public {
        // Turn fee ON by setting feeTo to a nonzero address.
        vm.prank(address(this));
        factory.setFeeTo(address(0xBEEF));
        
        vm.prank(alice);
        tokenA.transfer(address(pair), 100000 ether);
        vm.prank(alice);
        tokenB.transfer(address(pair), 100000 ether);
        vm.prank(alice);
        pair.mint(alice);
        
        vm.prank(bob);
        tokenA.transfer(address(pair), 10 ether);
        vm.prank(bob);
        pair.swap(1 ether, 0, bob, new bytes(0));
        
        vm.prank(carol);
        tokenA.transfer(address(pair), 1000 ether);
        vm.prank(carol);
        tokenB.transfer(address(pair), 1000 ether);
        vm.prank(carol);
        pair.mint(carol);
        
        uint feeBalance = pair.balanceOf(address(0xBEEF));
        assertGt(feeBalance, 0, "Fee logic should mint fee LP tokens");
    }
    
    // Test: When fee is OFF and kLast is nonzero, it resets to zero.
    function testResetKLastWhenFeeOff() public {
        // First, turn fee ON so that kLast becomes nonzero.
        vm.prank(address(this));
        factory.setFeeTo(address(0xBEEF));
        
        vm.prank(alice);
        tokenA.transfer(address(pair), 100000 ether);
        vm.prank(alice);
        tokenB.transfer(address(pair), 100000 ether);
        vm.prank(alice);
        pair.mint(alice);
        
        uint kLastBefore = pair.kLast();
        assertGt(kLastBefore, 0, "kLast should be nonzero after liquidity addition");
        
        // Now, turn fee OFF.
        vm.prank(address(this));
        factory.setFeeTo(address(0));
        
        // Add additional liquidity.
        vm.prank(bob);
        tokenA.transfer(address(pair), 1000 ether);
        vm.prank(bob);
        tokenB.transfer(address(pair), 1000 ether);
        vm.prank(bob);
        pair.mint(bob);
        
        uint kLastAfter = pair.kLast();
        assertEq(kLastAfter, 0, "kLast should be reset to 0 when fee is off");
    }
}
