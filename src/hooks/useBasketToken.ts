import { useCallback } from "react";
import { createPublicClient, http } from "viem";
import { polkadotHubTestnet, BASKET_TOKEN_ABI } from "../config/contracts";

const publicClient = createPublicClient({
  chain: polkadotHubTestnet,
  transport: http("https://westend-asset-hub-eth-rpc.polkadot.io"),
});

export interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
}

export function useBasketToken(tokenAddress: `0x${string}` | null) {
  const getTokenInfo = useCallback(async (): Promise<TokenInfo | null> => {
    if (!tokenAddress) return null;
    try {
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        publicClient.readContract({
          address: tokenAddress,
          abi: BASKET_TOKEN_ABI,
          functionName: "name",
        }),
        publicClient.readContract({
          address: tokenAddress,
          abi: BASKET_TOKEN_ABI,
          functionName: "symbol",
        }),
        publicClient.readContract({
          address: tokenAddress,
          abi: BASKET_TOKEN_ABI,
          functionName: "decimals",
        }),
        publicClient.readContract({
          address: tokenAddress,
          abi: BASKET_TOKEN_ABI,
          functionName: "totalSupply",
        }),
      ]);
      return { name, symbol, decimals, totalSupply };
    } catch (err) {
      console.error("Error fetching token info:", err);
      return null;
    }
  }, [tokenAddress]);

  const getBalance = useCallback(async (address: `0x${string}`): Promise<bigint> => {
    if (!tokenAddress) return 0n;
    try {
      const balance = await publicClient.readContract({
        address: tokenAddress,
        abi: BASKET_TOKEN_ABI,
        functionName: "balanceOf",
        args: [address],
      });
      return balance;
    } catch (err) {
      console.error("Error fetching balance:", err);
      return 0n;
    }
  }, [tokenAddress]);

  const getAllowance = useCallback(async (
    owner: `0x${string}`,
    spender: `0x${string}`
  ): Promise<bigint> => {
    if (!tokenAddress) return 0n;
    try {
      const allowance = await publicClient.readContract({
        address: tokenAddress,
        abi: BASKET_TOKEN_ABI,
        functionName: "allowance",
        args: [owner, spender],
      });
      return allowance;
    } catch (err) {
      console.error("Error fetching allowance:", err);
      return 0n;
    }
  }, [tokenAddress]);

  return {
    getTokenInfo,
    getBalance,
    getAllowance,
  };
}
