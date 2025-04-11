"use client";
import React, { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { parseUnits } from "viem"; // ✅ 用 viem 提供的精度函数
import routerAbi from "~~/abis/UniswapV2Router02.json";

const ROUTER_ADDRESS = process.env.NEXT_PUBLIC_UNISWAPV2_ROUTER02_ADDRESS as `0x${string}`;

interface RemoveLiquidityProps {
  tokenA: `0x${string}`;
  tokenB: `0x${string}`;
}

export function RemoveLiquidity({ tokenA, tokenB }: RemoveLiquidityProps) {
  const { address: userAddress } = useAccount();
  const [lpTokens, setLpTokens] = useState("");
  const lpTokensInWei = lpTokens ? parseUnits(lpTokens, 18) : 0n;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20);
  const minAmount = parseUnits("0", 18); // for test purpose

  const { writeContract, isPending, error } = useWriteContract();

  async function handleRemove() {
    if (!userAddress) {
      console.warn("No connected wallet found.");
      return;
    }
    try {
      const tx = await writeContract({
        address: ROUTER_ADDRESS,
        abi: routerAbi.abi,
        functionName: "removeLiquidity",
        args: [tokenA, tokenB, lpTokensInWei, minAmount, minAmount, userAddress, deadline],
      });
      console.log("✅ Remove Liquidity TX submitted:", tx);
    } catch (err) {
      console.error("❌ RemoveLiquidity failed:", err);
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

      <button 
        onClick={handleRemove}
        disabled={isPending}
      >
        {isPending ? "Removing..." : "Remove Liquidity"}
      </button>
      {error && <p style={{ color: "red" }}>Error: {error.message}</p>}
    </div>
  );

  console.log("Params:", {
    tokenA,
    tokenB,
    lpTokensInWei: lpTokensInWei.toString(),
    userAddress,
    deadline: deadline.toString()
  });  
}
