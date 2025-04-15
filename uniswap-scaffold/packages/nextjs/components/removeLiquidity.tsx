"use client";
import React, { useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { parseUnits, zeroAddress } from "viem";
import routerAbi from "~~/abis/UniswapV2Router02.json";
import erc20Abi from "~~/abis/TestERC20.json";
import pairAbi from "~~/abis/UniswapV2Pair.json";


const ROUTER_ADDRESS = process.env.NEXT_PUBLIC_UNISWAPV2_ROUTER02_ADDRESS as `0x${string}`;

async function ensureLpAllowance({
  pairAddress,
  userAddress,
  routerAddress,
  lpTokensNeeded,
  publicClient,
  writeContractAsync,
}: {
  pairAddress: `0x${string}`;
  userAddress: `0x${string}`;
  routerAddress: `0x${string}`;
  lpTokensNeeded: bigint;
  publicClient: ReturnType<typeof usePublicClient> | undefined;
  writeContractAsync: ReturnType<typeof useWriteContract>["writeContractAsync"];
}) {
  console.log("[ensureLpAllowance] Checking allowance for LP Token:", pairAddress);
  if (!publicClient) {
    console.error("[ensureLpAllowance] Error: publicClient is undefined.");
    throw new Error("Public client is not available");
  }
  if (!pairAddress || pairAddress === zeroAddress) return;
  if (lpTokensNeeded <= 0n) return;

  // 1) 读取现有 allowance
  const currentAllowance = (await publicClient.readContract({
    address: pairAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: [userAddress, routerAddress],
  })) as bigint;

  console.log(`[ensureLpAllowance] currentAllowance = ${currentAllowance.toString()}`);

  // 2) 如果不足，就先 approve
  if (currentAllowance < lpTokensNeeded) {
    console.log(`[ensureLpAllowance] Not enough allowance. Approving ${lpTokensNeeded.toString()}...`);
    await writeContractAsync({
      address: pairAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [routerAddress, lpTokensNeeded],
    });
    console.log("[ensureLpAllowance] Approved LP tokens successfully!");
  } else {
    console.log("[ensureLpAllowance] Sufficient LP allowance. No need to approve.");
  }
}

interface RemoveLiquidityProps {
  tokenA: `0x${string}`;
  tokenB: `0x${string}`;
  pairAddress: `0x${string}`;
  initialLpTokens?: string;
}

export function RemoveLiquidity({ 
  tokenA, 
  tokenB, 
  pairAddress, 
  initialLpTokens = "" 
}: RemoveLiquidityProps) {
  const { address: userAddress } = useAccount();
  const publicClient = usePublicClient();

  // LP 数量（输入框）
  const [lpTokens, setLpTokens] = useState(initialLpTokens);
  // 发送交易用的 Hooks
  const { writeContractAsync, isPending, error } = useWriteContract();

  async function handleRemove() {
    if (!userAddress) {
      console.warn("No connected wallet found.");
      return;
    }
    if (!pairAddress) {
        console.warn("[handleRemove] pairAddress is missing!");
        return;
    }
    // 转成 Wei
    const lpTokensInWei = lpTokens ? parseUnits(lpTokens, 18) : 0n;
    if (lpTokensInWei <= 0n) {
      console.warn("LP token amount must be > 0");
      return;
    }

    const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20);
    const minAmount = 0n;

    console.log("[handleRemove] Removing liquidity with params:", {
      tokenA,
      tokenB,
      pairAddress,
      lpTokensInWei: lpTokensInWei.toString(),
      minAmount: minAmount.toString(),
      userAddress,
      deadline: deadline.toString(),
    });

    try {
      // 1) 确保Router拥有LP代币的花费权限
      await ensureLpAllowance({
        pairAddress,
        userAddress: userAddress as `0x${string}`,
        routerAddress: ROUTER_ADDRESS,
        lpTokensNeeded: lpTokensInWei,
        publicClient,
        writeContractAsync,
      });

      // 2) 调用 removeLiquidity
      const tx = await writeContractAsync({
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
          disabled={isPending}
        />
      </div>

      <button onClick={handleRemove} disabled={isPending}>
        {isPending ? "Removing..." : "Remove Liquidity"}
      </button>

      {error && <p style={{ color: "red" }}>Error: {error.message}</p>}
    </div>
  );
}
