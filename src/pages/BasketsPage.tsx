import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  const [baskets, setBaskets] = useState<BasketPreview[]>(MOCK_BASKETS);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<"left" | "right" | null>(null);
  const [showCustomModal, setShowCustomModal] = useState(false);

  useEffect(() => {
    setLoading(false);
  }, []);

  const handleSwipe = (dir: "left" | "right") => {
    setDirection(dir);

    if (dir === "right") {
      // Navigate to details on right swipe
      const currentBasket = baskets[currentIndex];
      setTimeout(() => {
        navigate(`/basket/${currentBasket.id}`);
      }, 300);
      return;
    }

    // Default left swipe: move to next card
    setTimeout(() => {
      setDirection(null);
      setCurrentIndex((prev) => prev + 1);
    }, 300);
  };

  const currentBasket = baskets[currentIndex];
  const isLast = currentIndex >= baskets.length;

  return (
    <div className="min-h-screen bg-neutral-950 pt-20 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:px-10">
        <div className="flex flex-col items-center justify-center text-center mb-12">
          <h1 className="bg-gradient-to-br from-white to-neutral-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl md:text-6xl">
            Explore Baskets
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-400">
            Swipe right to invest, left to skip. Or create your own.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-neutral-600 border-t-neutral-400" />
          </div>
        ) : (
          <div className="relative mx-auto h-[600px] w-full max-w-md perspective-1000">
            {!isLast ? (
              <>
                {/* Next card preview */}
                {currentIndex + 1 < baskets.length && (
                  <div className="absolute inset-0 translate-y-6 scale-95 opacity-40 blur-[2px]">
                    <BasketCard basket={baskets[currentIndex + 1]} isStatic />
                  </div>
                )}

                {/* Active card */}
                <div
                  className={`absolute inset-0 transition-all duration-300 ease-out transform ${direction === "left" ? "-translate-x-[150%] -rotate-12 opacity-0" :
                    direction === "right" ? "translate-x-[150%] rotate-12 opacity-0" :
                      "translate-x-0 rotate-0 opacity-100"
                    }`}
                >
                  <BasketCard basket={currentBasket} />
                </div>

                {/* Controls */}
                <div className="absolute -bottom-24 left-0 right-0 flex justify-center gap-8 pb-12">
                  <button
                    onClick={() => handleSwipe("left")}
                    className="flex h-16 w-16 items-center justify-center rounded-full border border-red-500/20 bg-neutral-900 text-red-500 shadow-xl transition hover:bg-neutral-800 active:scale-95"
                    aria-label="Pass"
                  >
                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setShowCustomModal(true)}
                    className="flex h-14 w-14 mt-1 items-center justify-center rounded-full border border-white/10 bg-neutral-900 text-white shadow-xl transition hover:bg-neutral-800 active:scale-95"
                    aria-label="Create Custom"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleSwipe("right")}
                    className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/20 bg-neutral-900 text-emerald-400 shadow-xl transition hover:bg-neutral-800 active:scale-95"
                    aria-label="Invest"
                  >
                    <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-white/10 bg-neutral-900/50 p-8 text-center backdrop-blur-sm">
                <div className="mb-4 rounded-full bg-white/5 p-4 text-emerald-400">
                  <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white">All Caught Up!</h3>
                <p className="mt-2 text-neutral-400">You've seen all available baskets. Try creating your own custom portfolio.</p>
                <div className="mt-8 flex gap-4">
                  <button
                    onClick={() => setCurrentIndex(0)}
                    className="rounded-xl border border-white/10 px-6 py-2 text-sm font-medium text-white transition hover:bg-white/5"
                  >
                    Start Over
                  </button>
                  <button
                    onClick={() => setShowCustomModal(true)}
                    className="rounded-xl bg-white px-6 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
                  >
                    Create Custom
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showCustomModal && (
        <CreateBasketModal
          onClose={() => setShowCustomModal(false)}
          onCreated={(newBasket) => {
            // We no longer add the custom basket to the local swiper state
            // because it needs admin approval first.
            console.log("New basket submitted for approval:", newBasket);
            setShowCustomModal(false);
            // Optionally we could show a global toast here if we had a toast system
          }}
        />
      )}
    </div>
  );
}
function BasketCard({ basket, isStatic = false }: { basket: BasketPreview; isStatic?: boolean }) {
  return (
    <div className={`h-full w-full overflow-hidden rounded-[2.5rem] border border-white/10 bg-neutral-900 p-8 shadow-2xl transition hover:border-white/20 ${!isStatic ? 'ring-1 ring-white/5' : ''}`}>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="text-2xl font-bold text-white">{basket.name}</h3>
            <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">Yield Strategy: Moderate Risk</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-white/5 p-2.5 text-white">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>

        {/* Hardcoded Value for "Premium" feel */}
        <div className="mt-6 flex items-baseline gap-2">
          <span className="text-4xl font-black text-white">100</span>
          <span className="text-lg font-bold text-neutral-500">{APP_NATIVE_SYMBOL}</span>
        </div>
        <p className="text-[10px] uppercase tracking-widest text-neutral-600 font-bold">Current Allocation Basis</p>

        {/* Mini Performance Chart (Static SVG) */}
        <div className="mt-6 h-20 w-full opacity-60">
          <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 200 60">
            <path
              d="M0 50 Q 20 40, 40 45 T 80 30 T 120 35 T 160 15 L 200 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-emerald-500"
            />
            <path
              d="M0 50 Q 20 40, 40 45 T 80 30 T 120 35 T 160 15 L 200 20 V 60 H 0 Z"
              fill="url(#gradient-green)"
              opacity="0.1"
            />
            <defs>
              <linearGradient id="gradient-green" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Stats Grid */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white/[0.03] p-4 border border-white/5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Target APY</p>
            <p className="mt-1 text-xl font-bold text-emerald-400">12.4%</p>
          </div>
          <div className="rounded-2xl bg-white/[0.03] p-4 border border-white/5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Total TVL</p>
            <p className="mt-1 text-xl font-bold text-white">
              {(Number(formatUnits(basket.totalDeposited, APP_NATIVE_DECIMALS))).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Allocation List */}
        <div className="mt-6 flex-grow">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Parachain Spread</p>
          <div className="space-y-2">
            {basket.allocations.map((alloc, i) => (
              <div key={i} className="flex items-center justify-between group">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: CHAIN_COLORS[alloc.chain] || '#fff' }}
                  />
                  <span className="text-xs font-medium text-neutral-300 group-hover:text-white transition">{alloc.chain}</span>
                </div>
                <span className="text-xs font-bold text-white">{alloc.weight}%</span>
              </div>
            ))}
          </div>
        </div>

        {!isStatic && (
          <div className="mt-6 border-t border-white/5 pt-4 text-center">
            <Link to={`/basket/${basket.id}`} className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 hover:text-emerald-400 transition">View Full Details →</Link>
          </div>
        )}
      </div>
    </div>
  );
}

