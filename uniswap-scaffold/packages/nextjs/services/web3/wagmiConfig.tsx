import { wagmiConnectors } from "./wagmiConnectors";
import { Chain, createClient, fallback, http, Transport } from "viem";
import { hardhat, mainnet, sepolia } from "viem/chains";
import { createConfig } from "wagmi";
import scaffoldConfig, { DEFAULT_ALCHEMY_API_KEY, ScaffoldConfig } from "~~/scaffold.config";
import { getAlchemyHttpUrl } from "~~/utils/scaffold-eth";

const { targetNetworks } = scaffoldConfig;

// We always want to have mainnet enabled (ENS resolution, ETH price, etc). But only once.
export const enabledChains = targetNetworks.find((network: Chain) => network.id === 1)
  ? targetNetworks
  : ([...targetNetworks, mainnet] as const);

// Print current environment variables
console.log(`Alchemy API Key: ${scaffoldConfig.alchemyApiKey}`);
console.log(`Target Networks: ${JSON.stringify(targetNetworks.map(n => n.name))}`);
console.log(`RPC Overrides: ${JSON.stringify(scaffoldConfig.rpcOverrides)}`);

export const wagmiConfig = createConfig({
  chains: enabledChains,
  connectors: wagmiConnectors,
  ssr: true,
  client({ chain }) {
    let transport: Transport;
    const rpcOverrideUrl = (scaffoldConfig.rpcOverrides as ScaffoldConfig["rpcOverrides"])?.[chain.id];
    console.log(`[wagmiConfig] Processing chain ${chain.name} (ID: ${chain.id}). Override URL found: ${rpcOverrideUrl || 'None'}`);

    if (chain.id === sepolia.id && rpcOverrideUrl) {
      console.log(`Using DIRECT HTTP Transport for Sepolia (ID ${chain.id}): ${rpcOverrideUrl}`);
      transport = http(rpcOverrideUrl);
    } else {
      console.log(`[wagmiConfig] Using FALLBACK logic for chain ${chain.id}`);
      let rpcFallbacks: ReturnType<typeof http>[] = [http()];
      const alchemyHttpUrl = getAlchemyHttpUrl(chain.id);

      if (alchemyHttpUrl) {
        const isUsingDefaultKey = scaffoldConfig.alchemyApiKey === DEFAULT_ALCHEMY_API_KEY;
        console.log(`[wagmiConfig] Using Alchemy URL: ${alchemyHttpUrl} for chain ${chain.id}${isUsingDefaultKey ? " (default key)" : ""}`);
        rpcFallbacks = isUsingDefaultKey ? [http(), http(alchemyHttpUrl)] : [http(alchemyHttpUrl), http()];
      } else {
        console.log(`[wagmiConfig] No specific RPC found for chain ${chain.id}, using default public RPC`);
      }
      transport = fallback(rpcFallbacks);
    }

    return createClient({
      chain,
      transport,
      ...((chain.id as number) !== hardhat.id
        ? {
            pollingInterval: scaffoldConfig.pollingInterval,
          }
        : {}),
    });
  },
});
