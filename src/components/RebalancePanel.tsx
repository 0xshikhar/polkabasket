import { useState, useCallback } from "react";
import { useBasketManager } from "../hooks/useBasketManager";
import { useWallet, useWalletClient } from "../contexts/WalletContext";
import { getExplorerExtrinsicUrl } from "../config/contracts";
import type { WalletClient } from "viem";

interface RebalancePanelProps {
  basketId: bigint;
  allocations?: Array<{
    chain: string;
    currentWeight: number;
    targetWeight: number;
    drift?: number;
  }>;
}

export function RebalancePanel({ 
  basketId,
  allocations = []
}: RebalancePanelProps) {
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [lastRebalance, setLastRebalance] = useState<Date | null>(null);
  const { rebalance, isLoading, error } = useBasketManager();
  const walletClient = useWalletClient();
  const { state } = useWallet();

  const handleRebalance = useCallback(async () => {
    if (!walletClient) return;
    
    setTxStatus("pending");
    setTxHash(null);
    
    try {
      const hash = await rebalance(
        walletClient as WalletClient,
        basketId
      );
      setTxHash(hash);
      setTxStatus("success");
      setLastRebalance(new Date());
    } catch (err) {
      console.error("Rebalance error:", err);
      setTxStatus("error");
    }
  }, [basketId, walletClient, rebalance]);

  const needsRebalance = allocations.some(a => 
    a.drift !== undefined && Math.abs(a.drift) > 200
  );

  const isConnected = state.evm.isConnected;

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">Rebalance</h3>
        {needsRebalance && (
          <span className="px-2 py-1 text-xs font-medium bg-yellow-500/20 text-yellow-400 rounded">
            Rebalance Needed
          </span>
        )}
      </div>
      
      <p className="text-gray-400 text-sm mb-4">
        Trigger rebalancing based on PVM engine recommendations. The Rust engine calculates optimal 
        allocation weights based on yield data and risk tolerance.
      </p>

      {allocations.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-gray-300 text-sm font-medium">Current Allocation vs Target:</p>
          {allocations.map((alloc, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-gray-400">{alloc.chain}</span>
              <div className="flex items-center gap-2">
                <span className="text-white">{alloc.currentWeight}%</span>
                <span className="text-gray-600">→</span>
                <span className="text-emerald-400">{alloc.targetWeight}%</span>
                {alloc.drift !== undefined && Math.abs(alloc.drift) > 0 && (
                  <span className={`text-xs ${Math.abs(alloc.drift) > 200 ? 'text-red-400' : 'text-gray-500'}`}>
                    ({alloc.drift > 0 ? '+' : ''}{alloc.drift} bps)
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded p-3 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {txStatus === "success" && txHash && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded p-3 mb-4">
          <p className="text-emerald-400 text-sm mb-1">Rebalance successful!</p>
          <a
            href={getExplorerExtrinsicUrl(txHash) || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 text-xs hover:underline"
          >
            View on Explorer ↗
          </a>
          {lastRebalance && (
            <p className="text-gray-500 text-xs mt-2">
              Last rebalanced: {lastRebalance.toLocaleTimeString()}
            </p>
          )}
        </div>
      )}

      <button
        onClick={handleRebalance}
        disabled={isLoading || !isConnected || txStatus === "pending"}
        className="w-full py-3 bg-purple-600 text-white rounded font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {!isConnected 
          ? "Connect Wallet to Rebalance" 
          : isLoading || txStatus === "pending"
            ? "Rebalancing..." 
            : "Trigger Rebalance"
        }
      </button>

      <p className="text-gray-600 text-xs mt-3 text-center">
        Calls PVM Engine (Rust/PolkaVM) via staticcall to calculate optimal weights
      </p>
    </div>
  );
}
