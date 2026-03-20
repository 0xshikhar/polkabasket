import { useState, useCallback } from "react";
import { parseEther } from "viem";
import { useBasketManager } from "../hooks/useBasketManager";
import { useWallet, useWalletClient } from "../contexts/WalletContext";
import { APP_CHAIN_ID, APP_CHAIN_NAME, APP_NATIVE_SYMBOL, getExplorerTxUrl } from "../config/contracts";
import type { WalletClient } from "viem";

interface WithdrawFormProps {
  basketId: bigint;
  tokenSymbol?: string;
  userTokenBalance?: string;
}

const CHAIN_NAMES: Record<number, string> = {
  11155111: "Sepolia",
  1: "Ethereum",
  [APP_CHAIN_ID]: APP_CHAIN_NAME,
};

export function WithdrawForm({ 
  basketId, 
  tokenSymbol = "xDOT-LIQ",
  userTokenBalance = "0"
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
    if (!amount || parseFloat(amount) <= 0 || !walletClient) return;
    
    if (!isCorrectChain) {
      setLocalError(`Please switch to ${APP_CHAIN_NAME} first`);
      return;
    }
    
    setTxStatus("pending");
    setTxHash(null);
    setLocalError(null);
    
    try {
      const tokenAmount = parseEther(amount);
      const hash = await withdraw(
        walletClient as WalletClient,
        basketId,
        tokenAmount
      );
      setTxHash(hash);
      setTxStatus("success");
      setAmount("");
    } catch (err) {
      console.error("Withdraw error:", err);
      const errMsg = err instanceof Error ? err.message : "Withdraw failed";
      if (errMsg.includes("chain") || errMsg.includes("Chain")) {
        setLocalError(`Wrong network! Please switch to ${APP_CHAIN_NAME} (ID: ${targetChainId})`);
      } else {
        setTxStatus("error");
      }
    }
  }, [amount, basketId, walletClient, withdraw, isCorrectChain, targetChainId]);

  const handleMax = useCallback(() => {
    setAmount(userTokenBalance);
  }, [userTokenBalance]);

  const isValidAmount = amount && parseFloat(amount) > 0;
  const hasBalance = parseFloat(userTokenBalance) > 0;
  const displayError = localError || (needsSwitchChain ? `Wrong network (${CHAIN_NAMES[chainId || 0] || `Chain ${chainId}`}). Please switch to ${APP_CHAIN_NAME}.` : null);

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-xl font-bold mb-4 text-white">Withdraw {APP_NATIVE_SYMBOL}</h3>
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
            <p className="text-gray-500 text-xs mt-1">
              Estimated via XCM (may vary based on market conditions)
            </p>
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
            <p className="text-emerald-400 text-sm mb-1">Withdrawal initiated!</p>
            <a
              href={getExplorerTxUrl(txHash) || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 text-xs hover:underline"
            >
              View on Explorer ↗
            </a>
            <p className="text-gray-400 text-xs mt-2">
              {APP_NATIVE_SYMBOL} will arrive after XCM completes on target chains
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
