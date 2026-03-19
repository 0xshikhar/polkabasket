import { useState, useCallback } from "react";
import { useBasketManager } from "../hooks/useBasketManager";
import { useWallet, useWalletClient } from "../contexts/WalletContext";
import { PARACHAINS } from "../config/contracts";
import type { WalletClient } from "viem";

interface DepositFormProps {
  basketId: bigint;
  basketName?: string;
  allocations?: Array<{ chain: string; paraId: number; pct: number }>;
}

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
  const { deposit, isLoading, error } = useBasketManager();
  const walletClient = useWalletClient();
  const { state } = useWallet();
  const isConnected = state.evm.isConnected;

  const handleDeposit = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0 || !walletClient) return;
    
    setTxStatus("pending");
    setTxHash(null);
    
    try {
      const hash = await deposit(
        walletClient as WalletClient,
        basketId,
        parseFloat(amount)
      );
      setTxHash(hash);
      setTxStatus("success");
      setAmount("");
    } catch (err) {
      console.error("Deposit error:", err);
      setTxStatus("error");
    }
  }, [amount, basketId, walletClient, deposit]);

  const isValidAmount = amount && parseFloat(amount) > 0;

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-xl font-bold mb-4 text-white">Deposit DOT</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-gray-300 mb-2">Amount (DOT)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setTxStatus("idle");
            }}
            placeholder="Enter amount"
            min="0"
            step="0.01"
            className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {isValidAmount && (
          <div className="bg-gray-700 rounded p-4">
            <p className="text-gray-300 mb-2">Your {amount} DOT will be deployed:</p>
            {allocations.map((a) => (
              <div key={a.chain} className="flex justify-between text-gray-400">
                <span>{a.chain}</span>
                <span>{((parseFloat(amount) * a.pct) / 100).toFixed(2)} DOT</span>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {txStatus === "success" && txHash && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded p-3">
            <p className="text-emerald-400 text-sm mb-1">Deposit successful!</p>
            <a
              href={`https://assethub-westend.subscan.io/extrinsic/${txHash}`}
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
          disabled={isLoading || !isValidAmount || !isConnected || txStatus === "pending"}
          className="w-full py-3 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {!isConnected 
            ? "Connect Wallet to Deposit" 
            : isLoading || txStatus === "pending" 
              ? "Depositing..." 
              : `Mint ${basketName} Token`
          }
        </button>
      </div>
    </div>
  );
}
