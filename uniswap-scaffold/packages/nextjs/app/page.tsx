"use client";
import React, { useState } from "react";
import { PoolSelector } from "~~/components/PoolSelector";
import { ApproveToken } from "~~/components/ApproveToken";
import { AddLiquidity } from "~~/components/addLiquidity";
import { RemoveLiquidity } from "~~/components/removeLiquidity";
import { Swap } from "~~/components/Swap";
import { PoolAnalytics } from "~~/components/PoolAnalytics"; // Bonding curve
import { SwapPriceDistribution } from "~~/components/SwapPriceDistribution"; // Price histogram

type EthAddress = `0x${string}`;

interface PoolPair {
  label: string;
  pairAddress: string;
  tokenA: EthAddress;
  tokenB: EthAddress;
}

// You can add more known pairs if you like. Make sure
// the .env variables are set properly with "0x" addresses.
const knownPairs: PoolPair[] = [
  {
    label: "TokenA / TokenB",
    pairAddress: process.env.NEXT_PUBLIC_TOKENA_TOKENB_PAIR || "",
    tokenA: process.env.NEXT_PUBLIC_TOKENA_ADDRESS as EthAddress,
    tokenB: process.env.NEXT_PUBLIC_TOKENB_ADDRESS as EthAddress,
  },
];

export default function HomePage() {
  const [selectedPair, setSelectedPair] = useState("");
  const [tokenA, setTokenA] = useState<EthAddress>("0x0000000000000000000000000000000000000000");
  const [tokenB, setTokenB] = useState<EthAddress>("0x0000000000000000000000000000000000000000");

  const handleSelectPool = (selectedTokenA: EthAddress, selectedTokenB: EthAddress, pairAddress: string) => {
    setSelectedPair(pairAddress);
    setTokenA(selectedTokenA);
    setTokenB(selectedTokenB);
  };

  return (
    <main style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto", fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ textAlign: "center", marginBottom: "1.5rem" }}>UniswapV2 Demo</h1>

      {/* Pool Selector */}
      <section style={{ marginBottom: "2rem", padding: "1rem", border: "1px solid #ccc", borderRadius: "8px" }}>
        <PoolSelector pairs={knownPairs} onSelectPool={handleSelectPool} />
      </section>

      {selectedPair && (
        <>
          {/* Token Approvals */}
          <section style={{ marginBottom: "2rem", padding: "1rem", border: "1px solid #ccc", borderRadius: "8px" }}>
            <h2>Token Approvals</h2>
            <p>Please approve the router to spend your tokens.</p>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <ApproveToken tokenAddress={tokenA} label="Approve Token A" />
              <ApproveToken tokenAddress={tokenB} label="Approve Token B" />
            </div>
          </section>

          {/* Pool Operations */}
          <section style={{ marginBottom: "2rem", padding: "1rem", border: "1px solid #ccc", borderRadius: "8px" }}>
            <h2>Pool Operations</h2>
            <AddLiquidity
              routerAddress={process.env.NEXT_PUBLIC_UNISWAPV2_ROUTER02_ADDRESS as EthAddress}
              tokenA={tokenA}
              tokenB={tokenB}
            />
            <RemoveLiquidity pairAddress={selectedPair as EthAddress} tokenA={tokenA} tokenB={tokenB} />
            <Swap tokenIn={tokenA} tokenOut={tokenB} />
          </section>

          {/* Pool Analytics */}
          <section style={{ marginBottom: "2rem", padding: "1rem", border: "1px solid #ccc", borderRadius: "8px" }}>
            <h2>Pool Analytics</h2>
            {/* Bonding curve from getReserves */}
            <PoolAnalytics pairAddress={selectedPair as EthAddress} />

            {/* Swap Price Distribution chart from Swap events */}
            <SwapPriceDistribution pairAddress={selectedPair as EthAddress} />
          </section>
        </>
      )}
    </main>
  );
}
