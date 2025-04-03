
"use client";
import React, { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import routerAbi from "@/abis/UniswapV2Router02.json";

interface RemoveLiquidityProps {
  pairAddress: `0x${string}`;
  tokenA: `0x${string}`;
  tokenB: `0x${string}`;
}

export function RemoveLiquidity({ pairAddress, tokenA, tokenB }: RemoveLiquidityProps) {
  const { address: userAddress } = useAccount();

  // Example state for LP tokens to remove
  const [lpTokens, setLpTokens] = useState("");
  const lpTokensInWei = lpTokens ? BigInt(Number(lpTokens) * 1e18) : 0n;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20);

  // Using writeContractAsync for the removeLiquidity call.
  const { writeContractAsync, error } = useWriteContract();

  async function handleRemove() {
    if (!userAddress) {
      console.warn("No connected wallet found.");
      return;
    }
    try {
      const tx = await writeContractAsync({
        address: pairAddress, // assuming the router is at the pair address; adjust if needed
        abi: routerAbi.abi,   // assuming routerAbi has a top-level "abi" field; adjust if needed
        functionName: "removeLiquidity",
        args: [tokenA, tokenB, lpTokensInWei, 0n, 0n, userAddress, deadline],
      });
      console.log("Remove Liquidity TX submitted:", tx);
    } catch (err) {
      console.error("RemoveLiquidity failed:", err);
    }
  }

  return (
    <div style={{ border: "1px solid #ddd", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>
      <h3>Remove Liquidity</h3>
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

      <button onClick={handleRemove}>Remove Liquidity</button>
      {error && <p style={{ color: "red" }}>Error: {error.message}</p>}
      </div>
       );
    }

