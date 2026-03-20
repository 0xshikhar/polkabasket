import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useBasketManager } from "../hooks/useBasketManager";
import { formatUnits } from "viem";
import { APP_NATIVE_DECIMALS, APP_NATIVE_SYMBOL } from "../config/contracts";
import { DepositForm } from "../components/DepositForm";
import { WithdrawForm } from "../components/WithdrawForm";
import {
  getCustomBaskets,
  customBasketToPreview,
} from "../utils/customBaskets";

interface BasketPreview {
  id: bigint;
  name: string;
  symbol: string;
  totalDeposited: bigint;
  active: boolean;
  allocations: Array<{ chain: string; weight: number }>;
  isCustom?: boolean;
  customId?: string;
  status?: "draft" | "pending" | "deployed";
}

const MOCK_BASKETS: (BasketPreview & { creator: string })[] = [
  {
    id: 0n,
    name: "xDOT Liquidity Basket",
    symbol: "xDOT-LIQ",
    totalDeposited: 1250000n,
    active: true,
    creator: "PolkaBasket",
    allocations: [
      { chain: "Hydration LP", weight: 40 },
      { chain: "Moonbeam Lending", weight: 30 },
      { chain: "Acala Staking", weight: 30 },
    ],
  },
  {
    id: 1n,
    name: "Yield Maximizer",
    symbol: "xSTABLE",
    totalDeposited: 850000n,
    active: true,
    creator: "PolkaBasket",
    allocations: [
      { chain: "Hydration Stable", weight: 50 },
      { chain: "Moonbeam Liquid Staking", weight: 50 },
    ],
  },
  {
    id: 2n,
    name: "High Growth Alpha",
    symbol: "xRISK",
    totalDeposited: 320000n,
    active: true,
    creator: "Alpha Strategies",
    allocations: [
      { chain: "Moonbeam Leverage", weight: 60 },
      { chain: "Acala Leverage", weight: 40 },
    ],
  },
  {
    id: 3n,
    name: "Balanced Diversifier",
    symbol: "xBAL",
    totalDeposited: 560000n,
    active: true,
    creator: "PolkaBasket",
    allocations: [
      { chain: "Hydration LP", weight: 34 },
      { chain: "Moonbeam Lending", weight: 33 },
      { chain: "Acala Staking", weight: 33 },
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
  const { getNextBasketId, getBasket } = useBasketManager();
  const [baskets, setBaskets] = useState<(BasketPreview & { creator: string })[]>(MOCK_BASKETS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<"left" | "right" | null>(null);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareBasket, setShareBasket] = useState<(BasketPreview & { creator: string }) | null>(null);

  async function fetchBasketInfo(basketId: bigint): Promise<(BasketPreview & { creator: string }) | null> {
    try {
      const basket = await getBasket(basketId);
      if (!basket) return null;

      const chainNames: Record<number, string> = {
        2034: "Hydration LP",
        2004: "Moonbeam Lending",
        2000: "Acala Staking",
      };

      const symbol = basket.name.replace(/\s+Basket/gi, "").replace(/\s+/g, "-").toUpperCase() || "BASKET";

      return {
        id: basket.id,
        name: basket.name,
        symbol: symbol,
        totalDeposited: basket.totalDeposited,
        active: basket.active,
        creator: "PolkaBasket",
        allocations: basket.allocations.map((a) => ({
          chain: chainNames[Number(a.paraId)] || `Para ${a.paraId}`,
          weight: Number(a.weightBps) / 100,
        })),
      };
    } catch (error) {
      console.error(`Failed to fetch basket ${basketId}:`, error);
      return null;
    }
  }

  async function fetchAdditionalBaskets() {
    try {
      // Load custom baskets
      const custom = getCustomBaskets().map(customBasketToPreview).map(c => ({
        id: 999999n,
        name: c.name,
        symbol: c.symbol,
        totalDeposited: 0n,
        active: c.status === "deployed",
        creator: c.creator === "anonymous" ? "You" : c.creator.slice(0, 8) + "...",
        allocations: c.allocations.map(a => ({ chain: a.chain, weight: a.weight })),
        isCustom: true,
        customId: c.id,
        status: c.status,
      }));

      const nextId = await getNextBasketId();
      const currentCount = MOCK_BASKETS.length;

      const additionalBaskets: (BasketPreview & { creator: string })[] = [];

      if (Number(nextId) > currentCount) {
        for (let i = currentCount; i < Number(nextId); i++) {
          const basket = await fetchBasketInfo(BigInt(i));
          if (basket) {
            additionalBaskets.push(basket);
          }
        }
      }

      setBaskets([...MOCK_BASKETS, ...additionalBaskets, ...custom]);
    } catch (error) {
      console.error("Failed to fetch baskets:", error);
    }
  }

  useEffect(() => {
    fetchAdditionalBaskets();
  }, []);

  const handleShare = (basket: BasketPreview & { creator: string }) => {
    setShareBasket(basket);
    setShowShareModal(true);
  };

  const handleSwipe = (dir: "left" | "right") => {
    setDirection(dir);

    if (dir === "right") {
      // Show deposit modal on right swipe
      setTimeout(() => {
        setShowDepositModal(true);
        setDirection(null);
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
                  <BasketCard basket={currentBasket} onShare={handleShare} />
                </div>

                {/* Controls */}
                <div className="absolute -bottom-24 left-0 right-0 flex justify-center gap-6 pb-12">
                  <button
                    onClick={() => handleSwipe("left")}
                    className="flex h-14 w-14 items-center justify-center rounded-full border border-red-500/20 bg-neutral-900 text-red-500 shadow-xl transition hover:bg-neutral-800 active:scale-95"
                    aria-label="Pass"
                  >
                    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  <button
                    onClick={() => handleSwipe("right")}
                    className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/20 bg-neutral-900 text-emerald-400 shadow-xl transition hover:bg-neutral-800 active:scale-95"
                    aria-label="Invest"
                  >
                    <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
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
                <p className="mt-2 text-neutral-400">You've seen all available baskets.</p>
                <div className="mt-8 flex gap-4">
                  <button
                    onClick={() => setCurrentIndex(0)}
                    className="rounded-xl border border-white/10 px-6 py-2 text-sm font-medium text-white transition hover:bg-white/5"
                  >
                    Start Over
                  </button>
                </div>
              </div>
            )}
          </div>
      </div>

      {showDepositModal && (
        <DepositWithdrawModal
          basket={baskets[currentIndex]}
          onClose={() => {
            setShowDepositModal(false);
          }}
        />
      )}
      {showShareModal && shareBasket && (
        <ShareModal
          basket={shareBasket}
          onClose={() => {
            setShowShareModal(false);
            setShareBasket(null);
          }}
        />
      )}
    </div>
  );
}

function DepositWithdrawModal({ basket, onClose }: { basket: BasketPreview & { creator: string }; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");

  // Map preview allocations to form allocations
  const formAllocations = basket.allocations.map(a => {
    let paraId = 2034; // Default Hydration
    if (a.chain.includes("Moonbeam")) paraId = 2004;
    if (a.chain.includes("Acala")) paraId = 2000;
    return { chain: a.chain, paraId, pct: a.weight };
  });

  const withdrawAllocations = basket.allocations.map(a => {
    let paraId = 2034;
    if (a.chain.includes("Moonbeam")) paraId = 2004;
    if (a.chain.includes("Acala")) paraId = 2000;
    return { paraId, weightBps: a.weight * 100 };
  });

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-xl overflow-hidden rounded-[2.5rem] border border-white/10 bg-neutral-900 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/5 p-6 bg-white/[0.02]">
          <div>
            <h2 className="text-xl font-bold text-white">{basket.name}</h2>
            <p className="text-xs text-neutral-500 uppercase tracking-widest mt-1">Manage Investment</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-white/5 p-2 text-neutral-400 hover:bg-white/10 hover:text-white transition"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Custom Tabs */}
        <div className="flex p-2 bg-white/5 m-6 rounded-2xl border border-white/5">
          <button
            onClick={() => setActiveTab("deposit")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === "deposit"
              ? "bg-emerald-500 text-neutral-950 shadow-lg"
              : "text-neutral-400 hover:text-white"
              }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Deposit
          </button>
          <button
            onClick={() => setActiveTab("withdraw")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === "withdraw"
              ? "bg-red-500 text-white shadow-lg"
              : "text-neutral-400 hover:text-white"
              }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
            Withdraw
          </button>
        </div>

        {/* Form Content */}
        <div className="px-6 pb-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {activeTab === "deposit" ? (
            <div className="premium-form-wrapper">
              <DepositForm
                basketId={basket.id}
                basketName={basket.symbol}
                allocations={formAllocations}
              />
            </div>
          ) : (
            <div className="premium-form-wrapper">
              <WithdrawForm
                basketId={basket.id}
                tokenSymbol={basket.symbol}
                allocations={withdrawAllocations}
                userTokenBalance="0.00" // In a real app we'd fetch balance
              />
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 bg-white/[0.02] border-t border-white/5 text-center">
          <p className="text-[10px] text-neutral-600 uppercase tracking-widest font-bold">
            Secure Cross-Chain Transaction via ERC-8004
          </p>
        </div>
      </div>

      <style>{`
        .premium-form-wrapper > div {
          background: transparent !important;
          padding: 0 !important;
        }
        .premium-form-wrapper h3 {
          display: none; /* Hide internal form headers */
        }
        .premium-form-wrapper input {
          background: rgba(255, 255, 255, 0.03) !important;
          border: 1px solid rgba(255, 255, 255, 0.05) !important;
          border-radius: 1rem !important;
          padding: 1rem !important;
        }
        .premium-form-wrapper button {
          border-radius: 1rem !important;
          font-weight: 800 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          font-size: 0.875rem !important;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
function BasketCard({ basket, isStatic = false, onShare }: { basket: BasketPreview & { creator: string }; isStatic?: boolean; onShare?: (basket: BasketPreview & { creator: string }) => void }) {
  const isCustom = basket.isCustom;
  const isPending = isCustom && (basket.status === "pending" || basket.status === "draft");
  
  return (
    <div className={`h-full w-full overflow-hidden rounded-[2.5rem] border bg-neutral-900 p-8 shadow-2xl transition ${
      isPending ? "border-yellow-500/30" : "border-white/10 hover:border-white/20"
    } ${!isStatic ? 'ring-1 ring-white/5' : ''}`}>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-bold text-white">{basket.name}</h3>
              {isCustom && (
                <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-blue-400">
                  Custom
                </span>
              )}
            </div>
            <p className={`text-xs font-medium uppercase tracking-widest ${isPending ? "text-yellow-500" : "text-neutral-500"}`}>
              {isPending ? "Pending Approval" : "Yield Strategy: Moderate Risk"}
            </p>
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
              className={isPending ? "text-yellow-500" : "text-emerald-500"}
            />
            <path
              d="M0 50 Q 20 40, 40 45 T 80 30 T 120 35 T 160 15 L 200 20 V 60 H 0 Z"
              fill="url(#gradient-green)"
              opacity="0.1"
            />
            <defs>
              <linearGradient id="gradient-green" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isPending ? "#F59E0B" : "#10B981"} />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Stats Grid */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white/[0.03] p-4 border border-white/5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Target APY</p>
            <p className={`mt-1 text-xl font-bold ${isPending ? "text-yellow-400" : "text-emerald-400"}`}>12.4%</p>
          </div>
          <div className="rounded-2xl bg-white/[0.03] p-4 border border-white/5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Total TVL</p>
            <p className="mt-1 text-xl font-bold text-white">
              {isPending ? "—" : (Number(formatUnits(basket.totalDeposited, APP_NATIVE_DECIMALS))).toLocaleString()}
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
          <div className="mt-6 border-t border-white/5 pt-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isPending ? (
                <span className="px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-[10px] font-bold uppercase tracking-widest text-yellow-400 shadow-lg">
                  Pending Approval
                </span>
              ) : (
                <Link
                  to={`/basket/${basket.id}`}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-emerald-500 hover:bg-white/10 hover:border-emerald-500/30 transition shadow-lg"
                >
                  View Full Details
                </Link>
              )}

              {onShare && (
                <button
                  onClick={() => onShare(basket)}
                  className="px-3 py-2 rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition"
                  aria-label="Share"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </button>
              )}
            </div>

            <div className="flex flex-col items-end">
              <span className="text-[8px] uppercase tracking-[0.2em] text-neutral-600 font-black mb-1">Created By</span>
              <button className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold text-white transition ${
                isPending 
                  ? "bg-yellow-500/10 border-yellow-500/20 hover:bg-yellow-500/20" 
                  : "bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20"
              }`}>
                {basket.creator}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ShareModal({ basket, onClose }: { basket: BasketPreview & { creator: string }; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== 'undefined'
    ? `https://polkabasket.vercel.app/basket/${basket.id}`
    : `https://polkabasket.vercel.app/basket/${basket.id}`;

  const shareText = `Check out ${basket.name} on PolkaBasket! 🧺\n\nDiversified yield across multiple parachains:\n${basket.allocations.map(a => `• ${a.chain}: ${a.weight}%`).join('\n')}\n\nStart earning today! 🚀`;

  const referralCode = `POLKA-${basket.symbol}`;

  const socialPlatforms = [
    {
      id: 'twitter',
      name: 'Twitter',
      icon: '𝕏',
      color: '#1DA1F2',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      bgClass: 'hover:bg-[#1DA1F2]/20'
    },
    {
      id: 'telegram',
      name: 'Telegram',
      icon: '✈️',
      color: '#0088cc',
      url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
      bgClass: 'hover:bg-[#0088cc]/20'
    },
    {
      id: 'discord',
      name: 'Discord',
      icon: '💬',
      color: '#5865F2',
      url: '#',
      bgClass: 'hover:bg-[#5865F2]/20'
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: '💬',
      color: '#25D366',
      url: `https://wa.me/?text=${encodeURIComponent(shareText + '\n\n' + shareUrl)}`,
      bgClass: 'hover:bg-[#25D366]/20'
    },
    {
      id: 'email',
      name: 'Email',
      icon: '✉️',
      color: '#EA4335',
      url: `mailto:?subject=${encodeURIComponent('Check out this basket on PolkaBasket!')}&body=${encodeURIComponent(shareText + '\n\n' + shareUrl)}`,
      bgClass: 'hover:bg-[#EA4335]/20'
    },
  ];

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCopyReferral = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-neutral-900 shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Share & Invite</h2>
              <p className="text-sm text-neutral-500 mt-1">Invite friends to {basket.name}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full bg-white/5 p-2 text-neutral-400 hover:bg-white/10 hover:text-white transition"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basket Preview */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
            <div className="text-4xl">🧺</div>
            <div>
              <h3 className="font-bold text-white">{basket.name}</h3>
              <p className="text-sm text-neutral-500">{basket.symbol}</p>
            </div>
          </div>

          {/* Social Share Buttons */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-3">Share via</p>
            <div className="grid grid-cols-5 gap-2">
              {socialPlatforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => {
                    if (platform.url !== '#') {
                      window.open(platform.url, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border border-white/10 bg-white/5 transition ${platform.bgClass}`}
                >
                  <span className="text-2xl">{platform.icon}</span>
                  <span className="text-[10px] text-neutral-400">{platform.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Copy Link */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-3">Copy Link</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/70 truncate"
              />
              <button
                onClick={handleCopyLink}
                className={`px-4 py-3 rounded-xl font-bold text-sm transition ${copied
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white text-neutral-900 hover:bg-neutral-200'
                  }`}
              >
                {copied ? '✓' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Referral Code */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-3">Your Referral Code</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={referralCode}
                readOnly
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/70 font-mono"
              />
              <button
                onClick={handleCopyReferral}
                className={`px-4 py-3 rounded-xl font-bold text-sm transition ${copied
                  ? 'bg-emerald-500 text-white'
                  : 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30'
                  }`}
              >
                {copied ? '✓' : 'Copy'}
              </button>
            </div>
            <p className="text-[10px] text-neutral-600 mt-2">
              Earn rewards when friends use your code!
            </p>
          </div>

          {/* Invite Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-xl bg-white/5 border border-white/5">
              <p className="text-2xl font-black text-white">0</p>
              <p className="text-[10px] text-neutral-500 uppercase">Invites</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-white/5 border border-white/5">
              <p className="text-2xl font-black text-white">0</p>
              <p className="text-[10px] text-neutral-500 uppercase">Joined</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-white/5 border border-white/5">
              <p className="text-2xl font-black text-emerald-400">$0</p>
              <p className="text-[10px] text-neutral-500 uppercase">Earned</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 text-center">
          <p className="text-[10px] text-neutral-600 uppercase tracking-widest">
            Share PolkaBasket with friends & earn yield! 🚀
          </p>
        </div>
      </div>
    </div>
  );
}

