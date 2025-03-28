import { sepolia } from "viem/chains";
import { CurrencyAmount, Token } from "@uniswap/sdk-core";
import { Pair, Route } from "@uniswap/v2-sdk";
import { Address, createPublicClient, fallback, http, parseAbi } from "viem";

// Load addresses from environment variables
const WETH9_ADDRESS = process.env.NEXT_PUBLIC_WETH9_ADDRESS as `0x${string}`;
const TOKENA_ADDRESS = process.env.NEXT_PUBLIC_TOKENA_ADDRESS as `0x${string}`;
const TOKENB_ADDRESS = process.env.NEXT_PUBLIC_TOKENB_ADDRESS as `0x${string}`;
const PAIR_ADDRESS = process.env.NEXT_PUBLIC_TOKENA_TOKENB_PAIR as `0x${string}`;

// Create a public client for Sepolia using your Sepolia RPC URL
const sepoliaRpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;
const publicClient = createPublicClient({
  chain: sepolia,
  transport: fallback([http(sepoliaRpcUrl)]),
});

// Minimal ABI for Uniswap V2 Pair functions
const PAIR_ABI = parseAbi([
  "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function token0() external view returns (address)",
  "function token1() external view returns (address)",
]);

export const fetchPriceFromUniswap = async (): Promise<number> => {
  try {
    // Create Token instances for TOKENA and TOKENB
    // Use chainId 11155111 for Sepolia and assume 18 decimals for both tokens
    const tokenA = new Token(11155111, TOKENA_ADDRESS, 18, "TKA", "Token A");
    const tokenB = new Token(11155111, TOKENB_ADDRESS, 18, "TKB", "Token B");

    // Fetch reserves from the provided pair address
    const reserves = await publicClient.readContract({
      address: PAIR_ADDRESS,
      abi: PAIR_ABI,
      functionName: "getReserves",
    });

    // Fetch token ordering from the pair
    const token0Address = (await publicClient.readContract({
      address: PAIR_ADDRESS,
      abi: PAIR_ABI,
      functionName: "token0",
    })) as string;

    const token1Address = (await publicClient.readContract({
      address: PAIR_ADDRESS,
      abi: PAIR_ABI,
      functionName: "token1",
    })) as string;

    // Identify which token is token0 and token1 by comparing addresses (ignore case)
    const token0 = [tokenA, tokenB].find(
      token => token.address.toLowerCase() === token0Address.toLowerCase()
    );
    const token1 = [tokenA, tokenB].find(
      token => token.address.toLowerCase() === token1Address.toLowerCase()
    );

    if (!token0 || !token1) {
      throw new Error("Token addresses in pair do not match provided tokens.");
    }

    // Build a Pair instance using the fetched reserves
    const pair = new Pair(
      CurrencyAmount.fromRawAmount(token0, reserves[0].toString()),
      CurrencyAmount.fromRawAmount(token1, reserves[1].toString())
    );

    // Build a route from tokenA to tokenB (price of tokenA in terms of tokenB)
    const route = new Route([pair], tokenA, tokenB);
    const price = parseFloat(route.midPrice.toSignificant(6));
    return price;
  } catch (error) {
    console.error("Error fetching price on Sepolia:", error);
    return 0;
  }
};
