"use client";
import React, { useState } from "react";
import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import { parseUnits, maxUint256 } from "viem";
import routerAbi from "~~/abis/UniswapV2Router02.json";
import erc20Abi from "~~/abis/TestERC20.json";

interface SwapProps {
  tokenIn: `0x${string}`;
  tokenOut: `0x${string}`;
  decimalsIn?: number;
  decimalsOut?: number;
  initialAmount?: string;
  initialSwapMode?: SwapMode;
}

type SwapMode = "exactIn" | "exactOut";

export function Swap({ 
  tokenIn, 
  tokenOut, 
  decimalsIn = 18, 
  decimalsOut = 18,
  initialAmount = "",
  initialSwapMode = "exactIn"
}: SwapProps) {
  const [inputAmount, setInputAmount] = useState(initialSwapMode === "exactIn" ? initialAmount : "");
  const [outputAmount, setOutputAmount] = useState(initialSwapMode === "exactOut" ? initialAmount : "");
  const [swapMode, setSwapMode] = useState<SwapMode>(initialSwapMode);
  const { address: userAddress } = useAccount();
  const [loading, setLoading] = useState(false);
  const publicClient = usePublicClient();

  // Convert user input to BigInt using the appropriate decimals
  const amountInWei = inputAmount ? parseUnits(inputAmount, decimalsIn) : 0n;
  const amountOutWei = outputAmount ? parseUnits(outputAmount, decimalsOut) : 0n;

  // Example: 20 minutes from now
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20);

  const { writeContractAsync: swapTokensAsync, error: writeError } = useWriteContract();

  // Check and request token approval
  async function ensureTokenApproval() {
    const routerAddress = process.env.NEXT_PUBLIC_UNISWAPV2_ROUTER02_ADDRESS as `0x${string}`;
    if (!routerAddress || !userAddress || !publicClient) {
      console.error("Missing required parameters for token approval");
      return false;
    }

    try {
      // Check current allowance
      console.log(`Checking allowance for token ${tokenIn}`);
      const allowance = await publicClient.readContract({
        address: tokenIn,
        abi: erc20Abi,
        functionName: "allowance",
        args: [userAddress, routerAddress],
      }) as bigint;

      const requiredAmount = swapMode === "exactIn" ? amountInWei : maxUint256;
      console.log(`Current allowance: ${allowance.toString()}, Required: ${requiredAmount.toString()}`);

      // If allowance is insufficient, request approval
      if (allowance < requiredAmount) {
        console.log(`Requesting approval for ${requiredAmount.toString()} tokens`);
        const approveTx = await swapTokensAsync({
          address: tokenIn,
          abi: erc20Abi,
          functionName: "approve",
          args: [routerAddress, requiredAmount],
        });
        console.log(`Approval transaction submitted: ${approveTx}`);
        
        // Wait for approval before proceeding
        return true;
      } else {
        console.log("Token already approved");
        return true;
      }
    } catch (error) {
      console.error("Error checking/requesting token approval:", error);
      return false;
    }
  }

  async function handleSwap() {
    const routerAddress = process.env.NEXT_PUBLIC_UNISWAPV2_ROUTER02_ADDRESS as `0x${string}`;
    if (!routerAddress) {
      console.error("Router address is undefined. Check your .env file.");
      return;
    }
    if (!userAddress) {
      console.warn("No connected wallet address found.");
      return;
    }

    try {
      setLoading(true);
      
      // Ensure token approval first
      const isApproved = await ensureTokenApproval();
      if (!isApproved) {
        console.error("Failed to approve token");
        setLoading(false);
        return;
      }

      if (swapMode === "exactIn") {
        if (amountInWei <= 0n) {
          console.warn("Input amount must be greater than 0.");
          return;
        }
        
        console.log("Swapping exact tokens for tokens with params:", {
          tokenIn,
          tokenOut,
          amountInWei: amountInWei.toString(),
          amountOutMin: "0",
          recipient: userAddress,
          deadline: deadline.toString()
        });
        
        // Swap exact tokens for tokens
        const tx = await swapTokensAsync({
          address: routerAddress,
          abi: routerAbi.abi,
          functionName: "swapExactTokensForTokens",
          args: [
            amountInWei,
            0n,                // amountOutMin
            [tokenIn, tokenOut],
            userAddress,
            deadline,
          ],
        });
        console.log("Swap transaction submitted!", tx);
      } else {
        if (amountOutWei <= 0n) {
          console.warn("Output amount must be greater than 0.");
          return;
        }
        
        console.log("Swapping tokens for exact tokens with params:", {
          tokenIn,
          tokenOut,
          amountOutWei: amountOutWei.toString(),
          amountInMax: maxUint256.toString(),
          recipient: userAddress,
          deadline: deadline.toString()
        });
        
        // Swap tokens for exact tokens
        const tx = await swapTokensAsync({
          address: routerAddress,
          abi: routerAbi.abi,
          functionName: "swapTokensForExactTokens",
          args: [
            amountOutWei,
            maxUint256, // amountInMax (maximum possible value)
            [tokenIn, tokenOut],
            userAddress,          // recipient
            deadline,
          ],
        });
        console.log("Swap transaction submitted!", tx);
      }
    } catch (err: any) {
      console.error("Swap failed:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ border: "1px solid #ddd", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>
      <h3>Swap Tokens</h3>

      <div style={{ marginBottom: "1rem" }}>
        <label>Swap Mode: </label>
        <select
          value={swapMode}
          onChange={(e) => setSwapMode(e.target.value as SwapMode)}
          style={{ marginLeft: "0.5rem" }}
        >
          <option value="exactIn">Exact Input</option>
          <option value="exactOut">Exact Output</option>
        </select>
      </div>

      {writeError && (
        <p style={{ color: "red" }}>Error: {writeError.message}</p>
      )}

      <div style={{ marginBottom: "0.5rem" }}>
        {swapMode === "exactIn" ? (
          <>
            <label>Token In Amount:</label>
            <input
              type="number"
              placeholder="e.g. 1.0"
              value={inputAmount}
              onChange={(e) => setInputAmount(e.target.value)}
              style={{ marginLeft: "0.5rem", width: "100px" }}
            />
          </>
        ) : (
          <>
            <label>Token Out Amount:</label>
            <input
              type="number"
              placeholder="e.g. 1.0"
              value={outputAmount}
              onChange={(e) => setOutputAmount(e.target.value)}
              style={{ marginLeft: "0.5rem", width: "100px" }}
            />
          </>
        )}
      </div>

      <button
        onClick={handleSwap}
        disabled={loading || !userAddress}
        style={{ padding: "0.5rem 1rem" }}
      >
        {loading ? "Swapping..." : "Swap"}
      </button>
    </div>
  );
}
