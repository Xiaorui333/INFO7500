"use client";
import React, { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { parseUnits } from "viem";
import erc20Abi from "~~/abis/TestERC20.json"; 

const ROUTER_ADDRESS = process.env.NEXT_PUBLIC_UNISWAPV2_ROUTER02_ADDRESS as `0x${string}`;

interface ApproveTokenProps {
  tokenAddress: `0x${string}`;
  label?: string;
  initialAmount?: string;
}

export function ApproveToken({ tokenAddress, label, initialAmount = "1000" }: ApproveTokenProps) {
  // const { address: userAddress } = useAccount();
  const [amount, setAmount] = useState(initialAmount);

  const amountInWei = parseUnits(amount, 18);

  const { writeContractAsync, isPending } = useWriteContract();

  console.log("tokenAddress: ", tokenAddress)
  const handleApprove = async () => {
    try {
      const tx = await writeContractAsync({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [ROUTER_ADDRESS, amountInWei],
      });
      console.log("Approval submitted. Tx:", tx);
    } catch (err) {
      console.error("Approve error:", err);
    }
  };

  return (
    <div style={{ border: "1px solid #ddd", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>
      <h3 style={{ marginBottom: "0.5rem" }}>{label || "Approve Token"}</h3>
      <div style={{ marginBottom: "0.5rem" }}>
        <label>
          Amount to Approve:
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ marginLeft: "0.5rem", width: "120px" }}
          />
        </label>
      </div>
      <button onClick={handleApprove} disabled={isPending} style={{ padding: "0.5rem 1rem" }}>
        {isPending ? "Approving..." : "Approve"}
      </button>
    </div>
  );
}
