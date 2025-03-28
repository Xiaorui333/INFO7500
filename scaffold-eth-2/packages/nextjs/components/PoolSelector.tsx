"use client";
import React, { useState } from "react";

interface PoolSelectorProps {
  pairs: { label: string; tokenA: `0x${string}`; tokenB: `0x${string}`; pairAddress: string }[];
  onSelectPool: (tokenA: `0x${string}`, tokenB: `0x${string}`, pairAddress: string) => void;
}

export function PoolSelector({ pairs, onSelectPool }: PoolSelectorProps) {
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idx = Number(e.target.value);
    setSelectedIndex(idx);
    if (idx >= 0) {
      onSelectPool(pairs[idx].tokenA, pairs[idx].tokenB, pairs[idx].pairAddress);
    }
  };

  return (
    <div style={{ marginBottom: "1rem" }}>
      <h2>Select a Pool</h2>
      <select
        value={selectedIndex}
        onChange={handleChange}
        style={{ padding: "0.5rem", fontSize: "1rem" }}
      >
        <option value={-1}>-- Choose a pool --</option>
        {pairs.map((pair, index) => (
          <option key={index} value={index}>
            {pair.label} ({pair.tokenA.slice(0, 6)}/{pair.tokenB.slice(0, 6)})
          </option>
        ))}
      </select>
    </div>
  );
}
