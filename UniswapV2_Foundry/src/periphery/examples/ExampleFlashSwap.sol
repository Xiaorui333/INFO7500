// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "src/core/interfaces/IUniswapV2Callee.sol";

import "../libraries/UniswapV2Library.sol";
import "../interfaces/V1/IUniswapV1Factory.sol";
import "../interfaces/V1/IUniswapV1Exchange.sol";
import "../interfaces/IUniswapV2Router01.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/IWETH.sol";

contract ExampleFlashSwap is IUniswapV2Callee {
    IUniswapV1Factory immutable factoryV1;
    address immutable factory;
    IWETH immutable WETH;

    constructor(address _factory, address _factoryV1, address router) {
        factoryV1 = IUniswapV1Factory(_factoryV1);
        factory = _factory;
        WETH = IWETH(IUniswapV2Router01(router).WETH());
    }

    // needs to accept ETH from any V1 exchange and WETH.
    receive() external payable {}

    // gets tokens/WETH via a V2 flash swap, swaps for the ETH/tokens on V1, repays V2, and keeps the rest!
    function uniswapV2Call(address sender, uint amount0, uint amount1, bytes calldata data) external override {
        address[] memory path = new address[](2);
        uint amountToken;
        uint amountETH;
        {
            // scope for token{0,1}, avoids stack too deep errors
            address token0 = IUniswapV2Pair(msg.sender).token0();
            address token1 = IUniswapV2Pair(msg.sender).token1();
            require(msg.sender == UniswapV2Library.pairFor(factory, token0, token1), "NOT_PAIR");
            require(amount0 == 0 || amount1 == 0, "UNIDIRECTIONAL");
            path[0] = amount0 == 0 ? token0 : token1;
            path[1] = amount0 == 0 ? token1 : token0;
            amountToken = token0 == address(WETH) ? amount1 : amount0;
            amountETH = token0 == address(WETH) ? amount0 : amount1;
        }

        require(path[0] == address(WETH) || path[1] == address(WETH), "REQUIRES_WETH_PAIR");
        IERC20 token = IERC20(path[0] == address(WETH) ? path[1] : path[0]);
        IUniswapV1Exchange exchangeV1 = IUniswapV1Exchange(factoryV1.getExchange(address(token)));

        if (amountToken > 0) {
            // we borrowed token, need to swap token -> ETH on V1
            (uint minETH) = abi.decode(data, (uint)); // slippage param
            token.approve(address(exchangeV1), amountToken);
            // replaced uint(-1) with type(uint).max
            uint amountReceived = exchangeV1.tokenToEthSwapInput(amountToken, minETH, type(uint).max);
            uint amountRequired = UniswapV2Library.getAmountsIn(factory, amountToken, path)[0];
            require(amountReceived > amountRequired, "INSUFFICIENT_PROFIT");
            // repay V2 pair with WETH
            WETH.deposit{value: amountRequired}();
            require(WETH.transfer(msg.sender, amountRequired), "WETH_TRANSFER_FAIL");
            // keep the rest in ETH
            (bool success, ) = sender.call{value: amountReceived - amountRequired}(new bytes(0));
            require(success, "ETH_TRANSFER_FAIL");
        } else {
            // we borrowed WETH, need to swap ETH -> token on V1
            (uint minTokens) = abi.decode(data, (uint));
            WETH.withdraw(amountETH);
            // replaced uint(-1) with type(uint).max
            uint amountReceived = exchangeV1.ethToTokenSwapInput{value: amountETH}(minTokens, type(uint).max);
            uint amountRequired = UniswapV2Library.getAmountsIn(factory, amountETH, path)[0];
            require(amountReceived > amountRequired, "INSUFFICIENT_PROFIT");
            // repay V2 pair with tokens
            require(token.transfer(msg.sender, amountRequired), "TOKEN_TRANSFER_FAIL");
            // keep the rest
            require(token.transfer(sender, amountReceived - amountRequired), "TOKEN_TRANSFER_FAIL");
        }
    }
}
