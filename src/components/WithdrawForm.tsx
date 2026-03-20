import { useState, useCallback } from "react";
import { parseEther } from "viem";
import { useBasketManager } from "../hooks/useBasketManager";
import { useWallet, useWalletClient } from "../contexts/WalletContext";
import { APP_CHAIN_ID, APP_CHAIN_NAME, APP_NATIVE_SYMBOL, getExplorerTxUrl, IS_LOCAL_XCM, IS_TESTNET_XCM } from "../config/contracts";
import type { WalletClient } from "viem";

const TARGET_CHAINS: Record<number, { name: string; explorer: string }> = {
  2034: { name: "Hydration", explorer: "https://hydration.subscan.io" },
  2004: { name: "Moonbeam", explorer: "https://moonbase.subscan.io" },
  2000: { name: "Acala", explorer: "https://acala.subscan.io" },
};

interface WithdrawFormProps {
  basketId: bigint;
  tokenSymbol?: string;
  userTokenBalance?: string;
  allocations?: { paraId: number; weightBps: number }[];
}

const CHAIN_NAMES: Record<number, string> = {
  11155111: "Sepolia",
  1: "Ethereum",
  [APP_CHAIN_ID]: APP_CHAIN_NAME,
};

export function WithdrawForm({ 
  basketId, 
  tokenSymbol = "xDOT-LIQ",
  userTokenBalance = "0",
  allocations = [
    { paraId: 2034, weightBps: 4000 },
    { paraId: 2004, weightBps: 3000 },
    { paraId: 2000, weightBps: 3000 },
  ],
}: WithdrawFormProps) {
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const { withdraw, isLoading, error: contractError } = useBasketManager();
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

  const handleWithdraw = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0 || !walletClient) {
      console.warn("[WithdrawForm] Invalid withdraw attempt:", { amount, hasWallet: !!walletClient });
      return;
    }
    
    if (!isCorrectChain) {
      console.warn("[WithdrawForm] Wrong chain:", { currentChain: chainId, targetChain: targetChainId });
      setLocalError(`Please switch to ${APP_CHAIN_NAME} first`);
      return;
    }
    
    console.log("[WithdrawForm] 🚀 Starting withdrawal...");
    console.log("[WithdrawForm] 📊 Token amount:", amount, tokenSymbol);
    console.log("[WithdrawForm] 🎯 Basket ID:", basketId.toString());
    console.log("[WithdrawForm] 🌐 Wallet:", walletClient.account?.address);
    console.log("[WithdrawForm] 💰 Expected PAS return:", amount, APP_NATIVE_SYMBOL);
    console.log("[WithdrawForm] 📡 This will:");
    console.log("[WithdrawForm]   1. Burn", amount, tokenSymbol, "tokens");
    console.log("[WithdrawForm]   2. Dispatch XCM withdraw messages to:");
    allocations.forEach(a => {
      const chain = TARGET_CHAINS[a.paraId];
      const pasAmount = ((parseFloat(amount) * a.weightBps) / 10000).toFixed(4);
      console.log(`[WithdrawForm]      - ${chain?.name || `Para ${a.paraId}`}: ${pasAmount} ${APP_NATIVE_SYMBOL}`);
    });
    console.log("[WithdrawForm]   3. Transfer native PAS back to user");
    
    setTxStatus("pending");
    setTxHash(null);
    setLocalError(null);
    
    console.log("[WithdrawForm] ⏳ Processing withdrawal...");
    
    try {
      const tokenAmount = parseEther(amount);
      console.log("[WithdrawForm] 📡 Calling BasketManager.withdraw()...");
      
      const result = await withdraw(
        walletClient as WalletClient,
        basketId,
        tokenAmount
      );
      
      console.log("[WithdrawForm] ✅ Withdrawal successful!");
      console.log("[WithdrawForm] 🔗 Transaction hash:", result.hash);
      console.log("[WithdrawForm] 📊 XCM Events:", result.xcmEvents?.length || 0);
      
      if (result.xcmEvents && result.xcmEvents.length > 0) {
        console.log("[WithdrawForm] 🎯 XCM Status:");
        result.xcmEvents.forEach((event: { type: string; paraId?: number; messageHash?: string }, idx: number) => {
          const paraId = event.paraId || 0;
          const chain = TARGET_CHAINS[paraId];
          if (event.type === "sent") {
            console.log(`[WithdrawForm]    ✅ [${idx + 1}] ${chain?.name || `Para ${paraId}`}: XCM SENT`);
            console.log(`[WithdrawForm]       Message Hash: ${event.messageHash}`);
          } else {
            console.log(`[WithdrawForm]    ❌ [${idx + 1}] ${chain?.name || `Para ${paraId}`}: XCM FAILED`);
          }
        });
      } else {
        console.warn("[WithdrawForm] ⚠️ NO XCM EVENTS - Local fallback used");
      }
      
      console.log("[WithdrawForm] 💰 PAS returned:", amount, APP_NATIVE_SYMBOL);
      console.log("[WithdrawForm] 🔍 Check explorer:", getExplorerTxUrl(result.hash));
      console.log("[WithdrawForm] 📝 Note: Actual XCM execution on target chains takes time");
      console.log("[WithdrawForm]    To verify XCM delivery:");
      console.log("[WithdrawForm]    1. Copy message hash from logs above");
      console.log("[WithdrawForm]    2. Check target chain explorers:");
      allocations.forEach(a => {
        const chain = TARGET_CHAINS[a.paraId];
        console.log(`[WithdrawForm]       - ${chain?.name}: ${chain?.explorer}/xcm/<message_hash>`);
      });
      console.log("[WithdrawForm]    3. Or check sovereign account balances:");
      allocations.forEach(a => {
        const chain = TARGET_CHAINS[a.paraId];
        console.log(`[WithdrawForm]       - ${chain?.name}: ${chain?.explorer}/account/0x98b71d9da7f556addb143b901cc911867242e374f27f89d24b693974723e20aa`);
      });
      
      setTxHash(result.hash);
      setTxStatus("success");
      setAmount("");
    } catch (err) {
      console.error("[WithdrawForm] ❌ Withdraw error:", err);
      const errMsg = err instanceof Error ? err.message : "Withdraw failed";
      if (errMsg.includes("chain") || errMsg.includes("Chain")) {
        setLocalError(`Wrong network! Please switch to ${APP_CHAIN_NAME} (ID: ${targetChainId})`);
      } else {
        setLocalError(errMsg);
        setTxStatus("error");
        console.error("[WithdrawForm] 💥 Withdrawal failed");
      }
    }
  }, [amount, basketId, walletClient, withdraw, isCorrectChain, targetChainId, allocations]);

  const handleMax = useCallback(() => {
    setAmount(userTokenBalance);
  }, [userTokenBalance]);

  const isValidAmount = amount && parseFloat(amount) > 0;
  const hasBalance = parseFloat(userTokenBalance) > 0;
  const displayError = localError || (needsSwitchChain ? `Wrong network (${CHAIN_NAMES[chainId || 0] || `Chain ${chainId}`}). Please switch to ${APP_CHAIN_NAME}.` : null);

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-xl font-bold mb-4 text-white">Withdraw {APP_NATIVE_SYMBOL}</h3>
      
      {/* XCM Mode Indicator */}
      {IS_TESTNET_XCM && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <span className="text-amber-400 text-lg">🎭</span>
            <div>
              <h4 className="text-amber-300 font-semibold text-sm mb-1">Demo Mode</h4>
              <p className="text-amber-200/80 text-xs leading-relaxed">
                XCM events are simulated for demonstration purposes. Real XCM is unavailable on Paseo testnet. 
                Withdrawals will burn your tokens and return PAS from local holdings on Asset Hub.
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
                Real XCM functionality is active. Withdrawals will dispatch XCM messages to retrieve 
                funds from parachains.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-gray-300 mb-2">Amount ({tokenSymbol})</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setTxStatus("idle");
                setLocalError(null);
              }}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="flex-1 px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-red-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleMax}
              className="px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 hover:bg-gray-600 transition"
            >
              MAX
            </button>
          </div>
          <p className="text-gray-500 text-sm mt-2">
            Available: {userTokenBalance} {tokenSymbol}
          </p>
        </div>

        {isValidAmount && (
          <div className="bg-gray-700 rounded p-4">
            <p className="text-gray-300 text-sm mb-2">You will receive:</p>
            <p className="text-2xl font-bold text-white">{amount} {APP_NATIVE_SYMBOL}</p>
            {IS_LOCAL_XCM && (
              <p className="text-emerald-400/70 text-xs mt-1">
                Retrieved via XCM from parachains
              </p>
            )}
            {IS_TESTNET_XCM && (
              <p className="text-amber-400/70 text-xs mt-1">
                From local holdings (XCM simulated for demo)
              </p>
            )}
            {!IS_LOCAL_XCM && !IS_TESTNET_XCM && (
              <p className="text-amber-400/70 text-xs mt-1">
                From local holdings on Asset Hub (XCM unavailable)
              </p>
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
            <p className="text-emerald-400 text-sm mb-1">Withdrawal successful!</p>
            {IS_TESTNET_XCM && (
              <p className="text-amber-400/80 text-xs mb-2">
                Demo: XCM events simulated. PAS returned from local holdings.
              </p>
            )}
            {IS_LOCAL_XCM && (
              <p className="text-emerald-300/70 text-xs mb-2">
                XCM withdrawal messages dispatched to parachains.
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

        {txStatus === "error" && (
          <div className="bg-red-500/10 border border-red-500/20 rounded p-3">
            <p className="text-red-400 text-sm mb-2">Withdrawal failed</p>
            <p className="text-red-300/70 text-xs">
              Check your balance and try again.
            </p>
          </div>
        )}

        <button
          onClick={handleWithdraw}
          disabled={isLoading || !isValidAmount || !isConnected || !hasBalance || txStatus === "pending" || switchingChain}
          className="w-full py-3 bg-red-600 text-white rounded font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {!isConnected 
            ? "Connect Wallet to Withdraw" 
            : needsSwitchChain
              ? `Switch to ${APP_CHAIN_NAME} (${targetChainId})`
              : !hasBalance
                ? "No Token Balance"
                : isLoading || txStatus === "pending"
                  ? "Withdrawing..." 
                  : `Withdraw ${APP_NATIVE_SYMBOL}`
          }
        </button>
      </div>
    </div>
  );
}
