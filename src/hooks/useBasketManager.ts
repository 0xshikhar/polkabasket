import { useCallback, useState } from "react";
import { createPublicClient, http, parseUnits, formatUnits } from "viem";
import {
  APP_CHAIN,
  APP_LEGACY_GAS_PRICE,
  APP_NATIVE_DECIMALS,
  APP_RPC_URL,
  BASKET_MANAGER_ADDRESS,
  BASKET_MANAGER_ABI,
} from "../config/contracts";

const publicClient = createPublicClient({
  chain: APP_CHAIN,
  transport: http(APP_RPC_URL),
});

async function assertContractDeployed(address: `0x${string}`) {
  const bytecode = await publicClient.getBytecode({ address });
  if (!bytecode || bytecode === "0x") {
    throw new Error(`BasketManager is not deployed on ${APP_CHAIN.name} (chainId ${APP_CHAIN.id}). Check your network/RPC and contract address.`);
  }
}

const XCM_PRECOMPILE_FALLBACK = "0x0000000000000000000000000000000000000800" as const;

async function waitForReceipt(hash: `0x${string}`, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const receipt = await publicClient.getTransactionReceipt({ hash });
      if (receipt.status === "reverted") {
        throw new Error("Transaction reverted on-chain");
      }
      return receipt;
    } catch (err) {
      if (err instanceof Error && err.message === "Transaction reverted on-chain") {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 2_000));
    }
  }
  throw new Error("Timed out waiting for transaction receipt");
}

function normalizeErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === "object" && err !== null) {
    const maybeShort = (err as { shortMessage?: string }).shortMessage;
    if (maybeShort) return maybeShort;
    const maybeMessage = (err as { message?: string }).message;
    if (maybeMessage) return maybeMessage;
  }
  return fallback;
}

async function assertBasketReady(basketId: bigint) {
  if (!BASKET_MANAGER_ADDRESS) throw new Error("BasketManager address not configured");
  await assertContractDeployed(BASKET_MANAGER_ADDRESS as `0x${string}`);

  const nextId = await publicClient.readContract({
    address: BASKET_MANAGER_ADDRESS,
    abi: BASKET_MANAGER_ABI,
    functionName: "nextBasketId",
  });

  if (basketId >= nextId) {
    throw new Error(`Basket ${basketId.toString()} does not exist. nextBasketId is ${nextId.toString()}.`);
  }

  const basket = await publicClient.readContract({
    address: BASKET_MANAGER_ADDRESS,
    abi: BASKET_MANAGER_ABI,
    functionName: "getBasket",
    args: [basketId],
  }) as unknown as Basket;

  if (!basket.active) {
    throw new Error(`Basket ${basketId.toString()} is not active.`);
  }
}

async function getXcmReadiness() {
  try {
    const xcmEnabled = await publicClient.readContract({
      address: BASKET_MANAGER_ADDRESS as `0x${string}`,
      abi: BASKET_MANAGER_ABI,
      functionName: "xcmEnabled",
    });
    const xcmAddress = await publicClient.readContract({
      address: BASKET_MANAGER_ADDRESS as `0x${string}`,
      abi: BASKET_MANAGER_ABI,
      functionName: "xcmPrecompile",
    });
    const bytecode = await publicClient.getBytecode({ address: xcmAddress as `0x${string}` });
    return {
      xcmEnabled: Boolean(xcmEnabled),
      xcmPrecompile: xcmAddress as `0x${string}`,
      hasCode: Boolean(bytecode && bytecode !== "0x"),
    };
  } catch {
    const bytecode = await publicClient.getBytecode({ address: XCM_PRECOMPILE_FALLBACK });
    return {
      xcmEnabled: undefined,
      xcmPrecompile: XCM_PRECOMPILE_FALLBACK as `0x${string}`,
      hasCode: Boolean(bytecode && bytecode !== "0x"),
    };
  }
}

async function writeLegacyContract(
  walletClient: unknown,
  request: Record<string, unknown>
): Promise<`0x${string}`> {
  const wc = walletClient as { writeContract: (params: unknown) => Promise<`0x${string}`> };
  const { maxFeePerGas, maxPriorityFeePerGas, ...legacyRequest } = request;
  return wc.writeContract({
    ...legacyRequest,
    type: "legacy",
    gasPrice: APP_LEGACY_GAS_PRICE,
  });
}

export interface Allocation {
  paraId: number;
  protocol: string;
  weightBps: number;
  depositCall: string;
  withdrawCall: string;
}

export interface Basket {
  id: bigint;
  name: string;
  token: string;
  allocations: Allocation[];
  totalDeposited: bigint;
  active: boolean;
}

export interface BasketInfo {
  basketId: bigint;
  name: string;
  symbol: string;
  token: string;
  totalDeposited: string;
  allocations: Array<{ paraId: number; chain: string; weight: number }>;
  active: boolean;
}