function CreateBasketModal({ onClose, onCreated }: { onClose: () => void; onCreated: (b: BasketPreview) => void }) {
  const [name, setName] = useState("");
  const [allocations, setAllocations] = useState([
    { chain: "Hydration LP", weight: 50 },
    { chain: "Moonbeam Lending", weight: 50 },
  ]);
  const [isSuccess, setIsSuccess] = useState(false);

  const totalWeight = allocations.reduce((acc, curr) => acc + curr.weight, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalWeight !== 100) return;

    // Show success state first
    setIsSuccess(true);

    // Delay the actual creation so user sees the message
    setTimeout(() => {
      // onCreated(newBasket); // We might want to just close or let user click
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-neutral-900 p-8 shadow-2xl">

        {isSuccess ? (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-white">Basket Created!</h2>
            <p className="mt-4 text-neutral-400">
              Your custom strategy has been submitted. <br />
              <span className="text-white font-medium">An admin will review and approve your basket shortly.</span>
            </p>
            <button
              onClick={() => {
                onCreated({
                  id: BigInt(Date.now()),
                  name: name || "Custom Basket",
                  symbol: "CUSTOM",
                  totalDeposited: 0n,
                  active: true,
                  allocations,
                });
              }}
              className="mt-10 w-full rounded-2xl bg-white py-4 text-sm font-bold text-neutral-950 transition hover:bg-neutral-200"
            >
              Continue to Baskets
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-white mb-2">Create Custom Basket</h2>
            <p className="text-neutral-400 mb-8 text-sm">Design your own cross-chain portfolio.</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2">Basket Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. My Yield Engine"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500">Allocation</label>
                  <span className={`text-xs font-bold ${totalWeight === 100 ? "text-emerald-400" : "text-red-400"}`}>
                    {totalWeight}% / 100%
                  </span>
                </div>

                {["Hydration LP", "Moonbeam Lending", "Acala Staking"].map((chain) => {
                  const alloc = allocations.find((a) => a.chain === chain);
                  return (
                    <div key={chain} className="flex items-center gap-4">
                      <div className="flex-grow">
                        <p className="text-sm font-medium text-white">{chain}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={alloc ? alloc.weight : 0}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            const existing = allocations.find((a) => a.chain === chain);
                            if (existing) {
                              setAllocations(allocations.map((a) => a.chain === chain ? { ...a, weight: val } : a));
                            } else {
                              setAllocations([...allocations, { chain, weight: val }]);
                            }
                          }}
                          className="w-20 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-center text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20"
                        />
                        <span className="text-sm text-neutral-500">%</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 flex gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-bold text-white transition hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={totalWeight !== 100}
                  className="flex-1 rounded-xl bg-white py-3 text-sm font-bold text-neutral-950 transition hover:bg-neutral-200 disabled:opacity-30"
                >
                  Create Basket
                </button>
              </div>
            </form>

            <div className="mt-6 border-t border-white/5 pt-6">
              <p className="text-[10px] text-center text-neutral-500 uppercase tracking-widest">
                Made by You · Combination of Selected Tokens
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

