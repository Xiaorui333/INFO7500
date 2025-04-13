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
  // Log inputs immediately
  console.log("[ensureAllowance] Checking for:");
  console.log("[ensureAllowance]   tokenAddress:", tokenAddress);
  console.log("[ensureAllowance]   owner:", owner);
  console.log("[ensureAllowance]   spender:", spender);
  console.log("[ensureAllowance]   requiredAmount:", requiredAmount.toString());
  
  if (!tokenAddress || tokenAddress === zeroAddress) return;
  if (requiredAmount === 0n) return;

  // Check current allowance
  if (!publicClient) {
    console.error("[ensureAllowance] Error: publicClient is not available");
    throw new Error("publicClient is not available");
  }
  
  try {
      console.log("[ensureAllowance] Reading allowance...");
      const rawAllowance = await publicClient.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "allowance",
        args: [owner, spender],
      });
      const allowance: bigint = rawAllowance as bigint;
      console.log("[ensureAllowance] Current allowance:", allowance.toString());

      if (allowance < requiredAmount) {
        // Approve if not enough allowance
        console.log(`[ensureAllowance] Allowance too low. Approving ${tokenAddress} for ${spender}, amount=${requiredAmount.toString()}`);
        await writeContractAsync({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: "approve",
          args: [spender, requiredAmount],
        });
        console.log("[ensureAllowance] Approved", tokenAddress);
      } else {
          console.log("[ensureAllowance] Allowance sufficient.");
      }
  } catch (error) {
      console.error("[ensureAllowance] Error during allowance check/approval:", error);
      // Re-throwing the error might be useful for upstream catch blocks
      throw error; 
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
  const { address: userAddress, status: accountStatus } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending, error: writeError } = useWriteContract();
  const isConnected = accountStatus === 'connected';

  async function handleAddLiquidity() {
    console.log("[handleAddLiquidity] Attempting to add liquidity...");
    console.log("[handleAddLiquidity] Initial State:", {
      userAddress,
      accountStatus,
      isConnected,
      routerAddress,
      tokenA,
      tokenB,
      amountA,
      amountB,
    });
    console.log("[handleAddLiquidity] Using publicClient:", {
      chain: publicClient?.chain,
      transport_key: publicClient?.transport.key,
      transport_url: (publicClient?.transport as any)?.url
    });

    if (!isConnected || !userAddress) {
      console.warn("Wallet not connected or address unavailable.");
      return;
    }
    if (!publicClient) {
      console.error("AddLiquidity Error: Public client not available.");
      return;
    }
    if (!routerAddress) {
      console.warn("Invalid router address");
      return;
    }
    if (!tokenA || !tokenB ) {
        console.warn("AddLiquidity Warning: Invalid or missing token addresses.");
        return;
    }

    const amountAInWei = amountA ? parseUnits(amountA, 18) : 0n;
    const amountBInWei = amountB ? parseUnits(amountB, 18) : 0n;
    if (amountAInWei <= 0n || amountBInWei <= 0n) {
        console.warn("AddLiquidity Warning: Both token amounts must be greater than zero.");
        return;
    }
    const amountAMin = (amountAInWei * 95n) / 100n; // 5% slippage
    const amountBMin = (amountBInWei * 95n) / 100n; // 5% slippage
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20);

    console.log("[handleAddLiquidity] Calculated Values:", {
        amountAInWei: amountAInWei.toString(),
        amountBInWei: amountBInWei.toString(),
        amountAMin: amountAMin.toString(),
        amountBMin: amountBMin.toString(),
        deadline: deadline.toString()
    });

    try {
      console.log("[handleAddLiquidity] Entering try block, about to call ensureAllowance for Token A...");
      await ensureAllowance({
        tokenAddress: tokenA,
        owner: userAddress as `0x${string}`,
        spender: routerAddress,
        requiredAmount: amountAInWei,
        publicClient,
        writeContractAsync,
      });

      console.log("[handleAddLiquidity] ensureAllowance for Token A completed. About to call for Token B...");
      await ensureAllowance({
        tokenAddress: tokenB,
        owner: userAddress as `0x${string}`,
        spender: routerAddress,
        requiredAmount: amountBInWei,
        publicClient,
        writeContractAsync,
      });

      console.log("[handleAddLiquidity] ensureAllowance for Token B completed. About to call addLiquidity...");
      // Call addLiquidity
      const tx = await writeContractAsync({
        address: routerAddress,
        abi: routerAbi.abi,
        functionName: "addLiquidity",
        args: [
          tokenA,
          tokenB,
          amountAInWei,
          amountBInWei,
          amountAMin,
          amountBMin,
          userAddress,
          deadline,
        ],
      });
      console.log("AddLiquidity TX submitted:", tx);
    } catch (err) {
      console.error("AddLiquidity process failed inside try block:", err);
    }
  }

  const isDisabled = isPending || !isConnected || !publicClient;

  return (
    <div style={{ border: "1px solid #ddd", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>
      <h3>Add Liquidity</h3>
      {writeError && <p style={{ color: "red" }}>Error: {writeError.message}</p>}
      {!isConnected && <p style={{ color: "orange" }}>Please connect your wallet.</p>}
      {isConnected && !publicClient && <p style={{ color: "red" }}>Error: Network client not available.</p>}

      <div style={{ marginBottom: "0.5rem" }}>
        <label>Amount A:</label>
        <input
          type="number"
          placeholder="e.g. 1.0"
          value={amountA}
          onChange={(e) => setAmountA(e.target.value)}
          style={{ marginLeft: "0.5rem", width: "100px" }}
          disabled={isDisabled} // Also disable inputs if not ready
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
          disabled={isDisabled} // Also disable inputs if not ready
        />
      </div>

      <button onClick={handleAddLiquidity} disabled={isDisabled} style={{ padding: "0.5rem 1rem" }}>
        {isPending ? "Depositing..." : "Add Liquidity"}
      </button>
    </div>
  );
}
