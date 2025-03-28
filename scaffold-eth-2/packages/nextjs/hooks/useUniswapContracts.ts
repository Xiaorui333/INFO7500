import { useContract } from "wagmi";
import factoryAbi from "../abis/UniswapV2Factory.json";
import pairAbi from "../abis/UniswapV2Pair.json";

export function useUniswapFactory() {
  const factory = useContract({
    address: process.env.NEXT_PUBLIC_UNISWAPV2_FACTORY_ADDRESS as `0x${string}`,
    abi: factoryAbi,
  });
  return factory;
}

export function useUniswapPair() {
  const pair = useContract({
    address: process.env.NEXT_PUBLIC_UNISWAPV2_PAIR_ADDRESS as `0x${string}`,
    abi: pairAbi,
  });
  return pair;
}
