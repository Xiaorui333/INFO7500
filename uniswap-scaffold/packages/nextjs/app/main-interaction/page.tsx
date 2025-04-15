"use client";
import React from "react";
import { SwapNLI } from "~~/components/SwapNLI";
import { TaskEvaluation } from "~~/components/TaskEvaluation";

export default function MainInteractionPage() {
  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Main Interaction Page</h1>

        {/* Natural Language Swap */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Natural Language Swap</h2>
          <SwapNLI
            routerAddress={process.env.NEXT_PUBLIC_UNISWAPV2_ROUTER02_ADDRESS as `0x${string}`}
            tokenA={process.env.NEXT_PUBLIC_TOKENA_ADDRESS as `0x${string}`}
            tokenB={process.env.NEXT_PUBLIC_TOKENB_ADDRESS as `0x${string}`}
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