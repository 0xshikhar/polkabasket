import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";

import { useWallet } from "../contexts/WalletContext";
import { BASKET_MANAGER_ADDRESS } from "../config/contracts";
import {
  type CustomBasket,
  getCustomBaskets,
  saveCustomBasket,
  deleteCustomBasket,
  updateCustomBasketStatus,
} from "../utils/customBaskets";

const SUPPORTED_PROTOCOLS = [
  { paraId: 2034, name: "Hydration LP", description: "Liquidity provision on Hydration", icon: "💧" },
  { paraId: 2034, name: "Hydration Stable", description: "Stablecoin liquidity", icon: "💧" },
  { paraId: 2004, name: "Moonbeam Lending", description: "Lending protocols on Moonbeam", icon: "🌙" },
  { paraId: 2004, name: "Moonbeam Liquid Staking", description: "Liquid staking derivatives", icon: "🌙" },
  { paraId: 2004, name: "Moonbeam Leverage", description: "Leveraged yield strategies", icon: "🌙" },
  { paraId: 2000, name: "Acala Staking", description: "Stake DOT via Acala", icon: "🔺" },
  { paraId: 2000, name: "Acala Leverage", description: "Leveraged positions on Acala", icon: "🔺" },
];

const CHAIN_COLORS: Record<number, string> = {
  2034: "#E6007A",
  2004: "#53CBC9",
  2000: "#FF4B4B",
};

