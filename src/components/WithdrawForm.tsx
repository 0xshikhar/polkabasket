import { useState, useCallback } from "react";
import { parseEther } from "viem";
import { useBasketManager } from "../hooks/useBasketManager";
import { useWalletAddress } from "../contexts/WalletContext";

interface WithdrawFormProps {
  basketId: bigint;
  tokenSymbol?: string;
  userTokenBalance?: string;
}

export function WithdrawForm({ 
  basketId, 
  tokenSymbol = "xDOT-LIQ",
  userTokenBalance = "0"
}: WithdrawFormProps) {
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const { withdraw, isLoading, error } = useBasketManager();
  const walletAddress = useWalletAddress();

  const handleWithdraw = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    
    setTxStatus("pending");
    setTxHash(null);
    
    try {
      const tokenAmount = parseEther(amount);
      const hash = await withdraw(
        { account: { address: walletAddress } } as never,
        basketId,
        tokenAmount
      );
      setTxHash(hash);
      setTxStatus("success");
      setAmount("");
    } catch (err) {
      console.error("Withdraw error:", err);
      setTxStatus("error");
    }
  }, [amount, basketId, walletAddress, withdraw]);

  const handleMax = useCallback(() => {
    setAmount(userTokenBalance);
  }, [userTokenBalance]);

  const isValidAmount = amount && parseFloat(amount) > 0;
  const isConnected = !!walletAddress;
  const hasBalance = parseFloat(userTokenBalance) > 0;

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-xl font-bold mb-4 text-white">Withdraw DOT</h3>
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
            <p className="text-2xl font-bold text-white">{amount} DOT</p>
            <p className="text-gray-500 text-xs mt-1">
              Estimated via XCM (may vary based on market conditions)
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {txStatus === "success" && txHash && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded p-3">
            <p className="text-emerald-400 text-sm mb-1">Withdrawal initiated!</p>
            <a
              href={`https://assethub-westend.subscan.io/extrinsic/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 text-xs hover:underline"
            >
              View on Explorer ↗
            </a>
            <p className="text-gray-400 text-xs mt-2">
              DOT will arrive after XCM completes on target chains
            </p>
          </div>
        )}

        <button
          onClick={handleWithdraw}
          disabled={isLoading || !isValidAmount || !isConnected || !hasBalance || txStatus === "pending"}
          className="w-full py-3 bg-red-600 text-white rounded font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {!isConnected 
            ? "Connect Wallet to Withdraw" 
            : !hasBalance
              ? "No Token Balance"
              : isLoading || txStatus === "pending"
                ? "Withdrawing..." 
                : "Withdraw DOT"
          }
        </button>
      </div>
    </div>
  );
}
