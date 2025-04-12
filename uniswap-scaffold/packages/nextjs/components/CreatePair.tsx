import { useState } from "react";
import { useWalletClient } from "wagmi";
import { Address } from "~~/components/scaffold-eth";
import { UNISWAP_FACTORY_ABI, UNISWAP_FACTORY_ADDRESS } from "~~/abis/UniswapV2Factory";
import { createPublicClient, http, parseAbi } from "viem";
import { sepolia } from "viem/chains";

export function CreatePair() {
  const [token0Address, setToken0Address] = useState("");
  const [token1Address, setToken1Address] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");
  const { data: walletClient } = useWalletClient();

  const handleCreatePair = async () => {
    if (!walletClient) {
      setError("Please connect your wallet");
      return;
    }

    if (!token0Address || !token1Address) {
      setError("Please enter both token addresses");
      return;
    }

    try {
      setIsCreating(true);
      setError("");

      // Create the transaction
      const hash = await walletClient.writeContract({
        address: UNISWAP_FACTORY_ADDRESS,
        abi: UNISWAP_FACTORY_ABI,
        functionName: "createPair",
        args: [token0Address, token1Address],
      });

      setTxHash(hash);

      // Create a public client to wait for the transaction
      const publicClient = createPublicClient({
        chain: sepolia,
        transport: http(),
      });

      // Wait for the transaction to be mined
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      // Find the PairCreated event
      const pairCreatedEvent = receipt.logs.find(log => {
        try {
          const event = publicClient.decodeEventLog({
            abi: UNISWAP_FACTORY_ABI,
            data: log.data,
            topics: log.topics,
          });
          return event.eventName === "PairCreated";
        } catch {
          return false;
        }
      });

      if (pairCreatedEvent) {
        const event = publicClient.decodeEventLog({
          abi: UNISWAP_FACTORY_ABI,
          data: pairCreatedEvent.data,
          topics: pairCreatedEvent.topics,
        });
        console.log("New pair created at:", event.args.pair);
      }

    } catch (err) {
      console.error("Error creating pair:", err);
      setError(err instanceof Error ? err.message : "Failed to create pair");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-4">
      <h2 className="text-2xl font-bold mb-4">Create New Trading Pair</h2>
      
      <div className="space-y-2">
        <label className="block text-sm font-medium">Token 0 Address</label>
        <div className="flex gap-2">
          <Address address={token0Address} />
          <input
            type="text"
            value={token0Address}
            onChange={(e) => setToken0Address(e.target.value)}
            placeholder="Enter token address"
            className="w-full p-2 border rounded"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Token 1 Address</label>
        <div className="flex gap-2">
          <Address address={token1Address} />
          <input
            type="text"
            value={token1Address}
            onChange={(e) => setToken1Address(e.target.value)}
            placeholder="Enter token address"
            className="w-full p-2 border rounded"
          />
        </div>
      </div>

      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}

      {txHash && (
        <div className="text-sm">
          <span>Transaction: </span>
          <a 
            href={`https://sepolia.etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            View on Etherscan
          </a>
        </div>
      )}

      <button
        onClick={handleCreatePair}
        disabled={isCreating}
        className={`w-full p-2 text-white rounded ${
          isCreating
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-blue-500 hover:bg-blue-600"
        }`}
      >
        {isCreating ? "Creating..." : "Create Pair"}
      </button>
    </div>
  );
} 