import { useCallback, useState } from "react";
import { createPublicClient, http, parseUnits, formatUnits } from "viem";
import {
  APP_CHAIN,
  APP_LEGACY_GAS_PRICE,
  APP_NATIVE_DECIMALS,
  APP_RPC_URL,
  BASKET_MANAGER_ADDRESS,
  BASKET_MANAGER_ABI,
  IS_TESTNET_XCM,
  DEFAULT_CHAINS,
} from "../config/contracts";
import {
  simulateXCMEvents,
  simulateXCMWithdrawEvents,
} from "../services/xcmSimulation";

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

// XCM Event topic hashes (keccak256 of event signatures)
const EVENT_TOPICS = {
  // XCMMessageSent(uint32 indexed paraId, bytes32 indexed messageHash, uint256 amount)
  XCMMessageSent: "0x629ed2ee510cb8ee1b03fe5c7d738ff856411d8f43099301f84789088254f17f",
  // XCMMessageFailed(uint32 indexed paraId, string reason)
  XCMMessageFailed: "0xd08ecae49834816c342f1d13c001844a8178767b931af94a603f8a64ce7f1a45",
  // DeploymentDispatched(uint256 indexed basketId, uint32 paraId, uint256 amount)
  DeploymentDispatched: "0x2a714abd697b83e14df66ce02bcadcab42e9d2305e12d5abf7b61656dfa689eb",
  // DeploymentFailed(uint256 indexed basketId, uint32 paraId, uint256 amount, string reason)
  DeploymentFailed: "0xed21e79921f361289f658defd542daf27748d63bfc4e5db793f0a4a8bfac64e0",
  // Deposited(uint256 indexed basketId, address indexed user, uint256 amount, uint256 tokensMinted)
  Deposited: "0xad5b4075b97dbf75ad5c78f7afac948e4ae611c4fdf2825e2ce3c6c96925bf3b",
  // Transfer(address indexed from, address indexed to, uint256 value) - ERC20
  Transfer: "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
} as const;

export interface XCMEvent {
  type: "sent" | "failed" | "deployment_dispatched" | "deployment_failed" | "deposited" | "transfer";
  paraId?: number;
  basketId?: bigint;
  messageHash?: string;
  amount?: bigint;
  reason?: string;
  user?: string;
  tokensMinted?: bigint;
}

