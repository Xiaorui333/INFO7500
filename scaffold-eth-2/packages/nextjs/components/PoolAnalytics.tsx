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
  // x * y = k
  const k = r0 * r1;
  const data = [];
  for (let i = 1; i <= points; i++) {
    const x = (r0 / points) * i; // from ~0 -> r0
    const y = k / x;
    data.push({ x, y });
  }
  return data;
}

export function PoolAnalytics({ pairAddress }: PoolAnalyticsProps) {
  const { data: reservesData } = useReadContract({
    address: pairAddress,
    abi: pairAbi.abi, // Must include getReserves in the ABI
    functionName: "getReserves",
    watch: true, // automatically re-fetch if chain updates
  });

  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    if (!reservesData) return;

    // getReserves returns [reserve0, reserve1, blockTimestampLast]
    const reserve0 = Number(reservesData[0]);
    const reserve1 = Number(reservesData[1]);

    // Build data points for x*y=k
    const curvePoints = generateCurveData(reserve0, reserve1);

    setChartData({
      datasets: [
        {
          label: "x * y = k",
          data: curvePoints.map((p) => ({ x: p.x, y: p.y })),
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
