"use client";
import React, { useState, useEffect } from "react";
import { useWatchContractEvent } from "wagmi";
import pairAbi from "@/abis/UniswapV2Pair.json";
import { Chart } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface SwapPriceDistributionProps {
  pairAddress: `0x${string}`;
}

/**
 * Compute a "price" from the Swap event.
 * If token0 was swapped in for token1, price = amount1Out / amount0In
 * If token1 was swapped in for token0, price = amount0Out / amount1In
 */
function computeSwapPrice(args: any): number {
  const amount0In = Number(args.amount0In);
  const amount1In = Number(args.amount1In);
  const amount0Out = Number(args.amount0Out);
  const amount1Out = Number(args.amount1Out);

  if (amount0In > 0 && amount1Out > 0) {
    return amount1Out / amount0In;
  }
  if (amount1In > 0 && amount0Out > 0) {
    return amount0Out / amount1In;
  }
  return 0;
}

export function SwapPriceDistribution({ pairAddress }: SwapPriceDistributionProps) {
  const [swapPrices, setSwapPrices] = useState<number[]>([]);

  // Listen for "Swap" events
  useWatchContractEvent({
    address: pairAddress,
    abi: pairAbi.abi, // must have "Swap" event
    eventName: "Swap",
    onLogs: (logs) => {
      logs.forEach((log) => {
        const decodedArgs = (log as any).args;
        if (decodedArgs) {
          const price = computeSwapPrice(decodedArgs);
          if (price > 0) {
            setSwapPrices((prev) => [...prev, price]);
          }
        }
      });
    },
  });

  // We'll build a bar chart. For simplicity, let's bin integer prices (floor them).
  const [histData, setHistData] = useState<any>(null);

  useEffect(() => {
    if (!swapPrices.length) {
      setHistData(null);
      return;
    }
    // Build a frequency map
    const binCounts: Record<string, number> = {};
    swapPrices.forEach((price) => {
      // integer bin
      const bin = Math.floor(price).toString();
      binCounts[bin] = (binCounts[bin] || 0) + 1;
    });

    // Convert map to array sorted by bin
    const distArray = Object.keys(binCounts)
      .map((binKey) => ({
        bin: binKey,
        count: binCounts[binKey],
      }))
      .sort((a, b) => parseInt(a.bin) - parseInt(b.bin));

    // Prepare data for chart.js
    setHistData({
      labels: distArray.map((item) => item.bin),
      datasets: [
        {
          label: "Swap Execution Price",
          data: distArray.map((item) => item.count),
          backgroundColor: "#82ca9d",
        },
      ],
    });
  }, [swapPrices]);

  return (
    <div style={{ border: "1px solid #ddd", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>
      <h3>Swap Price Distribution (Past Swaps)</h3>
      {(!histData || !histData.labels.length) ? (
        <p>No swap events yet.</p>
      ) : (
        <div style={{ width: "600px", height: "400px" }}>
          <Chart
            type="bar"
            data={histData}
            options={{
              scales: {
                x: {
                  title: { display: true, text: "Price Bin (floored integer)" },
                },
                y: {
                  title: { display: true, text: "Swap Count" },
                  beginAtZero: true,
                },
              },
            }}
          />
        </div>
      )}
    </div>
  );
}
