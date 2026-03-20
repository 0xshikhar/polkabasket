import { useState } from "react";
import { DepositForm } from "./components/DepositForm";
import { AllocationChart } from "./components/AllocationChart";
import { XCMStatus } from "./components/XCMStatus";
import { BasketCard } from "./components/BasketCard";
import { useBasketManager } from "./hooks/useBasketManager";
import { useWallet } from "./contexts/WalletContext";
import { APP_EXPLORER_URL } from "./config/contracts";

interface BasketPageProps {
  basketId: bigint;
}

export function BasketPage({ basketId }: BasketPageProps) {
  const { state } = useWallet();
  const walletClient = state.evm.walletClient;
  const { rebalance, isLoading } = useBasketManager();
  const [xcmMessages, setXcmMessages] = useState<Array<{
    id: string;
    fromChain: string;
    toChain: string;
    amount: string;
    status: "pending" | "confirmed" | "failed";
    explorerUrl?: string;
  }>>([
    {
      id: "1",
      fromChain: "Polkadot Hub",
      toChain: "Hydration",
      amount: "40",
      status: "confirmed",
      explorerUrl: APP_EXPLORER_URL,
    },
    {
      id: "2",
      fromChain: "Polkadot Hub",
      toChain: "Moonbeam",
      amount: "30",
      status: "pending",
    },
  ]);

  const handleRebalance = async () => {
    if (!walletClient) return;
    try {
      await rebalance(walletClient, basketId);
      setXcmMessages((prev) =>
        prev.map((m) => (m.status === "pending" ? { ...m, status: "confirmed" as const } : m))
      );
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-white mb-8">xDOT Liquidity Basket</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <BasketCard basketId={basketId} />
        <AllocationChart />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <DepositForm basketId={basketId} basketName="xDOT-LIQ" />
        <XCMStatus messages={xcmMessages} />
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-white">Rebalance</h3>
            <p className="text-gray-400">Trigger rebalancing based on PVM engine recommendations</p>
          </div>
          <button
            onClick={handleRebalance}
            disabled={isLoading || !walletClient}
            className="px-6 py-3 bg-purple-600 text-white rounded font-semibold hover:bg-purple-700 disabled:opacity-50"
          >
            {isLoading ? "Rebalancing..." : "Rebalance"}
          </button>
        </div>
      </div>
    </div>
  );
}
