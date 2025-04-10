"use client";
import React, { useState } from "react";
import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import { parseUnits, zeroAddress } from "viem";
import routerAbi from "~~/abis/UniswapV2Router02.json";
import erc20Abi from "~~/abis/TestERC20.json";

/**
 * Utility to check & request approval if the allowance is below the desired amount
 */
async function ensureAllowance({
  tokenAddress,
  owner,
  spender,
  requiredAmount,
  publicClient,
  writeContractAsync,
}: {
  tokenAddress: `0x${string}`;
  owner: `0x${string}`;
  spender: `0x${string}`;
  requiredAmount: bigint;
  publicClient: ReturnType<typeof usePublicClient>;
  writeContractAsync: ReturnType<typeof useWriteContract>["writeContractAsync"];
}) {
  if (!tokenAddress || tokenAddress === zeroAddress) return;
  if (requiredAmount === 0n) return;

  // Check current allowance
  if (!publicClient) {
    throw new Error("publicClient is not available");
  }
  const rawAllowance = await publicClient.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: [owner, spender],
  });
  const allowance: bigint = rawAllowance as bigint;

  if (allowance < requiredAmount) {
    // Approve if not enough allowance
    console.log(`Approving ${tokenAddress} for ${spender}, amount=${requiredAmount.toString()}`);
    await writeContractAsync({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [spender, requiredAmount],
    });
    console.log("Approved", tokenAddress);
  }
}

interface AddLiquidityProps {
  routerAddress: `0x${string}`;
  tokenA: `0x${string}`;
  tokenB: `0x${string}`;
}

export function AddLiquidity({ routerAddress, tokenA, tokenB }: AddLiquidityProps) {
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const { address: userAddress } = useAccount();
  const publicClient = usePublicClient({ chainId: 31337 });

  // We'll have one write hook for all calls, but we can reuse it each time.
  const {
    writeContractAsync,
    isPending,
    error: writeError,
  } = useWriteContract();

  async function handleAddLiquidity() {
    if (!userAddress || !routerAddress) {
      console.warn("No connected wallet address or invalid router address");
      return;
    }

    const amountAInWei = amountA ? parseUnits(amountA, 18) : 0n;
    const amountBInWei = amountB ? parseUnits(amountB, 18) : 0n;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20);

    try {
      // 1) Ensure allowance for tokenA
      await ensureAllowance({
        tokenAddress: tokenA as `0x${string}`,
        owner: userAddress as `0x${string}`,
        spender: routerAddress,
        requiredAmount: amountAInWei,
        publicClient,
        writeContractAsync,
      });

      // 2) Ensure allowance for tokenB
      await ensureAllowance({
        tokenAddress: tokenB as `0x${string}`,
        owner: userAddress as `0x${string}`,
        spender: routerAddress,
        requiredAmount: amountBInWei,
        publicClient,
        writeContractAsync,
      });

      // 3) Now call addLiquidity
      const tx = await writeContractAsync({
        address: routerAddress,
        abi: routerAbi.abi, // or just routerAbi if it's array
        functionName: "addLiquidity",
        
        args: [
          tokenA,
          tokenB,
          amountAInWei,
          amountBInWei,
          0n, // amountAMin
          0n, // amountBMin
          userAddress,
          deadline,
        ],
      });
      console.log("AddLiquidity TX submitted:", tx);
    } catch (err) {
      console.error("AddLiquidity process failed:", err);
    }
  }

  return (
    <div style={{ border: "1px solid #ddd", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>
      <h3>Add Liquidity</h3>
      {writeError && <p style={{ color: "red" }}>Error: {writeError.message}</p>}

      <div style={{ marginBottom: "0.5rem" }}>
        <label>Amount A:</label>
        <input
          type="number"
          placeholder="e.g. 1.0"
          value={amountA}
          onChange={(e) => setAmountA(e.target.value)}
          style={{ marginLeft: "0.5rem", width: "100px" }}
        />
      </div>
      <div style={{ marginBottom: "0.5rem" }}>
        <label>Amount B:</label>
        <input
          type="number"
          placeholder="e.g. 1.0"
          value={amountB}
          onChange={(e) => setAmountB(e.target.value)}
          style={{ marginLeft: "0.5rem", width: "100px" }}
        />
      </div>

      <button onClick={handleAddLiquidity} disabled={isPending || !userAddress} style={{ padding: "0.5rem 1rem" }}>
        {isPending ? "Depositing..." : "Add Liquidity"}
      </button>
    </div>
  );
}
