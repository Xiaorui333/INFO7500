// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "./interfaces/IUniswapV2Pair.sol";
import "./UniswapV2ERC20.sol";
import "./libraries/Math.sol";
import "./libraries/UQ112x112.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/IUniswapV2Factory.sol";
import "./interfaces/IUniswapV2Callee.sol";

using UQ112x112 for uint224;

/**
 * The Pair contract is an ERC-20 (UniswapV2ERC20)
 * plus the extra DEX logic for mint/burn/swap, etc.
 */
contract UniswapV2Pair is IUniswapV2Pair, UniswapV2ERC20 {
    // ------------------------------------------------
    // IUniswapV2Pair fields
    // ------------------------------------------------
    uint public constant override MINIMUM_LIQUIDITY = 10**3;
    address public override factory;
    address public override token0;
    address public override token1;
    uint public override price0CumulativeLast;
    uint public override price1CumulativeLast;
    uint public override kLast; // reserve0 * reserve1, after the most recent liquidity event

    // ------------------------------------------------
    // Stored pair reserves
    // ------------------------------------------------
    uint112 private reserve0;           
    uint112 private reserve1;           
    uint32  private blockTimestampLast; 

    // Reentrancy guard
    uint private unlocked = 1;
    modifier lock() {
        require(unlocked == 1, "UniswapV2: LOCKED");
        unlocked = 0;
        _;
        unlocked = 1;
    }

    // For safeTransfer
    bytes4 private constant SELECTOR = bytes4(keccak256("transfer(address,uint256)"));

    constructor() {
        factory = msg.sender;
    }

    // ------------------------------------------------
    // Pair events (already declared in IUniswapV2Pair)
    // ------------------------------------------------
    // event Mint(...);
    // event Burn(...);
    // event Swap(...);
    // event Sync(...);

    // ------------------------------------------------
    // Pair initialization
    // ------------------------------------------------
    function initialize(address _token0, address _token1) external override {
        require(msg.sender == factory, "UniswapV2: FORBIDDEN");
        token0 = _token0;
        token1 = _token1;
    }

    // ------------------------------------------------
    // View reserves
    // ------------------------------------------------
    function getReserves()
        public
        view
        override
        returns (
            uint112 _reserve0,
            uint112 _reserve1,
            uint32 _blockTimestampLast
        )
    {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
        _blockTimestampLast = blockTimestampLast;
    }

    // ------------------------------------------------
    // Internal helpers
    // ------------------------------------------------

    function _safeTransfer(address token, address to, uint value) private {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(SELECTOR, to, value)
        );
        require(
            success && (data.length == 0 || abi.decode(data, (bool))),
            "UniswapV2: TRANSFER_FAILED"
        );
    }

    function _update(
        uint balance0,
        uint balance1,
        uint112 _reserve0,
        uint112 _reserve1
    ) private {
        require(
            balance0 <= type(uint112).max && balance1 <= type(uint112).max,
            "UniswapV2: OVERFLOW"
        );
        uint32 blockTimestamp = uint32(block.timestamp % 2**32);
        uint32 timeElapsed = blockTimestamp - blockTimestampLast; // Uniswap logic: overflow desired
        if (timeElapsed > 0 && _reserve0 != 0 && _reserve1 != 0) {
            // price accumulators
            price0CumulativeLast +=
                uint(UQ112x112.encode(_reserve1).uqdiv(_reserve0)) *
                timeElapsed;
            price1CumulativeLast +=
                uint(UQ112x112.encode(_reserve0).uqdiv(_reserve1)) *
                timeElapsed;
        }
        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);
        blockTimestampLast = blockTimestamp;
        emit Sync(reserve0, reserve1);
    }

    // If fee is on, mint liquidity equivalent to 1/6 of growth in sqrt(k)
    function _mintFee(
        uint112 _reserve0,
        uint112 _reserve1
    ) private returns (bool feeOn) {
        address feeTo = IUniswapV2Factory(factory).feeTo();
        feeOn = feeTo != address(0);
        uint _kLast = kLast; // gas saving
        if (feeOn) {
            if (_kLast != 0) {
                uint rootK = Math.sqrt(uint(_reserve0) * uint(_reserve1));
                uint rootKLast = Math.sqrt(_kLast);
                if (rootK > rootKLast) {
                    uint numerator = totalSupply * (rootK - rootKLast);
                    uint denominator = (rootK * 5) + rootKLast;
                    uint liquidity = numerator / denominator;
                    if (liquidity > 0) _mint(feeTo, liquidity);
                }
            }
        } else if (_kLast != 0) {
            kLast = 0;
        }
    }

    // ------------------------------------------------
    // Pair external functions
    // ------------------------------------------------

    function mint(address to)
        external
        override
        lock
        returns (uint liquidity)
    {
        (uint112 _reserve0, uint112 _reserve1, ) = getReserves();
        uint balance0 = IERC20(token0).balanceOf(address(this));
        uint balance1 = IERC20(token1).balanceOf(address(this));
        uint amount0 = balance0 - _reserve0;
        uint amount1 = balance1 - _reserve1;

        bool feeOn = _mintFee(_reserve0, _reserve1);
        uint _totalSupply = totalSupply; // from UniswapV2ERC20
        if (_totalSupply == 0) {
            // first LP
            uint liquidityBefore = Math.sqrt(amount0 * amount1);
            liquidity = liquidityBefore - MINIMUM_LIQUIDITY;
            _mint(address(0), MINIMUM_LIQUIDITY); // lock
        } else {
            // subsequent LP
            uint liquidity0 = (amount0 * _totalSupply) / _reserve0;
            uint liquidity1 = (amount1 * _totalSupply) / _reserve1;
            liquidity = (liquidity0 < liquidity1) ? liquidity0 : liquidity1;
        }

        require(liquidity > 0, "UniswapV2: INSUFFICIENT_LIQUIDITY_MINTED");
        _mint(to, liquidity);

        _update(balance0, balance1, _reserve0, _reserve1);
        if (feeOn) {
            kLast = uint(reserve0) * uint(reserve1);
        }
        emit Mint(msg.sender, amount0, amount1);
    }

    function burn(address to)
        external
        override
        lock
        returns (uint amount0, uint amount1)
    {
        (uint112 _reserve0, uint112 _reserve1, ) = getReserves();
        address _token0 = token0;
        address _token1 = token1;
        uint balance0 = IERC20(_token0).balanceOf(address(this));
        uint balance1 = IERC20(_token1).balanceOf(address(this));
        uint liquidity = balanceOf[address(this)];

        bool feeOn = _mintFee(_reserve0, _reserve1);
        uint _totalSupply = totalSupply; 
        amount0 = (liquidity * balance0) / _totalSupply;
        amount1 = (liquidity * balance1) / _totalSupply;
        require(
            amount0 > 0 && amount1 > 0,
            "UniswapV2: INSUFFICIENT_LIQUIDITY_BURNED"
        );
        _burn(address(this), liquidity);
        _safeTransfer(_token0, to, amount0);
        _safeTransfer(_token1, to, amount1);
        balance0 = IERC20(_token0).balanceOf(address(this));
        balance1 = IERC20(_token1).balanceOf(address(this));

        _update(balance0, balance1, _reserve0, _reserve1);
        if (feeOn) {
            kLast = uint(reserve0) * uint(reserve1);
        }
        emit Burn(msg.sender, amount0, amount1, to);
    }

    function swap(
        uint amount0Out,
        uint amount1Out,
        address to,
        bytes calldata data
    ) external override lock {
        require(amount0Out > 0 || amount1Out > 0, "UniswapV2: INSUFFICIENT_OUTPUT_AMOUNT");
        (uint112 _reserve0, uint112 _reserve1, ) = getReserves();
        require(
            amount0Out < _reserve0 && amount1Out < _reserve1,
            "UniswapV2: INSUFFICIENT_LIQUIDITY"
        );

        uint balance0;
        uint balance1;
        {
            // scope to avoid stack-too-deep
            address _token0 = token0;
            address _token1 = token1;
            require(to != _token0 && to != _token1, "UniswapV2: INVALID_TO");
            if (amount0Out > 0) _safeTransfer(_token0, to, amount0Out);
            if (amount1Out > 0) _safeTransfer(_token1, to, amount1Out);
            if (data.length > 0) {
                IUniswapV2Callee(to).uniswapV2Call(msg.sender, amount0Out, amount1Out, data);
            }
            balance0 = IERC20(_token0).balanceOf(address(this));
            balance1 = IERC20(_token1).balanceOf(address(this));
        }
        // how much was actually input?
        uint amount0In = (balance0 > (_reserve0 - amount0Out))
            ? balance0 - (_reserve0 - amount0Out)
            : 0;
        uint amount1In = (balance1 > (_reserve1 - amount1Out))
            ? balance1 - (_reserve1 - amount1Out)
            : 0;
        require(
            amount0In > 0 || amount1In > 0,
            "UniswapV2: INSUFFICIENT_INPUT_AMOUNT"
        );
        {
            // keep 0.3% fee
            uint balance0Adjusted = (balance0 * 1000) - (amount0In * 3);
            uint balance1Adjusted = (balance1 * 1000) - (amount1In * 3);
            require(
                balance0Adjusted * balance1Adjusted >=
                    uint(_reserve0) * uint(_reserve1) * (1000**2),
                "UniswapV2: K"
            );
        }

        _update(balance0, balance1, _reserve0, _reserve1);
        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }

    function skim(address to) external override lock {
        address _token0 = token0;
        address _token1 = token1;
        _safeTransfer(_token0, to, IERC20(_token0).balanceOf(address(this)) - reserve0);
        _safeTransfer(_token1, to, IERC20(_token1).balanceOf(address(this)) - reserve1);
    }

    function sync() external override lock {
        _update(
            IERC20(token0).balanceOf(address(this)),
            IERC20(token1).balanceOf(address(this)),
            reserve0,
            reserve1
        );
    }
}
