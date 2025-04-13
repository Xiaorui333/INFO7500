import { useContractRead } from "wagmi";
import factoryArtifact from "../abis/UniswapV2Factory.json";
import pairArtifact from "../abis/UniswapV2Pair.json";

// Helper function to extract the ABI from an artifact.
function getAbi(artifact: any) {
  return artifact.abi ?? artifact;
}

export function useUniswapFactoryRead(functionName: string, args: any[] = []) {
  return useContractRead({
    address: process.env.NEXT_PUBLIC_UNISWAPV2_FACTORY_ADDRESS as `0x${string}`,
    abi: getAbi(factoryArtifact),
    functionName,
    args,
  });
}

export function useUniswapPairRead(functionName: string, args: any[] = []) {
  return useContractRead({
    address: process.env.NEXT_PUBLIC_TOKENA_TOKENB_PAIR as `0x${string}`,
    abi: getAbi(pairArtifact),
    functionName,
    args,
  });
}