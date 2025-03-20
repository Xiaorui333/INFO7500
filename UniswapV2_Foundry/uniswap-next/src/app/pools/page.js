// src/lib/pools.js
export const POOLS = [
  {
    name: 'ETH / DAI',
    pairAddress: '0xYourPairAddress1',
    token0: {
      symbol: 'ETH',
      address: '0xYourEthTokenAddress',
      decimals: 18,
    },
    token1: {
      symbol: 'DAI',
      address: '0xYourDaiTokenAddress',
      decimals: 18,
    },
  },
  {
    name: 'USDC / WBTC',
    pairAddress: '0xYourPairAddress2',
    token0: {
      symbol: 'USDC',
      address: '0xYourUsdcAddress',
      decimals: 6,
    },
    token1: {
      symbol: 'WBTC',
      address: '0xYourWbtcAddress',
      decimals: 8,
    },
  },
  // Add more pools as needed
];
