"use client";
import React, { useState, useEffect } from "react";
import { useWatchContractEvent, usePublicClient } from "wagmi";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js";

// 注册 Chart.js 组件
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// 自定义Pair ABI，匹配包含reserve0和reserve1的Swap事件
const CUSTOM_PAIR_ABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount0In",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount1In",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount0Out",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount1Out",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "reserve0",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "reserve1",
        "type": "uint256"
      }
    ],
    "name": "Swap",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "token0",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

interface SwapPriceDistributionProps {
  pairAddress: `0x${string}`;
}

/**
 * 工具函数：根据 Swap 事件的 4 个字段，计算执行价格
 * 如果 token0In & token1Out > 0，则 price = token1Out / token0In
 * 如果 token1In & token0Out > 0，则 price = token0Out / token1In
 */
function computeSwapPrice(args: {
  amount0In: bigint;
  amount1In: bigint;
  amount0Out: bigint;
  amount1Out: bigint;
  reserve0?: bigint;
  reserve1?: bigint;
}): number {
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
  const publicClient = usePublicClient();
  
  console.log("=== SwapPriceDistribution rendering ===");
  console.log("pairAddress:", pairAddress);
  console.log("publicClient available:", !!publicClient);
  console.log("publicClient chain:", publicClient?.chain?.name);
  console.log("publicClient transport:", publicClient?.transport?.type);

  // 获取历史Swap事件
  async function fetchPastSwapEvents() {
    if (!publicClient || !pairAddress) {
      console.error("Cannot fetch past events: publicClient or pairAddress missing");
      return;
    }
    
    try {
      console.log(`Fetching past swap events for pair: ${pairAddress} on chain ${publicClient.chain?.name || 'unknown'}`);
      console.log("Using custom ABI with reserve0/reserve1 in Swap event");
      
      // 检查合约是否存在
      try {
        const code = await publicClient.getBytecode({ address: pairAddress });
        console.log(`Contract code exists: ${!!code}`);
        if (!code || code === "0x") {
          console.error("Contract does not exist at address:", pairAddress);
          return;
        }
      } catch (codeError) {
        console.error("Error checking contract existence:", codeError);
        return;
      }
      
      // 尝试一个简单的调用来验证合约接口
      try {
        const token0 = await publicClient.readContract({
          address: pairAddress,
          abi: CUSTOM_PAIR_ABI,
          functionName: 'token0',
        });
        console.log("Contract verification - token0:", token0);
      } catch (readError) {
        console.error("Error verifying contract interface:", readError);
      }
      
      console.log("Creating event filter for Swap events with custom ABI...");
      const filter = await publicClient.createContractEventFilter({
        address: pairAddress,
        abi: CUSTOM_PAIR_ABI,
        eventName: 'Swap',
        fromBlock: BigInt(0), // 从创世区块开始
      });
      
      console.log("Event filter created:", filter);
      
      console.log("Fetching logs with filter...");
      const events = await publicClient.getFilterLogs({ filter });
      console.log(`Fetched ${events.length} past swap events`);
      
      if (events.length > 0) {
        console.log("Sample event:", events[0]);
        
        const newPrices = events.map(event => {
          // 某些事件可能没有解析出参数，我们需要类型断言并跳过这些情况
          if (!('args' in event)) {
            console.log("Event missing args property:", event);
            return 0;
          }
          
          // 类型安全地访问args
          const args = event.args as unknown as {
            amount0In: bigint;
            amount1In: bigint;
            amount0Out: bigint;
            amount1Out: bigint;
            reserve0: bigint;
            reserve1: bigint;
          };
          
          if (!args) {
            console.log("Args is null or undefined:", event);
            return 0;
          }
          
          console.log("Processing event args:", {
            amount0In: args.amount0In?.toString() || 'missing',
            amount1In: args.amount1In?.toString() || 'missing',
            amount0Out: args.amount0Out?.toString() || 'missing',
            amount1Out: args.amount1Out?.toString() || 'missing',
            reserve0: args.reserve0?.toString() || 'missing',
            reserve1: args.reserve1?.toString() || 'missing'
          });
          
          const price = computeSwapPrice(args);
          console.log("Computed price:", price);
          return price;
        }).filter(price => price > 0);
        
        console.log(`Computed ${newPrices.length} valid prices from ${events.length} events`);
        
        if (newPrices.length > 0) {
          console.log("Setting swap prices:", newPrices);
          setSwapPrices(prev => {
            const updated = [...prev, ...newPrices];
            console.log(`Updated swap prices: ${updated.length} items`);
            return updated;
          });
        }
      } else {
        console.log("No past swap events found");
      }
    } catch (error) {
      console.error("Error fetching past swap events:", error);
    }
  }

  // 组件加载时获取历史事件
  useEffect(() => {
    console.log("useEffect for fetchPastSwapEvents triggered");
    fetchPastSwapEvents();
  }, [pairAddress, publicClient]);

  // 同时监听新的Swap事件，使用自定义ABI
  useWatchContractEvent({
    address: pairAddress,
    abi: CUSTOM_PAIR_ABI,
    eventName: "Swap",
    onLogs: (logs) => {
      console.log(`Live Swap event detected! ${logs.length} logs received`);
      logs.forEach((log) => {
        console.log("Log details:", {
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
          logIndex: log.logIndex
        });
        
        const decodedArgs = (log as any).args;
        if (!decodedArgs) {
          console.error("Failed to decode args from log:", log);
          return;
        }
        
        console.log("Decoded args:", {
          amount0In: decodedArgs.amount0In?.toString() || 'missing',
          amount1In: decodedArgs.amount1In?.toString() || 'missing',
          amount0Out: decodedArgs.amount0Out?.toString() || 'missing',
          amount1Out: decodedArgs.amount1Out?.toString() || 'missing',
          reserve0: decodedArgs.reserve0?.toString() || 'missing',
          reserve1: decodedArgs.reserve1?.toString() || 'missing'
        });
        
        const price = computeSwapPrice(decodedArgs);
        console.log("Computed price from live event:", price);
        
        if (price > 0) {
          setSwapPrices(prev => {
            const updated = [...prev, price];
            console.log(`Updated swap prices after live event: ${updated.length} items`);
            return updated;
          });
        } else {
          console.warn("Skipping live event with invalid price (0 or negative)");
        }
      });
    },
    // Add these options to improve event detection
    poll: true,
    pollingInterval: 1000,
  });

  // We'll build a bar chart. For simplicity, let's bin integer prices (floor them).
  const [histData, setHistData] = useState<any>(null);

  useEffect(() => {
    console.log(`useEffect for histogram triggered with ${swapPrices.length} prices`);
    if (!swapPrices.length) {
      console.log("No swap prices available, clearing histogram data");
      setHistData(null);
      return;
    }
    
    console.log("Building frequency map...");
    // Build a frequency map
    const binCounts: Record<string, number> = {};
    swapPrices.forEach((price) => {
      // integer bin
      const bin = Math.floor(price).toString();
      binCounts[bin] = (binCounts[bin] || 0) + 1;
      console.log(`Price ${price} added to bin ${bin}, count now ${binCounts[bin]}`);
    });

    console.log("Frequency map built:", binCounts);
    
    // Convert map to array sorted by bin
    const distArray = Object.keys(binCounts)
      .map((binKey) => ({
        bin: binKey,
        count: binCounts[binKey],
      }))
      .sort((a, b) => parseInt(a.bin) - parseInt(b.bin));

    console.log("Distribution array prepared:", distArray);
    
    // Prepare data for chart.js
    const chartData = {
      labels: distArray.map((item) => item.bin),
      datasets: [
        {
          label: "Swap Execution Price",
          data: distArray.map((item) => item.count),
          backgroundColor: "#82ca9d",
        },
      ],
    };
    
    console.log("Setting histogram data:", chartData);
    setHistData(chartData);
  }, [swapPrices]);

  console.log("Before rendering - histData:", histData);
  console.log("Before rendering - swapPrices:", swapPrices);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-gray-500">Showing real-time swap execution prices</p>
      </div>
      {(!histData || !histData.labels.length) ? (
        <div className="text-center py-4">No swap events yet.</div>
      ) : (
        <div className="w-full h-[400px]">
          <Bar
            data={histData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                x: {
                  title: { display: true, text: "Price Bin (floored integer)" },
                },
                y: {
                  title: { display: true, text: "Swap Count" },
                  beginAtZero: true,
                },
              },
              plugins: {
                tooltip: {
                  callbacks: {
                    label: function(context) {
                      return `Count: ${context.raw}`;
                    }
                  }
                }
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
