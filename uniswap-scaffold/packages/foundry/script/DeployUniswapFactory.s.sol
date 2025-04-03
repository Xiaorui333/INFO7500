// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import "../contracts/periphery/test/TestERC20.sol";
import "../contracts/core/UniswapV2Factory.sol";
import "../contracts/periphery/test/WETH9.sol";
import "../contracts/periphery/UniswapV2Router02.sol";

/**
 * @notice Deploy script for YourContract contract
 * @dev Inherits ScaffoldETHDeploy which:
 *      - Includes forge-std/Script.sol for deployment
 *      - Includes ScaffoldEthDeployerRunner modifier
 *      - Provides `deployer` variable
 * Example:
 * yarn deploy --file DeployUniswapFactory.s.sol  # local anvil chain
 * yarn deploy --file DeployUniswapFactory.s.sol --network optimism # live network (requires keystore)
 */
contract DeployUniswapFactory is ScaffoldETHDeploy {
    /**
     * @dev Deployer setup based on `ETH_KEYSTORE_ACCOUNT` in `.env`:
     *      - "scaffold-eth-default": Uses Anvil's account #9 (0xa0Ee7A142d267C1f36714E4a8F75612F20a79720), no password prompt
     *      - "scaffold-eth-custom": requires password used while creating keystore
     *
     * Note: Must use ScaffoldEthDeployerRunner modifier to:
     *      - Setup correct `deployer` account and fund it
     *      - Export contract addresses & ABIs to `nextjs` packages
     */
    function run() external ScaffoldEthDeployerRunner {
        UniswapV2Factory factory = new UniswapV2Factory(deployer);

        WETH9 weth = new WETH9();
        UniswapV2Router02 router = new UniswapV2Router02(address(factory), address(weth));

        // Deploy test tokens.
        TestERC20 tokenA = new TestERC20("TokenA", "TKA", 18);
        TestERC20 tokenB = new TestERC20("TokenB", "TKB", 18);

        address pairAddress = factory.createPair(address(tokenA), address(tokenB));
        factory.setFeeToSetter(address(0x1234));

    }
}
