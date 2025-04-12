import { useContractRead, useContractReads } from "wagmi";
import { UNISWAP_FACTORY_ABI } from "../abis/UniswapV2Factory";
import { UNISWAP_FACTORY_ADDRESS } from "../constants/addresses";
import { useState, useEffect } from "react";

export function useAllPairs() {
  const [allPairs, setAllPairs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get the total number of pairs
  const { data: pairsLength, error: lengthError } = useContractRead({
    address: UNISWAP_FACTORY_ADDRESS,
    abi: UNISWAP_FACTORY_ABI,
    functionName: "allPairsLength",
  });

  console.log("Pairs Length:", pairsLength);
  if (lengthError) {
    console.error("Error fetching pairs length:", lengthError);
  }

  // Prepare contract calls for all pairs
  const contractCalls = pairsLength
    ? Array.from({ length: Number(pairsLength) }, (_, i) => ({
        address: UNISWAP_FACTORY_ADDRESS,
        abi: UNISWAP_FACTORY_ABI,
        functionName: "allPairs",
        args: [BigInt(i)],
      }))
    : [];

  console.log("Contract Calls:", contractCalls);

  // Get all pairs at once
  const { data: pairsData, error: pairsError } = useContractReads({
    contracts: contractCalls,
  });

  if (pairsError) {
    console.error("Error fetching pairs:", pairsError);
  }

  // Update state when pairs data is available
  useEffect(() => {
    if (pairsData) {
      console.log("Raw pairs data:", pairsData);
      const pairs = pairsData
        .map((pair, index) => {
          if (!pair.result) {
            console.warn(`No result for pair at index ${index}`);
            return null;
          }
          const address = String(pair.result).toLowerCase();
          console.log(`Pair ${index}:`, address);
          return address;
        })
        .filter((address): address is string => address !== null);
      console.log("Processed pairs:", pairs);
      setAllPairs(pairs);
      setIsLoading(false);
    }
  }, [pairsData]);

  return { allPairs, isLoading };
} 