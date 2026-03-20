import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useBasketManager } from "../hooks/useBasketManager";
import { formatUnits } from "viem";
import { APP_NATIVE_DECIMALS, APP_NATIVE_SYMBOL } from "../config/contracts";
import {
  getCustomBaskets,
  customBasketToPreview,
  deleteCustomBasket,
  type CustomBasket,
  type CustomBasketPreview,
} from "../utils/customBaskets";

interface BasketInfo {
  id: bigint;
  name: string;
  symbol: string;
  totalDeposited: bigint;
  active: boolean;
  allocations: Array<{ chain: string; weight: number; paraId: number }>;
  token: string;
  isCustom?: boolean;
  customId?: string;
  status?: "draft" | "pending" | "deployed";
}

const CHAIN_COLORS: Record<string, string> = {
  "Hydration LP": "#E6007A",
  "Hydration Stable": "#E6007A",
  "Moonbeam Lending": "#53CBC9",
  "Moonbeam Liquid Staking": "#53CBC9",
  "Moonbeam Leverage": "#53CBC9",
  "Acala Staking": "#FF4B4B",
  "Acala Leverage": "#FF4B4B",
};

const CHAIN_ICONS: Record<number, string> = {
  2034: "💧",
  2004: "🌙",
  2000: "🔺",
};

// All 4 baskets as fallback
const FALLBACK_BASKETS: BasketInfo[] = [
  {
    id: 0n,
    name: "xDOT Liquidity Basket",
    symbol: "xDOT-LIQ",
    totalDeposited: 1250000000000000000000n,
    active: true,
    token: "0xD9FEBB375aCE5226AF1AA4146988Af2BDB8A1e8B",
    allocations: [
      { paraId: 2034, chain: "Hydration LP", weight: 40 },
      { paraId: 2004, chain: "Moonbeam Lending", weight: 30 },
      { paraId: 2000, chain: "Acala Staking", weight: 30 },
    ],
  },
  {
    id: 1n,
    name: "Yield Maximizer",
    symbol: "xSTABLE",
    totalDeposited: 850000000000000000000n,
    active: true,
    token: "0x1234567890123456789012345678901234567890",
    allocations: [
      { paraId: 2034, chain: "Hydration Stable", weight: 50 },
      { paraId: 2004, chain: "Moonbeam Liquid Staking", weight: 50 },
    ],
  },
  {
    id: 2n,
    name: "High Growth Alpha",
    symbol: "xRISK",
    totalDeposited: 320000000000000000000n,
    active: true,
    token: "0x0987654321098765432109876543210987654321",
    allocations: [
      { paraId: 2004, chain: "Moonbeam Leverage", weight: 60 },
      { paraId: 2000, chain: "Acala Leverage", weight: 40 },
    ],
  },
  {
    id: 3n,
    name: "Balanced Diversifier",
    symbol: "xBAL",
    totalDeposited: 560000000000000000000n,
    active: true,
    token: "0xabcdef0123456789abcdef0123456789abcdef01",
    allocations: [
      { paraId: 2034, chain: "Hydration LP", weight: 34 },
      { paraId: 2004, chain: "Moonbeam Lending", weight: 33 },
      { paraId: 2000, chain: "Acala Staking", weight: 33 },
    ],
  },
];

