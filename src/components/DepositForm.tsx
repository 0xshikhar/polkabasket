import { useState, useCallback } from "react";
import { useBasketManager } from "../hooks/useBasketManager";
import { useWallet, useWalletClient } from "../contexts/WalletContext";
import { APP_CHAIN_ID, APP_CHAIN_NAME, APP_NATIVE_SYMBOL, PARACHAINS, getExplorerTxUrl, IS_LOCAL_XCM, IS_TESTNET_XCM } from "../config/contracts";
import type { WalletClient } from "viem";

interface DepositFormProps {
  basketId: bigint;
  basketName?: string;
  allocations?: Array<{ chain: string; paraId: number; pct: number }>;
}

const CHAIN_NAMES: Record<number, string> = {
  11155111: "Sepolia",
  1: "Ethereum",
  [APP_CHAIN_ID]: APP_CHAIN_NAME,
};

export function DepositForm({ 
  basketId, 
  basketName = "xDOT-LIQ",
  allocations = [
    { chain: "Hydration LP", paraId: PARACHAINS.HYDRA.id, pct: 40 },
    { chain: "Moonbeam Lending", paraId: PARACHAINS.MOONBEAM.id, pct: 30 },
    { chain: "Acala Staking", paraId: PARACHAINS.ACALA.id, pct: 30 },
  ]
}: DepositFormProps) {
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const { deposit, isLoading, error: contractError } = useBasketManager();
  const walletClient = useWalletClient();
  const { state, switchChain } = useWallet();
  const { isConnected, isCorrectChain, needsSwitchChain, chainId, targetChainId } = state.evm;

  const [switchingChain, setSwitchingChain] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSwitchChain = useCallback(async () => {
    setSwitchingChain(true);
    setLocalError(null);
    try {
      await switchChain();
    } catch {
      setLocalError(`Please manually switch to ${APP_CHAIN_NAME} (Chain ID: ${targetChainId})`);
    } finally {
      setSwitchingChain(false);
    }
  }, [switchChain, targetChainId]);

  const handleDeposit = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0 || !walletClient) {
      console.warn("[DepositForm] Invalid deposit attempt:", { amount, hasWallet: !!walletClient });
      return;
    }
    
    if (!isCorrectChain) {
      console.warn("[DepositForm] Wrong chain:", { currentChain: chainId, targetChain: targetChainId });
      setLocalError(`Please switch to ${APP_CHAIN_NAME} first`);
      return;
    }
    
    console.log("[DepositForm] 🚀 Starting deposit...");
    console.log("[DepositForm] 📊 Amount:", amount, APP_NATIVE_SYMBOL);
    console.log("[DepositForm] 🎯 Basket ID:", basketId.toString());
    console.log("[DepositForm] 🌐 Wallet:", walletClient.account?.address);
    
    setTxStatus("pending");
    setTxHash(null);
    setLocalError(null);
    
    try {
      console.log("[DepositForm] 📡 Calling BasketManager.deposit()...");
      console.log("[DepositForm] 📝 This will:");
      console.log("[DepositForm]   1. Mint basket tokens 1:1");
      console.log("[DepositForm]   2. Dispatch XCM messages to:");
      allocations.forEach(a => {
        console.log(`[DepositForm]      - ${a.chain} (Para ${a.paraId}): ${((parseFloat(amount) * a.pct) / 100).toFixed(4)} ${APP_NATIVE_SYMBOL}`);
      });
      
      const result = await deposit(
        walletClient as WalletClient,
        basketId,
        amount
      );
      
      console.log("[DepositForm] ✅ Deposit successful!");
      console.log("[DepositForm] 🔗 Transaction hash:", result.hash);
      console.log("[DepositForm] 📊 XCM Events:", result.xcmEvents?.length || 0);
      
      if (result.xcmEvents && result.xcmEvents.length > 0) {
        console.log("[DepositForm] 🎯 XCM Status:");
        result.xcmEvents.forEach((event: { type: string; paraId?: number; messageHash?: string }, idx: number) => {
          if (event.type === "sent") {
            console.log(`[DepositForm]    ✅ [${idx + 1}] XCM to Para ${event.paraId}: SENT`);
            console.log(`[DepositForm]       Message Hash: ${event.messageHash}`);
          } else {
            console.log(`[DepositForm]    ❌ [${idx + 1}] XCM to Para ${event.paraId}: FAILED`);
          }
        });
        
        console.log("[DepositForm] 🔍 How to verify XCM delivery:");
        console.log("[DepositForm]    1. Open transaction on explorer");
        console.log("[DepositForm]    2. Copy message hash from logs");
        console.log("[DepositForm]    3. Check target chain explorers:");
        console.log("[DepositForm]       - Hydration: https://hydration.subscan.io");
        console.log("[DepositForm]       - Moonbeam: https://moonbase.subscan.io");
        console.log("[DepositForm]       - Acala: https://acala.subscan.io");
        console.log("[DepositForm]    4. Search for the message hash in XCM section");
      } else {
        console.warn("[DepositForm] ⚠️ NO XCM EVENTS - Funds may be held locally!");
        console.warn("[DepositForm] ⚠️ Check if XCM precompile is deployed");
      }
      
      setTxHash(result.hash);
      setTxStatus("success");
      setAmount("");
    } catch (err) {
      console.error("[DepositForm] ❌ Deposit error:", err);
      const errMsg = err instanceof Error ? err.message : "Deposit failed";
      if (errMsg.includes("chain") || errMsg.includes("Chain")) {
        setLocalError(`Wrong network! Please switch to ${APP_CHAIN_NAME} (ID: ${targetChainId})`);
      } else {
        setTxStatus("error");
      }
    }
  }, [amount, basketId, walletClient, deposit, isCorrectChain, targetChainId, allocations]);

  const isValidAmount = amount && parseFloat(amount) > 0;
  const displayError = localError || (needsSwitchChain ? `Wrong network (${CHAIN_NAMES[chainId || 0] || `Chain ${chainId}`}). Please switch to ${APP_CHAIN_NAME}.` : null);

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-xl font-bold mb-4 text-white">Deposit {APP_NATIVE_SYMBOL}</h3>
      
      {/* XCM Mode Indicator */}
      {IS_TESTNET_XCM && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <span className="text-amber-400 text-lg">🎭</span>
            <div>
              <h4 className="text-amber-300 font-semibold text-sm mb-1">Demo Mode</h4>
              <p className="text-amber-200/80 text-xs leading-relaxed">
                XCM events are simulated for demonstration purposes. Real XCM is unavailable on Paseo testnet. 
                Your deposits will be safely held on Asset Hub and tokens minted 1:1. 
                The UI shows what cross-chain deployment would look like.
              </p>
            </div>
          </div>
        </div>
      )}

      {IS_LOCAL_XCM && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <span className="text-emerald-400 text-lg">✓</span>
            <div>
              <h4 className="text-emerald-300 font-semibold text-sm mb-1">Full XCM Enabled</h4>
              <p className="text-emerald-200/80 text-xs leading-relaxed">
                Real XCM functionality is active. Your deposits will be automatically deployed 
                across parachains via cross-chain messaging.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-gray-300 mb-2">Amount ({APP_NATIVE_SYMBOL})</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setTxStatus("idle");
              setLocalError(null);
            }}
            placeholder="Enter amount"
            min="0"
            step="0.01"
            className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {isValidAmount && (
          <div className="bg-gray-700 rounded p-4">
            {IS_LOCAL_XCM ? (
              // Full XCM mode - show actual allocations
              <>
                <p className="text-gray-300 mb-2">Your {amount} {APP_NATIVE_SYMBOL} will be deployed:</p>
                {allocations.map((a) => (
                  <div key={a.chain} className="flex justify-between text-emerald-400">
                    <span>{a.chain}</span>
                    <span>{((parseFloat(amount) * a.pct) / 100).toFixed(2)} {APP_NATIVE_SYMBOL}</span>
                  </div>
                ))}
              </>
            ) : IS_TESTNET_XCM ? (
              // Testnet demo mode - show simulated allocations
              <>
                <p className="text-gray-300 mb-2">Your {amount} {APP_NATIVE_SYMBOL} will be (simulated):</p>
                {allocations.map((a) => (
                  <div key={a.chain} className="flex justify-between text-amber-400/80">
                    <span className="flex items-center gap-2">
                      {a.chain}
                      <span className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">simulated</span>
                    </span>
                    <span>{((parseFloat(amount) * a.pct) / 100).toFixed(2)} {APP_NATIVE_SYMBOL}</span>
                  </div>
                ))}
                <p className="text-amber-400/60 text-xs mt-3 pt-3 border-t border-amber-500/20">
                  ℹ️ In demo mode, funds stay on Asset Hub. XCM events are simulated for UI demonstration.
                </p>
              </>
            ) : (
              // Fallback local-only mode
              <>
                <p className="text-gray-300 mb-2">Your {amount} {APP_NATIVE_SYMBOL} will be:</p>
                <div className="flex items-center gap-2 text-emerald-400 mb-2">
                  <span>✓</span>
                  <span>Minted 1:1 as {basketName} tokens</span>
                </div>
                <div className="flex items-center gap-2 text-amber-400">
                  <span>ℹ️</span>
                  <span className="text-xs">Held safely on Asset Hub (XCM unavailable)</span>
                </div>
              </>
            )}
          </div>
        )}

        {displayError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded p-3">
            <p className="text-red-400 text-sm mb-2">{displayError}</p>
            {needsSwitchChain && (
              <button
                onClick={handleSwitchChain}
                disabled={switchingChain}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded font-medium transition-colors disabled:opacity-50"
              >
                {switchingChain ? "Switching..." : `Switch to ${APP_CHAIN_NAME} (${targetChainId})`}
              </button>
            )}
          </div>
        )}

        {contractError && !localError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded p-3">
            <p className="text-red-400 text-sm">{contractError}</p>
          </div>
        )}

        {txStatus === "success" && txHash && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded p-3">
            <p className="text-emerald-400 text-sm mb-1">Deposit successful!</p>
            {IS_TESTNET_XCM && (
              <p className="text-amber-400/80 text-xs mb-2">
                Demo: XCM events simulated. Funds held on Asset Hub.
              </p>
            )}
            {IS_LOCAL_XCM && (
              <p className="text-emerald-300/70 text-xs mb-2">
                XCM messages dispatched to parachains.
              </p>
            )}
            <a
              href={getExplorerTxUrl(txHash) || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 text-xs hover:underline"
            >
              View on Explorer ↗
            </a>
          </div>
        )}

        <button
          onClick={handleDeposit}
          disabled={isLoading || !isValidAmount || !isConnected || txStatus === "pending" || switchingChain}
          className="w-full py-3 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {!isConnected 
            ? "Connect Wallet to Deposit" 
            : needsSwitchChain
              ? `Switch to ${APP_CHAIN_NAME} (${targetChainId})`
              : isLoading || txStatus === "pending" 
                ? "Depositing..." 
                : `Mint ${basketName} Token`
          }
        </button>
      </div>
    </div>
  );
}