function parseXCMEvents(receipt: { logs: Array<{ topics: string[]; data: string; address: string }> }): XCMEvent[] {
  const events: XCMEvent[] = [];
  
  console.log("[parseXCMEvents] 🔍 Parsing", receipt.logs?.length || 0, "logs");
  console.log("[parseXCMEvents] 🔍 BasketManager:", BASKET_MANAGER_ADDRESS);
  
  for (let i = 0; i < receipt.logs.length; i++) {
    const log = receipt.logs[i];
    const topic0 = log.topics[0]?.toLowerCase();
    
    console.log(`[parseXCMEvents] 📋 Log[${i}]:`);
    console.log(`[parseXCMEvents]    Topic0: ${topic0}`);
    console.log(`[parseXCMEvents]    Address: ${log.address}`);
    console.log(`[parseXCMEvents]    Data: ${log.data?.slice(0, 66)}...`);
    
    // Check if log is from BasketManager
    if (log.address?.toLowerCase() !== BASKET_MANAGER_ADDRESS?.toLowerCase()) {
      console.log(`[parseXCMEvents]    ⚠️ Skipping - wrong address`);
      continue;
    }
    
    // Parse based on event type
    switch (topic0) {
      case EVENT_TOPICS.XCMMessageSent:
        {
          const paraId = parseInt(log.topics[1] || "0", 16);
          const messageHash = log.topics[2];
          const amount = BigInt(log.data?.slice(0, 66) || "0");
          events.push({ 
            type: "sent", 
            paraId, 
            messageHash, 
            amount 
          });
          console.log(`[parseXCMEvents]    ✅ XCMMessageSent: Para ${paraId}, Amount ${amount}`);
        }
        break;
        
      case EVENT_TOPICS.XCMMessageFailed:
        {
          const paraId = parseInt(log.topics[1] || "0", 16);
          const reason = "XCM dispatch failed - check XCM precompile availability";
          events.push({ 
            type: "failed", 
            paraId, 
            reason 
          });
          console.log(`[parseXCMEvents]    ❌ XCMMessageFailed: Para ${paraId}, Reason: ${reason}`);
        }
        break;
        
      case EVENT_TOPICS.DeploymentDispatched:
        {
          const basketId = BigInt(log.topics[1] || "0");
          const paraId = parseInt(log.data?.slice(0, 66) || "0", 16);
          const amount = BigInt("0x" + log.data?.slice(66, 130) || "0");
          events.push({ 
            type: "deployment_dispatched", 
            basketId, 
            paraId, 
            amount 
          });
          console.log(`[parseXCMEvents]    ✅ DeploymentDispatched: Basket ${basketId}, Para ${paraId}, Amount ${amount}`);
        }
        break;
        
      case EVENT_TOPICS.DeploymentFailed:
        {
          const basketId = BigInt(log.topics[1] || "0");
          const paraId = parseInt(log.data?.slice(0, 66) || "0", 16);
          const amount = BigInt("0x" + log.data?.slice(66, 130) || "0");
          const reason = "Deployment failed - sovereign account needs funding";
          events.push({ 
            type: "deployment_failed", 
            basketId, 
            paraId, 
            amount, 
            reason 
          });
          console.log(`[parseXCMEvents]    ❌ DeploymentFailed: Basket ${basketId}, Para ${paraId}, Amount ${amount}`);
          console.log(`[parseXCMEvents]       💡 Reason: ${reason}`);
        }
        break;
        
      case EVENT_TOPICS.Deposited:
        {
          const basketId = BigInt(log.topics[1] || "0");
          const user = "0x" + (log.topics[2] || "").slice(26); // Remove padding
          const amount = BigInt("0x" + log.data?.slice(0, 66) || "0");
          const tokensMinted = BigInt("0x" + log.data?.slice(66, 130) || "0");
          events.push({ 
            type: "deposited", 
            basketId, 
            user, 
            amount, 
            tokensMinted 
          });
          console.log(`[parseXCMEvents]    ✅ Deposited: Basket ${basketId}, User ${user?.slice(0, 10)}..., Amount ${amount}, Tokens ${tokensMinted}`);
        }
        break;
        
      default:
        console.log(`[parseXCMEvents]    ❓ Unknown event: ${topic0?.slice(0, 20)}...`);
    }
  }
  
  return events;
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
    console.log("[useBasketManager] 🏦 Deposit initiated");
    console.log("[useBasketManager] 📊 Amount:", amountDOT, "PAS");
    console.log("[useBasketManager] 🎯 Basket ID:", basketId.toString());
    
    try {
      const wc = walletClient as { account?: { address: string }; writeContract: (params: unknown) => Promise<`0x${string}`> };
      const account = wc.account?.address as `0x${string}` | undefined;
      if (!account) {
        throw new Error("No account available");
      }
      console.log("[useBasketManager] 👤 Account:", account);
      
      await assertBasketReady(basketId);
      console.log("[useBasketManager] ✅ Basket ready");
      
      const normalizedAmount = typeof amountDOT === "number" ? amountDOT.toString() : amountDOT;
      const value = parseUnits(normalizedAmount, APP_NATIVE_DECIMALS);
      console.log("[useBasketManager] 💰 Value (wei):", value.toString());
      
      console.log("[useBasketManager] 🔮 Simulating transaction...");
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
      console.log("[useBasketManager] ✅ Simulation successful");

      console.log("[useBasketManager] 📡 Sending transaction...");
      const hash = await writeLegacyContract(walletClient, request as Record<string, unknown>);
      console.log("[useBasketManager] 🔗 Transaction sent:", hash);
      
      console.log("[useBasketManager] ⏳ Waiting for receipt...");
      const receipt = await waitForReceipt(hash);
      console.log("[useBasketManager] ✅ Transaction confirmed!");
      
      // Parse XCM events from receipt or simulate for testnet
      console.log("[useBasketManager] 🔍 Parsing XCM events from receipt...");
      console.log("[useBasketManager] 📋 Receipt logs count:", receipt.logs?.length || 0);
      
      let xcmEvents: XCMEvent[] = [];
      
      // If in testnet mode, simulate XCM events for demo
      if (IS_TESTNET_XCM) {
        console.log("[useBasketManager] 🎭 Testnet mode: Simulating XCM events for demo...");
        
        // Get basket info for allocations
        const basket = await getBasket(basketId);
        const allocations = basket?.allocations || [];
        
        xcmEvents = await simulateXCMEvents(
          basketId,
          value,
          allocations,
          account,
          { successRate: 1.0, delayMs: 1500 } // 100% success for demo
        );
        
        console.log("[useBasketManager] ✅ Simulated XCM events:", xcmEvents.length);
      } else {
        // Real XCM parsing for local mode
        xcmEvents = parseXCMEvents(receipt);
      }
      
      console.log("[useBasketManager] 📊 XCM Events found:", xcmEvents.length);
      
      if (xcmEvents.length === 0) {
        console.warn("[useBasketManager] ⚠️ NO XCM EVENTS FOUND!");
        console.warn("[useBasketManager] ⚠️ This means:");
        console.warn("[useBasketManager]    1. XCM precompile might not be deployed");
        console.warn("[useBasketManager]    2. XCM might be disabled in BasketManager");
        console.warn("[useBasketManager]    3. Transaction didn't trigger XCM dispatch");
      } else {
        console.log("[useBasketManager] 🎯 XCM Status:");
        xcmEvents.forEach((event, idx) => {
          if (event.type === "sent") {
            console.log(`[useBasketManager]    ✅ [${idx + 1}] XCM Sent to Para ${event.paraId}`);
            console.log(`[useBasketManager]       Message Hash: ${event.messageHash}`);
            console.log(`[useBasketManager]       Amount: ${formatUnits(event.amount || 0n, APP_NATIVE_DECIMALS)} PAS`);
            console.log(`[useBasketManager]       🔗 Check status: https://hydration.subscan.io/xcm/${event.messageHash}`);
          } else {
            console.log(`[useBasketManager]    ❌ [${idx + 1}] XCM Failed to Para ${event.paraId}`);
            console.log(`[useBasketManager]       Reason: ${event.reason}`);
          }
        });
      }
      
      console.log("[useBasketManager] 🔍 Explorer:", `https://blockscout-testnet.polkadot.io/tx/${hash}`);
      console.log("[useBasketManager] 📖 How to verify XCM:");
      console.log("[useBasketManager]    1. Open explorer link above");
      console.log("[useBasketManager]    2. Check 'Logs' tab for XCMMessageSent events");
      console.log("[useBasketManager]    3. Copy message hash and check on target chain explorers:");
      console.log("[useBasketManager]       - Hydration: https://hydration.subscan.io");
      console.log("[useBasketManager]       - Moonbeam: https://moonbase.subscan.io");
      console.log("[useBasketManager]       - Acala: https://acala.subscan.io");
      
      return { hash, xcmEvents };
    } catch (err) {
      let errorMessage = normalizeErrorMessage(err, "Deposit failed");
      console.error("[useBasketManager] ❌ Deposit error:", errorMessage);
      if (errorMessage.toLowerCase().includes("execution reverted")) {
        const readiness = await getXcmReadiness();
        console.log("[useBasketManager] 🔍 XCM Readiness:", readiness);
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
    console.log("[useBasketManager] 🏦 Withdraw initiated");
    console.log("[useBasketManager] 📊 Token amount:", tokenAmount.toString());
    console.log("[useBasketManager] 🎯 Basket ID:", basketId.toString());
    
    try {
      const wc = walletClient as { account?: { address: string }; writeContract: (params: unknown) => Promise<`0x${string}`> };
      const account = wc.account?.address as `0x${string}` | undefined;
      if (!account) {
        throw new Error("No account available");
      }
      console.log("[useBasketManager] 👤 Account:", account);
      
      await assertBasketReady(basketId);
      console.log("[useBasketManager] ✅ Basket ready");
      
      console.log("[useBasketManager] 🔮 Simulating transaction...");
      const { request } = await publicClient.simulateContract({
        address: BASKET_MANAGER_ADDRESS,
        abi: BASKET_MANAGER_ABI,
        functionName: "withdraw",
        args: [basketId, tokenAmount],
        gasPrice: APP_LEGACY_GAS_PRICE,
        chain: APP_CHAIN,
        account,
      });
      console.log("[useBasketManager] ✅ Simulation successful");

      console.log("[useBasketManager] 📡 Sending transaction...");
      const hash = await writeLegacyContract(walletClient, request as Record<string, unknown>);
      console.log("[useBasketManager] 🔗 Transaction sent:", hash);
      
      console.log("[useBasketManager] ⏳ Waiting for receipt...");
      const receipt = await waitForReceipt(hash);
      console.log("[useBasketManager] ✅ Transaction confirmed!");
      
      // Parse XCM events from receipt or simulate for testnet
      console.log("[useBasketManager] 🔍 Parsing XCM events from receipt...");
      
      let xcmEvents: XCMEvent[] = [];
      
      // If in testnet mode, simulate XCM events for demo
      if (IS_TESTNET_XCM) {
        console.log("[useBasketManager] 🎭 Testnet mode: Simulating XCM withdrawal events for demo...");
        
        // Get basket info for allocations
        const basket = await getBasket(basketId);
        const allocations = basket?.allocations || [];
        
        xcmEvents = await simulateXCMWithdrawEvents(
          basketId,
          tokenAmount,
          allocations,
          account,
          { successRate: 1.0, delayMs: 1500 } // 100% success for demo
        );
        
        console.log("[useBasketManager] ✅ Simulated XCM withdrawal events:", xcmEvents.length);
      } else {
        // Real XCM parsing for local mode
        xcmEvents = parseXCMEvents(receipt);
      }
      
      console.log("[useBasketManager] 📊 XCM Events found:", xcmEvents.length);
      
      if (xcmEvents.length === 0) {
        console.warn("[useBasketManager] ⚠️ NO XCM EVENTS FOUND!");
        console.warn("[useBasketManager] ⚠️ Withdraw may have used local fallback (no cross-chain transfer)");
      } else {
        console.log("[useBasketManager] 🎯 XCM Withdraw Status:");
        xcmEvents.forEach((event, idx) => {
          if (event.type === "sent") {
            console.log(`[useBasketManager]    ✅ [${idx + 1}] XCM Withdraw Sent to Para ${event.paraId}`);
            console.log(`[useBasketManager]       Message Hash: ${event.messageHash}`);
          } else {
            console.log(`[useBasketManager]    ❌ [${idx + 1}] XCM Withdraw Failed to Para ${event.paraId}`);
          }
        });
      }
      
      console.log("[useBasketManager] 💰 PAS returned to user");
      console.log("[useBasketManager] 🔍 Explorer:", `https://blockscout-testnet.polkadot.io/tx/${hash}`);
      
      return { hash, xcmEvents };
    } catch (err) {
      const errorMessage = normalizeErrorMessage(err, "Withdraw failed");
      console.error("[useBasketManager] ❌ Withdraw error:", errorMessage);
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
