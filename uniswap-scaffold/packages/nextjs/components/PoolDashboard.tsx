"use client";
import React from "react";
import { PoolAnalytics } from "./PoolAnalytics";
import { SwapPriceDistribution } from "./SwapPriceDistribution";

interface PoolDashboardProps {
  pairAddress: `0x${string}`;
  token0Symbol?: string;
  token1Symbol?: string;
}

export function PoolDashboard({ pairAddress, token0Symbol = "Token0", token1Symbol = "Token1" }: PoolDashboardProps) {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold">Pool Analytics</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title">Reserves Curve</h3>
              <PoolAnalytics 
                pairAddress={pairAddress} 
                token0Symbol={token0Symbol}
                token1Symbol={token1Symbol}
              />
            </div>
          </div>
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title">Swap Price Distribution</h3>
              <SwapPriceDistribution pairAddress={pairAddress} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 