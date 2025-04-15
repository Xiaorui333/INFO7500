"use client";
import React, { useState } from "react";
import { useAccount } from "wagmi";
import { Swap } from "~~/components/Swap";
import { parseUnits } from "viem";

interface SwapNLIProps {
  routerAddress: `0x${string}`;
  tokenA: `0x${string}`;
  tokenB: `0x${string}`;
}

export function SwapNLI({ routerAddress, tokenA, tokenB }: SwapNLIProps) {
  const [instruction, setInstruction] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [result, setResult] = useState("");
  const [swapAmount, setSwapAmount] = useState("");
  const [swapMode, setSwapMode] = useState<"exactIn" | "exactOut">("exactIn");
  const [showSwap, setShowSwap] = useState(false);
  const { status: accountStatus } = useAccount();
  const isConnected = accountStatus === 'connected';

  async function handleSwapNLI() {
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
              content: `You are a helpful assistant that parses natural language swap instructions into structured parameters for Uniswap V2.
              Return a JSON object with the following format:
              {
                "amount": "number as string, with no commas and proper decimal format (e.g. '10.5' not '10,5')",
                "isExactIn": boolean (true if amount is input token, false if amount is output token)
              }
              Example: { "amount": "10.5", "isExactIn": true }
              Make sure the amount is a valid number that can be parsed by JavaScript's parseFloat function.`,
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
        // Validate the parsed parameters
        const amount = parseFloat(params.amount);
        if (isNaN(amount) || amount <= 0) {
          throw new Error("Invalid amount: must be a positive number");
        }
        if (typeof params.isExactIn !== "boolean") {
          throw new Error("Invalid isExactIn: must be a boolean");
        }

        // Set the swap mode and amount directly
        setSwapMode(params.isExactIn ? "exactIn" : "exactOut");
        setSwapAmount(amount.toString());
        setResult("Swap parameters set. You can proceed with the swap.");
        setShowSwap(true); // Show the Swap component after successful parsing
      } catch (parseError) {
        console.error("Failed to parse OpenAI response:", parseError);
        setResult("Failed to parse the instruction. Please try again with a clearer instruction.");
        setShowSwap(false); // Hide the Swap component on error
      }
    } catch (err: unknown) {
      console.error("SwapNLI process failed:", err);
      setResult(`Error: ${err instanceof Error ? err.message : err}`);
      setShowSwap(false); // Hide the Swap component on error
    }
  }

  return (
    <div style={{ border: "1px solid #ddd", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>
      <h3>Swap using Natural Language</h3>
      {!isConnected && <p style={{ color: "orange" }}>Please connect your wallet.</p>}

      <div style={{ marginBottom: "0.5rem" }}>
        <label>Instruction:</label>
        <input
          type="text"
          placeholder="e.g. Swap 1 Token A for Token B"
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

      <button onClick={handleSwapNLI} style={{ padding: "0.5rem 1rem", marginBottom: "1rem" }}>
        Parse Instruction
      </button>

      {result && <p style={{ marginTop: "1rem", marginBottom: "1rem" }}>{result}</p>}

      {showSwap && (
        <div style={{ marginTop: "1rem" }}>
          <h4>Swap Operation</h4>
          <Swap 
            key={`${swapAmount}-${swapMode}`}
            tokenIn={tokenA} 
            tokenOut={tokenB}
            initialAmount={swapAmount}
            initialSwapMode={swapMode}
          />
        </div>
      )}
    </div>
  );
} 