"use client";
import React, { useState, useEffect, useRef } from "react";
import { useReadContract } from "wagmi";
import pairAbi from "~~/abis/UniswapV2Pair.json";
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
  token0Symbol?: string;
  token1Symbol?: string;
}

interface Point {
  x: number;
  y: number;
}

function generateCurveData(r0: number, r1: number, points = 50): Point[] {
  // x * y = k constant
  const k = r0 * r1;
  const data: Point[] = [];
  
  // Generate points around the current reserves
  const minX = r0 * 0.5; // Start from 50% of current reserve
  const maxX = r0 * 1.5; // Go up to 150% of current reserve
  
  for (let i = 0; i <= points; i++) {
    const x = minX + (maxX - minX) * (i / points);
    const y = k / x;
    data.push({ x, y });
  }
  return data;
}

export function PoolAnalytics({ pairAddress, token0Symbol = "Token0", token1Symbol = "Token1" }: PoolAnalyticsProps) {
  const { data: reservesData } = useReadContract({
    address: pairAddress,
    abi: pairAbi.abi,
    functionName: "getReserves",
  }) as { data: [bigint, bigint, bigint] | undefined };

  const [chartData, setChartData] = useState<any>(null);
  const previousPointRef = useRef<Point | null>(null);
  const previousCurveRef = useRef<{ k: number } | null>(null);

  useEffect(() => {
    if (!reservesData) return;

    // Destructure the returned tuple: [reserve0, reserve1, blockTimestampLast]
    const [reserve0, reserve1] = reservesData;
    const reserve0Number = Number(reserve0);
    const reserve1Number = Number(reserve1);

    // Generate curve data from numerical values
    const curvePoints = generateCurveData(reserve0Number, reserve1Number);

    // Create current point P
    const currentPoint = {
      x: reserve0Number,
      y: reserve1Number,
    };

    // Create trajectory line if we have a previous point
    const trajectoryLine = previousPointRef.current
      ? [previousPointRef.current, currentPoint]
      : [];

    const currentCurve = { k: reserve0Number * reserve1Number };
    const previousCurve = previousCurveRef.current;

    setChartData({
      datasets: [
        {
          label: "x * y = k",
          data: curvePoints,
          showLine: true,
          borderColor: "#4e79a7",
          pointRadius: 0, // Hide points on the curve
        },
        {
          label: "Movement Trajectory",
          data: trajectoryLine,
          showLine: true,
          borderColor: "#95a5a6",
          borderDash: [5, 5], // Dotted line
          pointRadius: 0,
        },
        {
          label: "Current Point (P)",
          data: [currentPoint],
          pointRadius: 8,
          pointBackgroundColor: "#e74c3c",
          showLine: false,
        },
      ],
    });

    // Update previous point and curve for next render
    previousPointRef.current = currentPoint;
    previousCurveRef.current = currentCurve;
  }, [reservesData]);

  if (!chartData) {
    return <div className="text-center py-4">Loading reserve curve…</div>;
  }

  const currentPoint = previousPointRef.current;
  const currentCurve = previousCurveRef.current;
  const previousCurve = previousCurveRef.current;
  const formatNumber = (num: number) => {
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-gray-500">Equation: x * y = k</p>
        {currentPoint && (
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">Current reserves:</p>
            <div className="flex flex-col gap-1 pl-4">
              <p className="text-sm">
                {token0Symbol}: <span className="font-mono">{formatNumber(currentPoint.x)}</span>
              </p>
              <p className="text-sm">
                {token1Symbol}: <span className="font-mono">{formatNumber(currentPoint.y)}</span>
              </p>
            </div>
            {previousCurve && currentCurve && (
              <p className="text-sm text-gray-500 mt-2">
                k changed from <span className="font-mono">{formatNumber(previousCurve.k)}</span> to{" "}
                <span className="font-mono">{formatNumber(currentCurve.k)}</span>
              </p>
            )}
          </div>
        )}
      </div>
      <div className="w-full h-[400px]">
        <Chart
          type="scatter"
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: {
                type: "linear",
                title: { display: true, text: `${token0Symbol} Reserves` },
                min: 0,
              },
              y: {
                type: "linear",
                title: { display: true, text: `${token1Symbol} Reserves` },
                min: 0,
              },
            },
            plugins: {
              tooltip: {
                callbacks: {
                  label: function(context) {
                    const point = context.raw as Point;
                    return `${token0Symbol}: ${formatNumber(point.x)}, ${token1Symbol}: ${formatNumber(point.y)}`;
                  }
                }
              }
            }
          }}
        />
      </div>
    </div>
  );
}
