"use client";
import React, { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { parseUnits } from "viem";
import routerAbi from "@/abis/UniswapV2Router02.json";

/**
 * RemoveLiquidity component:
 * - Reads your router address from ENV.
 * - Calls removeLiquidity on the UniswapV2Router02 contract.
 * - No simulation, just sends the transaction.
 */
export function RemoveLiquidity() {
  // Pull from .env: NEXT_PUBLIC_UNISWAPV2_ROUTER02_ADDRESS
  const routerAddress = process.env.NEXT_PUBLIC_UNISWAPV2_ROUTER02_ADDRESS as `0x${string}` | undefined;

  // Example tokens you previously added liquidity for:
  const tokenA: `0x${string}` = "0xAFDef8811Cf4dd77ABCD39f0d8A4da98dfd631AD";
  const tokenB: `0x${string}` = "0xEDb86AF52cffE19B16e2C55EDc74dae46Abd0Afb";

  // LP token decimals (often 18)
  const decimalsLP = 18;

  // State: how many LP tokens to burn
  const [lpTokens, setLpTokens] = useState("");

  // Get the user's address from Wagmi
  const { address: userAddress } = useAccount();

  // Convert typed LP token amount to BigInt
  const lpTokensInWei = lpTokens ? parseUnits(lpTokens, decimalsLP) : 0n;

  // 20-minute deadline from now
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20);

  // The direct write call (no simulation)
  const {
    writeContractAsync: removeLiquidityAsync,
    isLoading,
    error: writeError,
  } = useWriteContract();

  async function handleRemove() {
    // If routerAddress is missing, or user isn't connected, bail
    if (!routerAddress) {
      console.warn("Router address is undefined. Check your .env file and logs.");
      return;
    }
    if (!userAddress) {
      console.warn("No connected wallet address found.");
      return;
    }

    try {
      // Send the transaction on-chain
      const tx = await removeLiquidityAsync({
        address: routerAddress,  // Must be the router, not the pair
        abi: routerAbi,          // Must include "removeLiquidity" in the ABI
        functionName: "removeLiquidity",
        args: [
          tokenA,
          tokenB,
          lpTokensInWei, // liquidity to remove
          0n,            // amountAMin
          0n,            // amountBMin
          userAddress,   // 'to' address
          deadline,
        ],
        // chainId: 11155111, // If you're on Sepolia, uncomment
      });
      console.log("Remove Liquidity TX submitted:", tx);
    } catch (err) {
      console.error("RemoveLiquidity failed:", err);
    }
  }

  // Log everything for debugging
  console.log("RemoveLiquidity Debug =>", {
    routerAddress,
    tokenA,
    tokenB,
    decimalsLP,
    lpTokens,
    lpTokensInWei: lpTokensInWei.toString(),
    userAddress,
    deadline: deadline.toString(),
    isLoading,
    writeError,
  });

  return (
    <div style={{ border: "1px solid #ddd", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>
      <h3>Remove Liquidity</h3>

      {writeError && (
        <p style={{ color: "red" }}>Remove Liquidity Error: {writeError.message}</p>
      )}

      <div style={{ marginBottom: "0.5rem" }}>
        <label>LP Tokens to Burn:</label>
        <input
          type="number"
          placeholder="e.g. 1.0"
          value={lpTokens}
          onChange={(e) => setLpTokens(e.target.value)}
          style={{ marginLeft: "0.5rem", width: "100px" }}
        />
      </div>

      <button
        onClick={handleRemove}
        disabled={isLoading || !routerAddress || !userAddress}
        style={{ padding: "0.5rem 1rem" }}
      >
        {isLoading ? "Redeeming..." : "Remove Liquidity"}
      </button>
    </div>
  );
}