export function BasketsListPage() {
  const { getNextBasketId, getBasket } = useBasketManager();
  const [baskets, setBaskets] = useState<BasketInfo[]>(FALLBACK_BASKETS);
  const [loading] = useState(false);
  const [filter, setFilter] = useState<"all" | "active">("all");
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareBasket, setShareBasket] = useState<BasketInfo | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleShare = (basket: BasketInfo) => {
    setShareBasket(basket);
    setShowShareModal(true);
  };

  const handleDeleteBasket = (customId: string) => {
    if (deleteCustomBasket(customId)) {
      setRefreshKey(k => k + 1);
      // Reload custom baskets into state
      const custom = getCustomBaskets().map(customBasketToPreview).map(c => ({
        id: 999999n,
        name: c.name,
        symbol: c.symbol,
        totalDeposited: 0n,
        active: c.status === "deployed",
        allocations: c.allocations,
        token: "",
        isCustom: true,
        customId: c.id,
        status: c.status,
      }));
      setBaskets(prev => prev.filter(b => !b.isCustom || custom.some(c => c.customId === b.customId)));
    }
  };

  // Always show all 4 baskets - only add more if they exist on-chain
  useEffect(() => {
    // Load custom baskets from localStorage
    const custom = getCustomBaskets().map(customBasketToPreview).map(c => ({
      id: 999999n,
      name: c.name,
      symbol: c.symbol,
      totalDeposited: 0n,
      active: c.status === "deployed",
      allocations: c.allocations,
      token: "",
      isCustom: true,
      customId: c.id,
      status: c.status,
    }));
    
    // Build default + custom list
    const base = FALLBACK_BASKETS.map(b => ({ ...b }));
    const all = custom.length > 0 ? [...base, ...custom] : base;
    setBaskets(all);
    
    fetchAdditionalBaskets();
  }, [refreshKey]);

  async function fetchAdditionalBaskets() {
    try {
      const nextId = await getNextBasketId();
      const currentCount = FALLBACK_BASKETS.length;
      
      if (Number(nextId) > currentCount) {
        const additionalBaskets: BasketInfo[] = [];
        
        for (let i = currentCount; i < Number(nextId); i++) {
          const basket = await fetchBasketInfo(BigInt(i));
          if (basket) {
            additionalBaskets.push(basket);
          }
        }
        
        if (additionalBaskets.length > 0) {
          setBaskets(prev => {
            const custom = prev.filter(b => b.isCustom);
            return [...FALLBACK_BASKETS, ...additionalBaskets, ...custom];
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch additional baskets:", error);
    }
  }

  async function fetchBasketInfo(basketId: bigint): Promise<BasketInfo | null> {
    try {
      const basket = await getBasket(basketId);
      if (!basket) return null;

      const chainNames: Record<number, string> = {
        2034: "Hydration LP",
        2004: "Moonbeam Lending",
        2000: "Acala Staking",
      };

      return {
        id: basket.id,
        name: basket.name,
        symbol: basket.name.replace(/\s+Basket/gi, "").toUpperCase() || "BASKET",
        totalDeposited: basket.totalDeposited,
        active: basket.active,
        token: basket.token,
        allocations: basket.allocations.map((a) => ({
          paraId: Number(a.paraId),
          chain: chainNames[Number(a.paraId)] || `Para ${a.paraId}`,
          weight: Number(a.weightBps) / 100,
        })),
      };
    } catch (error) {
      console.error(`Failed to fetch basket ${basketId}:`, error);
      return null;
    }
  }

  const filteredBaskets = filter === "active" 
    ? baskets.filter(b => b.active || (b.isCustom && b.status === "deployed")) 
    : baskets;

  const totalTVL = baskets.reduce((acc, b) => acc + b.totalDeposited, 0n);

  return (
    <div className="min-h-screen bg-neutral-950 pt-24 pb-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Basket Listings
          </h1>
          <p className="mt-2 text-neutral-400">
            Browse all available cross-chain yield strategies
          </p>
        </div>

        {/* Stats & Filter */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                Total Baskets
              </p>
              <p className="text-2xl font-bold text-white">{baskets.length}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                Total TVL
              </p>
              <p className="text-2xl font-bold text-emerald-400">
                {Number(formatUnits(totalTVL, APP_NATIVE_DECIMALS)).toLocaleString()} {APP_NATIVE_SYMBOL}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                Active
              </p>
              <p className="text-2xl font-bold text-white">
                {baskets.filter(b => b.active || (b.isCustom && b.status === "deployed")).length}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                filter === "all"
                  ? "bg-white text-neutral-950"
                  : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("active")}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                filter === "active"
                  ? "bg-emerald-500 text-white"
                  : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
              }`}
            >
              Active Only
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-20">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-neutral-600 border-t-neutral-400" />
          </div>
        )}

        {/* Baskets Grid - Card Based Layout */}
        {!loading && filteredBaskets.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredBaskets.map((basket) => (
              <BasketCard key={basket.id.toString()} basket={basket} onShare={handleShare} />
            ))}
          </div>
        )}

        {/* Share Modal */}
        {showShareModal && shareBasket && (
          <ShareModalWeb basket={shareBasket} onClose={() => { setShowShareModal(false); setShareBasket(null); }} />
        )}
      </div>
    </div>
  );
}

function BasketCard({ basket, onShare }: { basket: BasketInfo; onShare?: (basket: BasketInfo) => void }) {
  const formattedTVL = Number(formatUnits(basket.totalDeposited, APP_NATIVE_DECIMALS)).toLocaleString(undefined, { maximumFractionDigits: 1 });
  const isCustom = basket.isCustom;
  const isPending = isCustom && (basket.status === "pending" || basket.status === "draft");
  
  return (
    <div className={`group relative overflow-hidden rounded-3xl border bg-neutral-900 p-6 transition ${
      isPending ? "border-yellow-500/20 hover:border-yellow-500/40" : "border-white/10 hover:border-white/20 hover:bg-neutral-800/50 hover:shadow-xl hover:shadow-emerald-500/10"
    }`}>
      {/* Status Badge */}
      <div className="absolute right-4 top-4">
        {isCustom ? (
          <span className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            {basket.status === "pending" ? "Pending Approval" : basket.status === "deployed" ? "Active" : "Draft"}
          </span>
        ) : (
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
              basket.active
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-neutral-500/20 text-neutral-400 border border-neutral-500/30"
            }`}
          >
            {basket.active ? "Active" : "Inactive"}
          </span>
        )}
      </div>

      {/* Custom Basket Badge */}
      {isCustom && (
        <div className="absolute left-4 top-4">
          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
            Custom
          </span>
        </div>
      )}

      {/* Header with Icon */}
      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-4xl">
          🧺
        </div>
        <div className="flex-1 pt-1">
          <h3 className="text-xl font-bold text-white leading-tight">{basket.name}</h3>
          <p className="text-sm text-neutral-500 uppercase tracking-wider mt-1">{basket.symbol}</p>
        </div>
      </div>

      {/* TVL */}
      <div className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-2">
          Total Value Locked
        </p>
        <p className="text-3xl font-black text-white">
          {isCustom && basket.totalDeposited === 0n ? "—" : formattedTVL}
          <span className="text-lg font-medium text-neutral-400 ml-2">{APP_NATIVE_SYMBOL}</span>
        </p>
      </div>

      {/* Allocation Bar */}
      <div className="mb-4">
        <div className="flex h-3 overflow-hidden rounded-full">
          {basket.allocations.map((alloc, idx) => (
            <div
              key={idx}
              className="h-full"
              style={{
                width: `${alloc.weight}%`,
                backgroundColor: CHAIN_COLORS[alloc.chain] || `hsl(${(idx * 60) % 360}, 70%, 50%)`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Chain Allocations */}
      <div className="mb-6 flex flex-wrap gap-3">
        {basket.allocations.map((alloc, idx) => (
          <div 
            key={idx} 
            className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 border border-white/5"
          >
            <span className="text-lg">{CHAIN_ICONS[alloc.paraId] || "🔗"}</span>
            <span className="text-sm font-medium text-white">{alloc.weight}%</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {isPending ? (
          <>
            <span className="flex-1 rounded-xl border border-yellow-500/20 bg-yellow-500/5 py-3 text-center text-sm font-bold text-yellow-400">
              Pending Approval
            </span>
            {onShare && (
              <button
                onClick={() => onShare(basket)}
                className="px-4 py-3 rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400 transition hover:bg-blue-500/20"
                aria-label="Share"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
            )}
            <button
              disabled
              className="flex-1 rounded-xl bg-neutral-700 py-3 text-center text-sm font-bold text-neutral-400 cursor-not-allowed opacity-50"
            >
              Invest
            </button>
          </>
        ) : (
          <>
            <Link
              to={`/basket/${basket.id}`}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-center text-sm font-bold text-white transition hover:bg-white/10"
            >
              View Details
            </Link>
            {onShare && (
              <button
                onClick={() => onShare(basket)}
                className="px-4 py-3 rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400 transition hover:bg-blue-500/20"
                aria-label="Share"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
            )}
            <Link
              to={`/basket/${basket.id}`}
              className="flex-1 rounded-xl bg-emerald-500 py-3 text-center text-sm font-bold text-white transition hover:bg-emerald-600"
            >
              Invest
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function ShareModalWeb({ basket, onClose }: { basket: BasketInfo; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  
  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/basket/${basket.id}` 
    : `https://polkabasket.io/basket/${basket.id}`;
  
  const shareText = `Check out ${basket.name} on PolkaBasket! 🧺\n\nDiversified yield across multiple parachains:\n${basket.allocations.map(a => `• ${a.chain}: ${a.weight}%`).join('\n')}\n\nStart earning today! 🚀`;
  
  const referralCode = `POLKA-${basket.symbol}`;
  
  const socialPlatforms = [
    { id: 'twitter', name: 'Twitter', icon: '𝕏', url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}` },
    { id: 'telegram', name: 'Telegram', icon: '✈️', url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}` },
    { id: 'whatsapp', name: 'WhatsApp', icon: '💬', url: `https://wa.me/?text=${encodeURIComponent(shareText + '\n\n' + shareUrl)}` },
    { id: 'email', name: 'Email', icon: '✉️', url: `mailto:?subject=${encodeURIComponent('Check out this basket on PolkaBasket!')}&body=${encodeURIComponent(shareText + '\n\n' + shareUrl)}` },
  ];

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
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
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Share & Invite</h2>
              <p className="text-sm text-neutral-500 mt-1">Invite friends to {basket.name}</p>
            </div>
            <button onClick={onClose} className="rounded-full bg-white/5 p-2 text-neutral-400 hover:bg-white/10 hover:text-white transition">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
            <div className="text-4xl">🧺</div>
            <div>
              <h3 className="font-bold text-white">{basket.name}</h3>
              <p className="text-sm text-neutral-500">{basket.symbol}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-3">Share via</p>
            <div className="grid grid-cols-4 gap-2">
              {socialPlatforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => window.open(platform.url, '_blank', 'noopener,noreferrer')}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
                >
                  <span className="text-2xl">{platform.icon}</span>
                  <span className="text-[10px] text-neutral-400">{platform.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-3">Copy Link</p>
            <div className="flex gap-2">
              <input type="text" value={shareUrl} readOnly className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/70 truncate" />
              <button onClick={() => handleCopy(shareUrl)} className={`px-4 py-3 rounded-xl font-bold text-sm transition ${copied ? 'bg-emerald-500 text-white' : 'bg-white text-neutral-900 hover:bg-neutral-200'}`}>
                {copied ? '✓' : 'Copy'}
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-3">Your Referral Code</p>
            <div className="flex gap-2">
              <input type="text" value={referralCode} readOnly className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/70 font-mono" />
              <button onClick={() => handleCopy(referralCode)} className="px-4 py-3 rounded-xl font-bold text-sm bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition">
                {copied ? '✓' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-white/5 text-center">
          <p className="text-[10px] text-neutral-600 uppercase tracking-widest">Share PolkaBasket with friends & earn yield! 🚀</p>
        </div>
      </div>
    </div>
  );
}
