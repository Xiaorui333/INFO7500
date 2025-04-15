"use client";
import React, { useState } from "react";
import { useAccount } from "wagmi";
import { Swap } from "~~/components/Swap";
import { AddLiquidity } from "~~/components/addLiquidity";
import { RemoveLiquidity } from "~~/components/removeLiquidity";
import { parseUnits } from "viem";

interface UnifiedNLIProps {
  routerAddress: `0x${string}`;
  tokenA: `0x${string}`;
  tokenB: `0x${string}`;
  pairAddress: `0x${string}`;
}

type OperationType = "swap" | "add" | "remove" | null;

export function UnifiedNLI({ routerAddress, tokenA, tokenB, pairAddress }: UnifiedNLIProps) {
  const [instruction, setInstruction] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [result, setResult] = useState("");
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const [lpTokens, setLpTokens] = useState("");
  const [operationType, setOperationType] = useState<OperationType>(null);
  const [showComponent, setShowComponent] = useState(false);
  const { status: accountStatus } = useAccount();
  const isConnected = accountStatus === 'connected';

  async function handleUnifiedNLI() {
    if (!isConnected) {
      setResult("Please connect your wallet.");
      return;
    }
    if (!instruction) {
      setResult("Please enter a natural language instruction.");
      return;
    }
    if (!apiKey) {
      setResult("Please enter your OpenAI API Key.");
      return;
    }

    try {
      // Call OpenAI API to parse the instruction into structured parameters
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: `You are a helpful assistant that parses natural language instructions into structured parameters for Uniswap V2 operations.
              Return a JSON object with the following format:
              {
                "operation": "swap", "add", or "remove",
                "amountA": "number as string, with no commas and proper decimal format (e.g. '10.5' not '10,5')",
                "amountB": "number as string, with no commas and proper decimal format (e.g. '10.5' not '10,5')",
                "lpTokens": "number as string, with no commas and proper decimal format (e.g. '10.5' not '10,5')"
              }
              For swap operations, include amountA.
              For add liquidity operations, include amountA and amountB.
              For remove liquidity operations, include lpTokens.
              Make sure all amounts are valid numbers that can be parsed by JavaScript's parseFloat function.`,
            },
            {
              role: "user",
              content: instruction,
            },
          ],
        }),
      });

      const data = await response.json();
      const sr = data.choices[0].message.content;
      console.log("OpenAI response:", sr);

      try {
        const params = JSON.parse(sr);
        
        // Validate the operation type
        if (params.operation !== "swap" && params.operation !== "add" && params.operation !== "remove") {
          throw new Error("Invalid operation: must be 'swap', 'add', or 'remove'");
        }
        
        // Set the operation type
        setOperationType(params.operation);
        
        if (params.operation === "swap") {
          // Validate the amount for swap
          const amountAValue = parseFloat(params.amountA);
          
          if (isNaN(amountAValue) || amountAValue <= 0) {
            throw new Error("Invalid amountA: must be a positive number");
          }
          
          // Set the amount
          setAmountA(amountAValue.toString());
          setResult("Swap parameters set. You can proceed with swapping.");
        } else if (params.operation === "add") {
          // Validate the amounts for add liquidity
          const amountAValue = parseFloat(params.amountA);
          const amountBValue = parseFloat(params.amountB);
          
          if (isNaN(amountAValue) || amountAValue <= 0) {
            throw new Error("Invalid amountA: must be a positive number");
          }
          if (isNaN(amountBValue) || amountBValue <= 0) {
            throw new Error("Invalid amountB: must be a positive number");
          }
          
          // Set the amounts
          setAmountA(amountAValue.toString());
          setAmountB(amountBValue.toString());
          setResult("Add liquidity parameters set. You can proceed with adding liquidity.");
        } else {
          // Validate the LP tokens for remove liquidity
          const lpTokensValue = parseFloat(params.lpTokens);
          
          if (isNaN(lpTokensValue) || lpTokensValue <= 0) {
            throw new Error("Invalid lpTokens: must be a positive number");
          }
          
          // Set the LP tokens
          setLpTokens(lpTokensValue.toString());
          setResult("Remove liquidity parameters set. You can proceed with removing liquidity.");
        }
        
        setShowComponent(true); // Show the appropriate component after successful parsing
      } catch (parseError) {
        console.error("Failed to parse OpenAI response:", parseError);
        setResult("Failed to parse the instruction. Please try again with a clearer instruction.");
        setShowComponent(false); // Hide the component on error
      }
    } catch (err: unknown) {
      console.error("UnifiedNLI process failed:", err);
      setResult(`Error: ${err instanceof Error ? err.message : err}`);
      setShowComponent(false); // Hide the component on error
    }
  }

  return (
    <div style={{ border: "1px solid #ddd", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>
      <h3>Uniswap Operations using Natural Language</h3>
      {!isConnected && <p style={{ color: "orange" }}>Please connect your wallet.</p>}

      <div style={{ marginBottom: "0.5rem" }}>
        <label>Instruction:</label>
        <input
          type="text"
          placeholder="e.g. Swap 10 Token A for Token B, Add 100 Token A and 50 Token B to the pool, Remove 50% of my liquidity"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          style={{ marginLeft: "0.5rem", width: "300px" }}
        />
      </div>

      <div style={{ marginBottom: "0.5rem" }}>
        <label>OpenAI API Key:</label>
        <input
          type="password"
          placeholder="Enter your OpenAI API Key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          style={{ marginLeft: "0.5rem", width: "300px" }}
        />
      </div>

      <button onClick={handleUnifiedNLI} style={{ padding: "0.5rem 1rem", marginBottom: "1rem" }}>
        Parse Instruction
      </button>

      {result && <p style={{ marginTop: "1rem", marginBottom: "1rem" }}>{result}</p>}

      {showComponent && operationType === "swap" && (
        <div style={{ marginTop: "1rem" }}>
          <h4>Swap Operation</h4>
          <Swap 
            key={`swap-${amountA}`}
            tokenIn={tokenA} 
            tokenOut={tokenB} 
            initialAmount={amountA}
          />
        </div>
      )}

      {showComponent && operationType === "add" && (
        <div style={{ marginTop: "1rem" }}>
          <h4>Add Liquidity Operation</h4>
          <AddLiquidity 
            key={`add-${amountA}-${amountB}`}
            routerAddress={routerAddress} 
            tokenA={tokenA} 
            tokenB={tokenB} 
            initialAmountA={amountA}
            initialAmountB={amountB}
          />
        </div>
      )}

      {showComponent && operationType === "remove" && (
        <div style={{ marginTop: "1rem" }}>
          <h4>Remove Liquidity Operation</h4>
          <RemoveLiquidity 
            key={`remove-${lpTokens}`}
            tokenA={tokenA} 
            tokenB={tokenB} 
            pairAddress={pairAddress} 
            initialLpTokens={lpTokens}
          />
        </div>
      )}
    </div>
  );
} 