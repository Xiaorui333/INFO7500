"use client";
import React, { useState } from "react";

interface PoolSelectorProps {
  pairs: { 
    label: string; 
    tokenA: `0x${string}`; 
    tokenB: `0x${string}`; 
    pairAddress: string 
  }[];
  onSelectPool: (tokenA: `0x${string}`, tokenB: `0x${string}`, pairAddress: string) => void;
}

export function PoolSelector({ pairs, onSelectPool }: PoolSelectorProps) {
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idx = Number(e.target.value);
    setSelectedIndex(idx);
    if (idx >= 0 && pairs[idx]) {
      onSelectPool(pairs[idx].tokenA, pairs[idx].tokenB, pairs[idx].pairAddress);
    }
  };

  // 如果没有有效的交易对数据，显示提示信息
  if (!pairs || pairs.length === 0 || !pairs[0]?.tokenA) {
    return (
      <div className="text-center p-4 text-red-500">
        Please configure pool addresses in environment variables
      </div>
    );
  }

  return (
    <div className="w-full">
      <select
        value={selectedIndex}
        onChange={handleChange}
        className="w-full p-2 border rounded bg-white dark:bg-gray-800"
      >
        <option value={-1}>-- Choose a pool --</option>
        {pairs.map((pair, index) => (
          pair && pair.tokenA && pair.tokenB ? (
            <option key={index} value={index}>
              {pair.label} ({pair.tokenA?.slice(0, 6)}/{pair.tokenB?.slice(0, 6)})
            </option>
          ) : null
        ))}
      </select>

      {selectedIndex >= 0 && pairs[selectedIndex] && (
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          <div>Selected Pool: {pairs[selectedIndex].pairAddress}</div>
          <div>Token A: {pairs[selectedIndex].tokenA}</div>
          <div>Token B: {pairs[selectedIndex].tokenB}</div>
        </div>
      )}
    </div>
  );
}