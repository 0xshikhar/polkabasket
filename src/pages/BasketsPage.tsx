import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useBasketManager } from "../hooks/useBasketManager";
import { formatUnits } from "viem";
import { APP_NATIVE_DECIMALS, APP_NATIVE_SYMBOL } from "../config/contracts";

interface BasketPreview {
  id: bigint;
  name: string;
  symbol: string;
  totalDeposited: bigint;
  active: boolean;
  allocations: Array<{ chain: string; weight: number }>;
}

const MOCK_BASKETS: BasketPreview[] = [
  {
    id: 0n,
    name: "xDOT Liquidity Basket",
    symbol: "xDOT-LIQ",
    totalDeposited: 1250000n,
    active: true,
    allocations: [
      { chain: "Hydration LP", weight: 40 },
      { chain: "Moonbeam Lending", weight: 30 },
      { chain: "Acala Staking", weight: 30 },
    ],
  },
  {
    id: 1n,
    name: "Stable Yield Basket",
    symbol: "xSTABLE",
    totalDeposited: 850000n,
    active: true,
    allocations: [
      { chain: "Hydration Stable", weight: 50 },
      { chain: "Moonbeam Liquid Staking", weight: 50 },
    ],
  },
  {
    id: 2n,
    name: "High Risk Basket",
    symbol: "xRISK",
    totalDeposited: 320000n,
    active: false,
    allocations: [
      { chain: "Moonbeam Leverage", weight: 60 },
      { chain: "Acala Leverage", weight: 40 },
    ],
  },
];

const CHAIN_COLORS: Record<string, string> = {
  "Hydration LP": "#E6007A",
  "Hydration Stable": "#E6007A",
  "Moonbeam Lending": "#53CBC9",
  "Moonbeam Liquid Staking": "#53CBC9",
  "Moonbeam Leverage": "#53CBC9",
  "Acala Staking": "#FF4B4B",
  "Acala Leverage": "#FF4B4B",
};

export function BasketsPage() {
  useBasketManager();
  const [baskets] = useState<BasketPreview[]>(MOCK_BASKETS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 pt-20">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:px-10">
        <div className="flex flex-col items-center justify-center text-center">
          <h1 className="bg-gradient-to-br from-white to-neutral-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl md:text-6xl">
            Available Baskets
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-neutral-400 sm:text-xl">
            Choose a basket. Deposit {APP_NATIVE_SYMBOL}. Your capital is automatically deployed across parachains via XCM.
          </p>
        </div>

        {loading ? (
          <div className="mt-16 flex justify-center py-12">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-neutral-600 border-t-neutral-400" />
          </div>
        ) : (
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {baskets.map((basket) => (
              <BasketCard key={basket.id.toString()} basket={basket} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BasketCard({ basket }: { basket: BasketPreview }) {
  return (
    <Link
      to={`/basket/${basket.id}`}
      className="group block overflow-hidden rounded-3xl border border-white/10 bg-neutral-900 no-underline transition-all hover:border-white/20 hover:bg-neutral-900/90"
    >
      <div className="p-6 sm:p-8">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white transition group-hover:text-white/90">
              {basket.name}
            </h3>
            <p className="mt-1 text-sm text-neutral-400">{basket.symbol}</p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              basket.active ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
            }`}
          >
            {basket.active ? "Active" : "Inactive"}
          </span>
        </div>

        <p className="text-2xl font-bold text-white">
          {Number(formatUnits(basket.totalDeposited, APP_NATIVE_DECIMALS)).toLocaleString()} {APP_NATIVE_SYMBOL}
        </p>
        <p className="text-sm text-neutral-500">TVL</p>

        <div className="mt-6 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Allocation</p>
          <div className="flex h-2 overflow-hidden rounded-full bg-white/5">
            {basket.allocations.map((alloc, i) => (
              <div
                key={i}
                className="h-full transition-all group-hover:opacity-90"
                style={{
                  width: `${alloc.weight}%`,
                  backgroundColor: CHAIN_COLORS[alloc.chain] ?? "#6366f1",
                }}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 pt-2">
            {basket.allocations.map((alloc, i) => (
              <span key={i} className="text-xs text-neutral-400">
                <span
                  className="mr-1.5 inline-block h-1.5 w-1.5 align-middle rounded-full"
                  style={{ backgroundColor: CHAIN_COLORS[alloc.chain] ?? "#6366f1" }}
                />
                {alloc.chain} {alloc.weight}%
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
