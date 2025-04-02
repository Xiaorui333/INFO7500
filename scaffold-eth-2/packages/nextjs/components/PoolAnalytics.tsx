"use client";
import React, { useState, useEffect } from "react";
import { useReadContract } from "wagmi";
import pairAbi from "@/abis/UniswapV2Pair.json";
import { Chart } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

interface PoolAnalyticsProps {
  pairAddress: `0x${string}`;
}

function generateCurveData(r0: number, r1: number, points = 50) {
  // x * y = k constant
  const k = r0 * r1;
  const data = [];
  for (let i = 1; i <= points; i++) {
    const x = (r0 / points) * i;
    const y = k / x;
    data.push({ x, y });
  }
  return data;
}

export function PoolAnalytics({ pairAddress }: PoolAnalyticsProps) {
  // Remove generic parameter and assert that data is a tuple of three bigints.
  const { data: reservesData } = useReadContract({
    address: pairAddress,
    abi: pairAbi.abi,
    functionName: "getReserves",
  }) as { data: [bigint, bigint, bigint] | undefined };

  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    if (!reservesData) return;

    // Destructure the returned tuple: [reserve0, reserve1, blockTimestampLast]
    const [reserve0, reserve1] = reservesData;
    const reserve0Number = Number(reserve0);
    const reserve1Number = Number(reserve1);

    // Generate curve data from numerical values.
    const curvePoints = generateCurveData(reserve0Number, reserve1Number);

    setChartData({
      datasets: [
        {
          label: "x * y = k",
          data: curvePoints,
          showLine: true,
          borderColor: "#4e79a7",
        },
      ],
    });
  }, [reservesData]);

  if (!chartData) {
    return <div>Loading reserve curve…</div>;
  }

  return (
    <div style={{ width: "600px", height: "400px" }}>
      <h3>Pool Reserves Curve</h3>
      <Chart
        type="scatter"
        data={chartData}
        options={{
          scales: {
            x: {
              type: "linear",
              title: { display: true, text: "Token0" },
            },
            y: {
              type: "linear",
              title: { display: true, text: "Token1" },
            },
          },
        }}
      />
    </div>
  );
}
