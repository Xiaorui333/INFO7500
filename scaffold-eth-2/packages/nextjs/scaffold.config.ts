import * as chains from "viem/chains";

const scaffoldConfig = {
  targetNetworks: [chains.sepolia], 
  pollingInterval: 30000,
  alchemyApiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "QJMgczQPSqgTL8p5YHMhx_OBxt70gU-w",
  walletConnectProjectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "e650aa45f7ea70c976d7ed4ca1905269",
  onlyLocalBurnerWallet: false,
  rpcOverrides: {
    [chains.sepolia.id]: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL!,
  },
};
console.log("Sepolia RPC from env:", process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL);
console.log("Sepolia chain id is:", chains.sepolia.id);


export default scaffoldConfig;
