// wagmiConfig.ts
import { createConfig } from "wagmi";
import { sepolia } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

/**
 * viem imports for testing chain ID
 * - We rename viem's `http` to `viemHttp` to avoid collision
 */
import { createPublicClient } from "viem";
import { http as viemHttp } from "viem";

/* Environment variables */
const SEPOLIA_RPC_URL = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "";
const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "";

console.log("SEPOLIA_RPC_URL is:", SEPOLIA_RPC_URL);

/* 
  1) Create a quick "publicClient" from viem to test chain ID
     - purely for debugging your node's chain. 
     - If chain = sepolia, it should return 11155111.
*/
const publicClient = createPublicClient({
  chain: sepolia,
  transport: viemHttp(SEPOLIA_RPC_URL),
});

/** 
 * 2) Just for debugging:
 *    logs the chain ID from your Alchemy / custom RPC endpoint 
 */
async function testChainId() {
  try {
    const chainId = await publicClient.getChainId();
    console.log("Chain ID from the node is:", chainId);
  } catch (err) {
    console.error("Error fetching chainId:", err);
  }
}
testChainId();

/** 
 * 3) Create the wagmi config for your app, 
 *    referencing the same URL with "transports"
 */
export const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [
    injected({ chains: [sepolia] }),
    walletConnect({
      projectId: WC_PROJECT_ID,
      chains: [sepolia],
      showQrModal: true,
      metadata: {
        name: "Your App Name",
        description: "Your App Description",
        url: "https://yourapp.com",
      },
    }),
  ],
  /* 
    "transports" is a wagmi v2 feature:
    We pass an object keyed by chain ID => "http({ url: ... })" 
    If your environment variable is the entire Alchemy URL, 
    then wagmi’s calls will go to that endpoint for reads/writes.
  */
  transports: {
    [sepolia.id]: viemHttp({ url: SEPOLIA_RPC_URL }), 
    // Note: rename to `viemHttp(...)` here instead of wagmi's default `http`,
    // to keep naming consistent. Or if you prefer:
    //   import { http as wagmiHttp } from "wagmi"
    //   ...
    //   [sepolia.id]: wagmiHttp({ url: SEPOLIA_RPC_URL })
  },
});
