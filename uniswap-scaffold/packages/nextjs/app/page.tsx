"use client";
import React, { useState } from "react";
import { PoolSelector } from "~~/components/PoolSelector";
import { ApproveToken } from "~~/components/ApproveToken";
import { AddLiquidity } from "~~/components/addLiquidity";
import { RemoveLiquidity } from "~~/components/removeLiquidity";
import { Swap } from "~~/components/Swap";
import { PoolAnalytics } from "~~/components/PoolAnalytics";
import { SwapPriceDistribution } from "~~/components/SwapPriceDistribution";

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
    console.log("[HomePage] Pool Selected:", { selectedTokenA, selectedTokenB, pairAddress });
    setSelectedPair(pairAddress);
    setTokenA(selectedTokenA);
    setTokenB(selectedTokenB);
  };

  // Log selectedPair whenever it changes or before rendering operations
  console.log("[HomePage] Current selectedPair state:", selectedPair);

  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-4xl">
        {/* Pool Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Select Pool</h2>
          <PoolSelector pairs={knownPairs} onSelectPool={handleSelectPool} />
        </div>

        {/* Pool Operations */}
        {(() => {
            console.log(`[HomePage] Rendering Pool Operations section. selectedPair: ${selectedPair}`);
            return selectedPair && (
              <div className="mt-8">
                {/* Token Approvals */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
                  <h2 className="text-2xl font-bold mb-4">Token Approvals</h2>
                  <p className="mb-4">Please approve the router to spend your tokens.</p>
                  <div className="flex gap-4 flex-wrap">
                    <ApproveToken tokenAddress={tokenA} label="Approve Token A" />
                    <ApproveToken tokenAddress={tokenB} label="Approve Token B" />
                  </div>
                </div>

                {/* Pool Operations */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
                  <h2 className="text-2xl font-bold mb-4">Pool Operations</h2>
                  <AddLiquidity
                    routerAddress={process.env.NEXT_PUBLIC_UNISWAPV2_ROUTER02_ADDRESS as EthAddress}
                    tokenA={tokenA}
                    tokenB={tokenB}
                  />
                  <RemoveLiquidity 
                    pairAddress={selectedPair as EthAddress} 
                    tokenA={tokenA} 
                    tokenB={tokenB} 
                  />
                  <Swap tokenIn={tokenA} tokenOut={tokenB} />
                </div>

                {/* Pool Analytics */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <h2 className="text-2xl font-bold mb-4">Pool Analytics</h2>
                  <PoolAnalytics pairAddress={selectedPair as EthAddress} />
                  <SwapPriceDistribution pairAddress={selectedPair as EthAddress} />
                </div>
              </div>
            );
        })()}
      </div>
    </div>
  );
}
