"use client";
import React, { useState } from "react";
import { PoolSelector } from "~~/components/PoolSelector";
import { AddLiquidity } from "~~/components/addLiquidity";
import { RemoveLiquidity } from "~~/components/removeLiquidity";
import { Swap } from "~~/components/Swap";
import { PoolAnalytics } from "~~/components/PoolAnalytics";
import { SwapPriceDistribution } from "~~/components/SwapPriceDistribution";

const knownPairs = [
  {
    label: "TokenA / TokenB",
    pairAddress: process.env.NEXT_PUBLIC_TOKENA_TOKENB_PAIR || "",
    tokenA: process.env.NEXT_PUBLIC_TOKENA_ADDRESS || "",
    tokenB: process.env.NEXT_PUBLIC_TOKENB_ADDRESS || "",
  },
  // Add more if needed
];

export default function PoolPage() {
  const [selectedPair, setSelectedPair] = useState<string>("");
  const [tokenA, setTokenA] = useState<string>("");
  const [tokenB, setTokenB] = useState<string>("");

  function handleSelectPool(pairAddr: string) {
    setSelectedPair(pairAddr);
    const info = knownPairs.find(kp => kp.pairAddress === pairAddr);
    if (info) {
      setTokenA(info.tokenA);
      setTokenB(info.tokenB);
    }
  }

  return (
    <main>
      <h1>My UniswapV2 Demo</h1>
      <PoolSelector
        pairs={knownPairs.map(kp => ({
          label: kp.label,
          pairAddress: kp.pairAddress,
          tokenA: kp.tokenA as `0x${string}`,
          tokenB: kp.tokenB as `0x${string}`,
        }))}
        onSelectPool={handleSelectPool}
      />

      {selectedPair && (
        <>
          <AddLiquidity
            routerAddress={selectedPair as `0x${string}`}
            tokenA={tokenA as `0x${string}`}
            tokenB={tokenB as `0x${string}`}
          />

          <RemoveLiquidity
            tokenA={tokenA as `0x${string}`}
            tokenB={tokenB as `0x${string}`}
            pairAddress={selectedPair as `0x${string}`}
          />

          <Swap tokenIn={tokenA as `0x${string}`} tokenOut={tokenB as `0x${string}`} />

          <PoolAnalytics pairAddress={selectedPair as `0x${string}`} />

          <SwapPriceDistribution pairAddress={selectedPair as `0x${string}`} />
        </>
      )}
    </main>
  );
}
