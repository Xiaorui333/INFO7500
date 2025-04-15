"use client";
import React from "react";
import { UnifiedNLI } from "~~/components/UnifiedNLI";
import { TaskEvaluation } from "~~/components/TaskEvaluation";

export default function MainInteractionPage() {
  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Main Interaction Page</h1>

        {/* Natural Language Interface for Uniswap Operations */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Natural Language Interface</h2>
          <UnifiedNLI
            routerAddress={process.env.NEXT_PUBLIC_UNISWAPV2_ROUTER02_ADDRESS as `0x${string}`}
            tokenA={process.env.NEXT_PUBLIC_TOKENA_ADDRESS as `0x${string}`}
            tokenB={process.env.NEXT_PUBLIC_TOKENB_ADDRESS as `0x${string}`}
            pairAddress={process.env.NEXT_PUBLIC_TOKENA_TOKENB_PAIR as `0x${string}`}
          />
        </div>

        {/* Task Evaluation */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4">Task Evaluation</h2>
          <TaskEvaluation />
        </div>
      </div>
    </div>
  );
} 