export function useBasketManager() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getNextBasketId = useCallback(async (): Promise<bigint> => {
    try {
      const result = await publicClient.readContract({
        address: BASKET_MANAGER_ADDRESS,
        abi: BASKET_MANAGER_ABI,
        functionName: "nextBasketId",
      });
      return result;
    } catch (err) {
      console.error("Error fetching nextBasketId:", err);
      return 0n;
    }
  }, []);

  const getBasket = useCallback(async (basketId: bigint): Promise<Basket | null> => {
    try {
      const result = await publicClient.readContract({
        address: BASKET_MANAGER_ADDRESS,
        abi: BASKET_MANAGER_ABI,
        functionName: "getBasket",
        args: [basketId],
      });
      return result as unknown as Basket;
    } catch (err) {
      console.error("Error fetching basket:", err);
      return null;
    }
  }, []);

  const getBasketInfo = useCallback(async (basketId: bigint): Promise<BasketInfo | null> => {
    try {
      const basket = await getBasket(basketId);
      if (!basket) return null;

      const chainNames: Record<number, string> = {
        2034: "Hydration LP",
        2004: "Moonbeam Lending",
        2000: "Acala Staking",
      };

      return {
        basketId: basket.id,
        name: basket.name,
        symbol: basket.name.replace(" Basket", "").toUpperCase(),
        token: basket.token,
        totalDeposited: formatUnits(basket.totalDeposited, APP_NATIVE_DECIMALS),
        allocations: basket.allocations.map((a) => ({
          paraId: Number(a.paraId),
          chain: chainNames[Number(a.paraId)] || `Para ${a.paraId}`,
          weight: Number(a.weightBps) / 100,
        })),
        active: basket.active,
      };
    } catch (err) {
      console.error("Error fetching basket info:", err);
      return null;
    }
  }, [getBasket]);

  const getBasketNAV = useCallback(async (basketId: bigint): Promise<bigint> => {
    try {
      const result = await publicClient.readContract({
        address: BASKET_MANAGER_ADDRESS,
        abi: BASKET_MANAGER_ABI,
        functionName: "getBasketNAV",
        args: [basketId],
      });
      return result;
    } catch (err) {
      console.error("Error fetching basket NAV:", err);
      return 0n;
    }
  }, []);

  const deposit = useCallback(async (walletClient: unknown, basketId: bigint, amountDOT: string | number) => {
    setIsLoading(true);
    setError(null);
    try {
      const wc = walletClient as { account?: { address: string }; writeContract: (params: unknown) => Promise<`0x${string}`> };
      const account = wc.account?.address as `0x${string}` | undefined;
      if (!account) {
        throw new Error("No account available");
      }
      await assertBasketReady(basketId);
      const normalizedAmount = typeof amountDOT === "number" ? amountDOT.toString() : amountDOT;
      const value = parseUnits(normalizedAmount, APP_NATIVE_DECIMALS);
      const { request } = await publicClient.simulateContract({
        address: BASKET_MANAGER_ADDRESS,
        abi: BASKET_MANAGER_ABI,
        functionName: "deposit",
        args: [basketId],
        value,
        gasPrice: APP_LEGACY_GAS_PRICE,
        chain: APP_CHAIN,
        account,
      });

      const hash = await writeLegacyContract(walletClient, request as Record<string, unknown>);
      await waitForReceipt(hash);
      return hash;
    } catch (err) {
      let errorMessage = normalizeErrorMessage(err, "Deposit failed");
      if (errorMessage.toLowerCase().includes("execution reverted")) {
        const readiness = await getXcmReadiness();
        if (readiness.xcmEnabled === true && !readiness.hasCode) {
          errorMessage = `Deposit reverted because XCM is enabled but precompile ${readiness.xcmPrecompile} has no code on ${APP_CHAIN.name}. Disable XCM as owner (setXCMEnabled(false)) or redeploy the latest BasketManager.`;
        } else if (readiness.xcmEnabled === undefined && !readiness.hasCode) {
          errorMessage = `Deposit reverted on-chain. XCM precompile ${readiness.xcmPrecompile} has no code on ${APP_CHAIN.name}; your deployed BasketManager likely still hard-requires XCM during deposit.`;
        }
      }
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const withdraw = useCallback(async (walletClient: unknown, basketId: bigint, tokenAmount: bigint) => {
    setIsLoading(true);
    setError(null);
    try {
      const wc = walletClient as { account?: { address: string }; writeContract: (params: unknown) => Promise<`0x${string}`> };
      const account = wc.account?.address as `0x${string}` | undefined;
      if (!account) {
        throw new Error("No account available");
      }
      await assertBasketReady(basketId);
      const { request } = await publicClient.simulateContract({
        address: BASKET_MANAGER_ADDRESS,
        abi: BASKET_MANAGER_ABI,
        functionName: "withdraw",
        args: [basketId, tokenAmount],
        gasPrice: APP_LEGACY_GAS_PRICE,
        chain: APP_CHAIN,
        account,
      });

      const hash = await writeLegacyContract(walletClient, request as Record<string, unknown>);
      await waitForReceipt(hash);
      return hash;
    } catch (err) {
      const errorMessage = normalizeErrorMessage(err, "Withdraw failed");
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const rebalance = useCallback(async (walletClient: unknown, basketId: bigint) => {
    setIsLoading(true);
    setError(null);
    try {
      const wc = walletClient as { account?: { address: string }; writeContract: (params: unknown) => Promise<`0x${string}`> };
      const account = wc.account?.address as `0x${string}` | undefined;
      if (!account) {
        throw new Error("No account available");
      }
      await assertBasketReady(basketId);
      const { request } = await publicClient.simulateContract({
        address: BASKET_MANAGER_ADDRESS,
        abi: BASKET_MANAGER_ABI,
        functionName: "rebalance",
        args: [basketId],
        gasPrice: APP_LEGACY_GAS_PRICE,
        chain: APP_CHAIN,
        account,
      });

      const hash = await writeLegacyContract(walletClient, request as Record<string, unknown>);
      await waitForReceipt(hash);
      return hash;
    } catch (err) {
      const errorMessage = normalizeErrorMessage(err, "Rebalance failed");
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    getBasket,
    getBasketInfo,
    getBasketNAV,
    getNextBasketId,
    deposit,
    withdraw,
    rebalance,
    isLoading,
    error,
    isConfigured: Boolean(BASKET_MANAGER_ADDRESS),
  };
}