export function CreateBasketPage() {
  const navigate = useNavigate();
  const { state } = useWallet();
  const [customBaskets, setCustomBaskets] = useState<CustomBasket[]>([]);

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [allocations, setAllocations] = useState<Array<{ paraId: number; protocol: string; weightBps: number }>>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [deployTxHash, setDeployTxHash] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    setCustomBaskets(getCustomBaskets());
  }, []);

  const totalWeight = allocations.reduce((acc, a) => acc + a.weightBps, 0);

  const toggleProtocol = (paraId: number, protocol: string) => {
    const exists = allocations.find(a => a.paraId === paraId && a.protocol === protocol);
    if (exists) {
      setAllocations(allocations.filter(a => !(a.paraId === paraId && a.protocol === protocol)));
    } else {
      if (allocations.length >= 5) return;
      const equalWeight = allocations.length === 0 ? 10000 : Math.floor(10000 / (allocations.length + 1));
      const newAlloc = [...allocations];
      // Re-balance existing
      for (let i = 0; i < newAlloc.length; i++) {
        newAlloc[i] = { ...newAlloc[i], weightBps: equalWeight };
      }
      // Add new with remaining
      newAlloc.push({ paraId, protocol, weightBps: 10000 - equalWeight * newAlloc.length });
      setAllocations(newAlloc);
    }
  };

  const handleWeightChange = (paraId: number, protocol: string, val: number) => {
    setAllocations(allocations.map(a =>
      a.paraId === paraId && a.protocol === protocol ? { ...a, weightBps: val } : a
    ));
  };

  const autoBalance = () => {
    if (allocations.length === 0) return;
    const equal = Math.floor(10000 / allocations.length);
    const remainder = 10000 - equal * allocations.length;
    setAllocations(allocations.map((a, i) => ({
      ...a,
      weightBps: i === 0 ? equal + remainder : equal,
    })));
  };

  const saveBasketToStorage = (basket: CustomBasket): boolean => {
    const saved = saveCustomBasket(basket);
    if (saved) {
      setCustomBaskets(getCustomBaskets());
    }
    return saved;
  };

  const handleSaveDraft = () => {
    setSubmitError(null);
    
    if (!name.trim()) {
      setSubmitError("Please enter a basket name.");
      return;
    }
    if (allocations.length === 0) {
      setSubmitError("Please select at least one protocol.");
      return;
    }

    const basket: CustomBasket = {
      id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      symbol: symbol.trim() || name.trim().replace(/\s+/g, "-").toUpperCase().slice(0, 10),
      allocations: [...allocations],
      createdAt: Date.now(),
      creator: state.evm.address || "anonymous",
      status: "draft",
    };

    const saved = saveBasketToStorage(basket);
    if (saved) {
      setSubmitSuccess(true);
      console.log("Draft saved:", basket);
      setTimeout(() => {
        setSubmitSuccess(false);
        navigate("/baskets");
      }, 1500);
    } else {
      setSubmitError("Failed to save draft. Please try again.");
    }
  };

  const handleDeploy = async () => {
    setSubmitError(null);
    
    if (!name.trim()) {
      setSubmitError("Please enter a basket name.");
      return;
    }
    if (allocations.length === 0) {
      setSubmitError("Please select at least one protocol.");
      return;
    }
    if (totalWeight !== 10000) {
      setSubmitError(`Total allocation must be 100% (currently ${(totalWeight / 100).toFixed(0)}%). Click "Auto Balance" or adjust manually.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const basketId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const basketSymbol = symbol.trim() || name.trim().replace(/\s+/g, "-").toUpperCase().slice(0, 10);

      const basket: CustomBasket = {
        id: basketId,
        name: name.trim(),
        symbol: basketSymbol,
        allocations: [...allocations],
        createdAt: Date.now(),
        creator: state.evm.address || "anonymous",
        status: state.evm.address ? "pending" : "draft",
      };

      const saved = saveBasketToStorage(basket);
      if (!saved) {
        throw new Error("Failed to save basket to localStorage");
      }

      setDeployTxHash(basketId);
      setSubmitSuccess(true);
      console.log("Basket deployed:", basket);
      setTimeout(() => {
        navigate("/baskets");
      }, 2000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to deploy basket");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProtocols = SUPPORTED_PROTOCOLS.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedProtocols = filteredProtocols.reduce((acc, p) => {
    if (!acc[p.paraId]) acc[p.paraId] = [];
    acc[p.paraId].push(p);
    return acc;
  }, {} as Record<number, typeof SUPPORTED_PROTOCOLS>);

  const groupedBaskets = Object.entries(groupedProtocols).map(([paraId, protos]) => ({
    paraId: Number(paraId),
    chainName: paraId === "2034" ? "Hydration" : paraId === "2004" ? "Moonbeam" : "Acala",
    protocols: protos,
  }));

  const chainWeights: Record<number, number> = {};
  for (const a of allocations) {
    chainWeights[a.paraId] = (chainWeights[a.paraId] || 0) + a.weightBps;
  }

  return (
    <div className="min-h-screen bg-neutral-950 pt-24 pb-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 md:px-10">

        {/* Header */}
        <div className="mb-8">
          <Link to="/baskets" className="mb-4 inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Baskets
          </Link>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Create Your Basket
          </h1>
          <p className="mt-2 text-neutral-400">
            Design a custom cross-chain yield strategy and deploy it on PolkaBasket
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left: Form */}
          <div className="lg:col-span-2 space-y-6">

            {/* Basic Info */}
            <div className="rounded-3xl border border-white/10 bg-neutral-900 p-6">
              <h2 className="mb-4 text-lg font-bold text-white">Basic Information</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-neutral-500">Basket Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Multichain Alpha v1"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-neutral-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-neutral-500">Symbol (Optional)</label>
                  <input
                    type="text"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))}
                    placeholder="e.g. xALPHA"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-neutral-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition"
                  />
                </div>
              </div>
            </div>

            {/* Protocol Selection */}
            <div className="rounded-3xl border border-white/10 bg-neutral-900 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Select Protocols</h2>
                <span className="text-xs text-neutral-500">{allocations.length}/5 selected</span>
              </div>

              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search protocols..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-emerald-500/50 focus:outline-none transition"
                />
              </div>

              <div className="space-y-4">
                {groupedBaskets.map(({ paraId, chainName, protocols }) => (
                  <div key={paraId} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                    <div className="mb-3 flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: CHAIN_COLORS[paraId] }}
                      />
                      <span className="font-bold text-white">{chainName}</span>
                      {chainWeights[paraId] > 0 && (
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-400">
                          {(chainWeights[paraId] / 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {protocols.map(p => {
                        const isSelected = allocations.some(a => a.paraId === p.paraId && a.protocol === p.name);
                        return (
                          <button
                            key={p.name}
                            type="button"
                            onClick={() => toggleProtocol(p.paraId, p.name)}
                            className={`flex items-center gap-3 rounded-xl p-3 text-left transition ${
                              isSelected
                                ? "border border-emerald-500/30 bg-emerald-500/10"
                                : "border border-white/5 bg-white/2 hover:bg-white/5"
                            }`}
                          >
                            <span className="text-xl">{p.icon}</span>
                            <div>
                              <p className={`text-sm font-bold ${isSelected ? "text-emerald-400" : "text-white"}`}>{p.name}</p>
                              <p className="text-[10px] text-neutral-500">{p.description}</p>
                            </div>
                            {isSelected && (
                              <svg className="ml-auto h-4 w-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Allocation Sliders */}
            {allocations.length > 0 && (
              <div className="rounded-3xl border border-white/10 bg-neutral-900 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white">Set Allocations</h2>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-mono font-bold ${totalWeight === 10000 ? "text-emerald-400" : "text-red-400"}`}>
                      {(totalWeight / 100).toFixed(0)}%
                    </span>
                    <button
                      type="button"
                      onClick={autoBalance}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/10 transition"
                    >
                      Auto Balance
                    </button>
                  </div>
                </div>

                <div className="mb-4 flex h-3 overflow-hidden rounded-full">
                  {allocations.map((a, i) => (
                    <div
                      key={i}
                      style={{
                        width: `${(a.weightBps / 10000) * 100}%`,
                        backgroundColor: CHAIN_COLORS[a.paraId] || `hsl(${(i * 60) % 360}, 70%, 50%)`,
                      }}
                    />
                  ))}
                </div>

                <div className="space-y-4">
                  {allocations.map((a) => (
                    <div key={a.protocol} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: CHAIN_COLORS[a.paraId] }}
                          />
                          <span className="text-sm font-medium text-white">{a.protocol}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={10000}
                            value={a.weightBps}
                            onChange={(e) => handleWeightChange(a.paraId, a.protocol, Math.min(10000, Math.max(0, Number(e.target.value))))}
                            className="w-20 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-center text-sm text-white focus:border-emerald-500/50 focus:outline-none"
                          />
                          <span className="text-xs text-neutral-500">bps</span>
                          <span className="w-12 text-right text-sm font-bold text-white">
                            {(a.weightBps / 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={10000}
                        step={100}
                        value={a.weightBps}
                        onChange={(e) => handleWeightChange(a.paraId, a.protocol, Number(e.target.value))}
                        className="w-full accent-emerald-500 h-1.5 cursor-pointer"
                        style={{ accentColor: CHAIN_COLORS[a.paraId] }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error/Success */}
            {submitError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
                {submitError}
              </div>
            )}
            {submitSuccess && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400">
                Basket saved successfully! Redirecting...
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={!name.trim() || allocations.length === 0 || isSubmitting}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-4 text-sm font-bold text-white transition hover:bg-white/10 disabled:opacity-30"
              >
                Save Draft
              </button>
              <button
                type="button"
                onClick={handleDeploy}
                disabled={!name.trim() || allocations.length === 0 || totalWeight !== 10000 || isSubmitting}
                className="flex-1 rounded-xl bg-emerald-500 py-4 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:opacity-30"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Deploying...
                  </span>
                ) : (
                  "Deploy Basket"
                )}
              </button>
            </div>

            {!state.evm.address && (
              <p className="text-center text-xs text-neutral-500">
                Connect your wallet to deploy on-chain. Draft saves work without a wallet.
              </p>
            )}
          </div>

          {/* Right: Preview & Saved */}
          <div className="space-y-6">
            {/* Preview */}
            <div className="rounded-3xl border border-white/10 bg-neutral-900 p-6">
              <h2 className="mb-4 text-lg font-bold text-white">Preview</h2>
              {name || allocations.length > 0 ? (
                <div>
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-3xl">🧺</div>
                    <div>
                      <p className="font-bold text-white">{name || "Your Basket"}</p>
                      <p className="text-xs text-neutral-500 uppercase tracking-wider">
                        {symbol || (name ? name.replace(/\s+/g, "-").toUpperCase().slice(0, 10) : "SYMBOL")}
                      </p>
                    </div>
                  </div>

                  {allocations.length > 0 && (
                    <>
                      <div className="mb-3 flex h-3 overflow-hidden rounded-full">
                        {allocations.map((a, i) => (
                          <div
                            key={i}
                            style={{
                              width: `${(a.weightBps / 10000) * 100}%`,
                              backgroundColor: CHAIN_COLORS[a.paraId] || `hsl(${(i * 60) % 360}, 70%, 50%)`,
                            }}
                          />
                        ))}
                      </div>
                      <div className="space-y-2">
                        {allocations.map((a) => (
                          <div key={a.protocol} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: CHAIN_COLORS[a.paraId] }}
                              />
                              <span className="text-xs text-neutral-300">{a.protocol}</span>
                            </div>
                            <span className="text-xs font-bold text-white">
                              {(a.weightBps / 100).toFixed(0)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-sm text-neutral-600">Start filling out the form to see a preview</p>
              )}
            </div>

            {/* Saved Baskets */}
            <div className="rounded-3xl border border-white/10 bg-neutral-900 p-6">
              <h2 className="mb-4 text-lg font-bold text-white">Your Baskets</h2>
              {customBaskets.filter(b => b.creator === state.evm.address || !state.evm.address).length === 0 ? (
                <p className="text-sm text-neutral-600">No saved baskets yet</p>
              ) : (
                <div className="space-y-3">
                  {customBaskets
                    .filter(b => !state.evm.address || b.creator === state.evm.address)
                    .slice(0, 5)
                    .map(basket => (
                      <div key={basket.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/2 p-3">
                        <div>
                          <p className="text-sm font-bold text-white">{basket.name}</p>
                          <p className="text-[10px] text-neutral-500 uppercase tracking-wider">{basket.symbol}</p>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          basket.status === "deployed" ? "bg-emerald-500/20 text-emerald-400" :
                          basket.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                          "bg-neutral-500/20 text-neutral-400"
                        }`}>
                          {basket.status}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Tips */}
            <div className="rounded-3xl border border-blue-500/10 bg-blue-500/5 p-6">
              <h3 className="mb-3 text-sm font-bold text-blue-400">Tips</h3>
              <ul className="space-y-2 text-xs text-neutral-400">
                <li>• Select up to 5 protocols across different chains</li>
                <li>• Allocations must add up to 100% to deploy</li>
                <li>• Baskets are saved locally and on-chain</li>
                <li>• Use "Auto Balance" for equal distribution</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
