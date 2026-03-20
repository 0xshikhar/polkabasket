import { useEffect, useState } from "react";
import { formatUnits } from "viem";
import { useBasketManager, Basket } from "../hooks/useBasketManager";
import { APP_NATIVE_DECIMALS, APP_NATIVE_SYMBOL } from "../config/contracts";

interface BasketCardProps {
  basketId: bigint;
}

export function BasketCard({ basketId }: BasketCardProps) {
  const { getBasket, getBasketNAV } = useBasketManager();
  const [basket, setBasket] = useState<Basket | null>(null);
  const [nav, setNav] = useState<bigint>(0n);

  useEffect(() => {
    const fetchData = async () => {
      const b = await getBasket(basketId);
      const navValue = await getBasketNAV(basketId);
      setBasket(b);
      setNav(navValue);
    };
    fetchData();
  }, [basketId, getBasket, getBasketNAV]);

  if (!basket) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <p className="text-gray-400">Loading basket...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-white">{basket.name}</h3>
          <p className="text-gray-400">Token: {basket.token}</p>
        </div>
        <span className={`px-3 py-1 rounded text-sm ${basket.active ? "bg-green-600" : "bg-red-600"} text-white`}>
          {basket.active ? "Active" : "Inactive"}
        </span>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-400">Total Deposited</span>
          <span className="text-white font-semibold">{formatUnits(nav, APP_NATIVE_DECIMALS)} {APP_NATIVE_SYMBOL}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Basket ID</span>
          <span className="text-white">{basket.id.toString()}</span>
        </div>
      </div>
    </div>
  );
}
