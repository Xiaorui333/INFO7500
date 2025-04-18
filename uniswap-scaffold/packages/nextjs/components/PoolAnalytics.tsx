"use client";
import React, { useState, useEffect, useRef } from "react";
import { useReadContract } from "wagmi";
import pairAbi from "~~/abis/UniswapV2Pair.json";
import { Chart } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  LineController,
  ScatterController,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  LineController,
  ScatterController,
  Tooltip,
  Legend
);

interface PoolAnalyticsProps {
  pairAddress: `0x${string}`;
  token0Symbol?: string;
  token1Symbol?: string;
}

interface Point {
  x: number;
  y: number;
}

function generateCurveData(k: number, r0: number, points = 50): Point[] {
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
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: reservesData, refetch } = useReadContract({
    address: pairAddress,
    abi: pairAbi.abi,
    functionName: "getReserves",
  }) as { data: [bigint, bigint, bigint] | undefined, refetch: () => void };

  const [chartData, setChartData] = useState<any>(null);
  const previousPointRef = useRef<Point | null>(null);
  const previousCurveRef = useRef<{ k: number } | null>(null);
  
  // Function to detect if the operation was a swap or liquidity change
  const detectOperationType = (currentK: number, previousK: number | null): 'swap' | 'liquidity' => {
    if (!previousK) return 'swap'; // First data point
    
    // If k value changed by more than 0.1%, consider it a liquidity operation
    const kDiffPercentage = Math.abs(currentK - previousK) / previousK * 100;
    return kDiffPercentage > 0.1 ? 'liquidity' : 'swap';
  };

  // Function to manually refresh the data
  const handleRefresh = async () => {
    console.log("Refreshing pool data...");
    await refetch();
    setRefreshKey(prev => prev + 1);
  };

  useEffect(() => {
    if (!reservesData) return;

    console.log("Reserves data updated:", reservesData);

    // Destructure the returned tuple: [reserve0, reserve1, blockTimestampLast]
    const [reserve0, reserve1] = reservesData;
    const reserve0Number = Number(reserve0);
    const reserve1Number = Number(reserve1);

    console.log(`Current reserves: ${reserve0Number}, ${reserve1Number}`);
    const currentK = reserve0Number * reserve1Number;
    const operationType = detectOperationType(currentK, previousCurveRef.current?.k || null);

    // Generate curve data based on operation type
    const curvePoints = operationType === 'swap' && previousCurveRef.current
      ? generateCurveData(previousCurveRef.current.k, reserve0Number)
      : generateCurveData(currentK, reserve0Number);

    // Create current point P
    const currentPoint = {
      x: reserve0Number,
      y: reserve1Number,
    };

    // Create trajectory line if we have a previous point
    const trajectoryLine = previousPointRef.current
      ? [previousPointRef.current, currentPoint]
      : [];

    const currentCurve = { k: currentK };

    setChartData({
      datasets: [
        {
          label: "x * y = k",
          data: curvePoints,
          showLine: true,
          borderColor: "#4e79a7",
          backgroundColor: "rgba(78, 121, 167, 0.1)",
          fill: false,
          tension: 0.3,
          pointRadius: 0,
          borderWidth: 2,
        },
        {
          label: "Movement Trajectory",
          data: trajectoryLine,
          showLine: true,
          borderColor: "#95a5a6",
          borderDash: [5, 5],
          pointRadius: 0,
          borderWidth: 1.5,
        },
        {
          label: "Current Point (P)",
          data: [currentPoint],
          pointRadius: 6,
          pointBackgroundColor: "#e74c3c",
          pointBorderColor: "white",
          pointBorderWidth: 1.5,
          showLine: false,
        },
      ],
    });

    // Update previous point and curve for next render
    previousPointRef.current = currentPoint;
    previousCurveRef.current = currentCurve;
  }, [reservesData, refreshKey]);

  if (!chartData) {
    return <div className="text-center py-4">Loading reserve curve…</div>;
  }

  const currentPoint = previousPointRef.current;
  const currentCurve = previousCurveRef.current;
  const previousCurve = previousCurveRef.current;
  const formatNumber = (num: number) => {
    if (num > 1_000_000_000_000) {
      return num.toExponential(2);
    }
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="flex flex-col gap-3 bg-base-100 rounded-lg">
      {/* Equation and Reserves Section */}
      <div className="flex flex-col gap-3 pb-3">
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <span className="text-sm font-medium mr-2">Constant Product Equation:</span>
              <span className="text-sm font-normal">x * y = k</span>
            </div>
            <button 
              className="btn btn-sm btn-outline" 
              onClick={handleRefresh}
              title="Refresh pool data"
            >
              Refresh
            </button>
          </div>
          
          {currentPoint && (
            <>
              <h4 className="text-sm font-medium mb-2">Current Reserves:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                <div className="flex flex-col p-2 bg-base-200 rounded">
                  <span className="text-xs text-base-content/70">{token0Symbol}:</span>
                  <span className="font-mono text-xs">{formatNumber(currentPoint.x)}</span>
                </div>
                <div className="flex flex-col p-2 bg-base-200 rounded">
                  <span className="text-xs text-base-content/70">{token1Symbol}:</span>
                  <span className="font-mono text-xs">{formatNumber(currentPoint.y)}</span>
                </div>
              </div>
              
              {previousCurve && currentCurve && (
                <div className="mt-1 p-2 bg-base-200 rounded">
                  <p className="text-xs">
                    <span className="font-medium">k value:</span> {formatNumber(currentCurve.k)}
                    {previousCurve.k !== currentCurve.k && (
                      <span className="text-xs ml-2 opacity-70">
                        (changed from {formatNumber(previousCurve.k)})
                      </span>
                    )}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Chart Section */}
      <div className="w-full h-[350px]">
        <Chart
          type="line"
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: {
                type: "linear",
                title: { 
                  display: true,
                  text: `${token0Symbol} Reserves`,
                  font: {
                    size: 11
                  }
                },
                min: 0,
              },
              y: {
                type: "linear",
                title: { 
                  display: true,
                  text: `${token1Symbol} Reserves`,
                  font: {
                    size: 11
                  }
                },
                min: 0,
              },
            },
            elements: {
              line: {
                tension: 0.3
              }
            },
            plugins: {
              legend: {
                position: 'top',
                labels: {
                  boxWidth: 12,
                  padding: 10,
                  font: {
                    size: 10
                  }
                }
              },
              tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                titleColor: '#fff',
                bodyColor: '#fff',
                padding: 6,
                bodyFont: {
                  size: 11
                },
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
