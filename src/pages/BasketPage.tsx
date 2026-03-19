import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { DepositForm } from "../components/DepositForm";
import { WithdrawForm } from "../components/WithdrawForm";

interface Allocation {
  chain: string;
  weight: number;
  color: string;
}

const BASKET_DATA: Record<string, { 
  name: string; 
  symbol: string;
  description: string;
  allocations: Allocation[];
  apy: string;
  risk: "Low" | "Medium" | "High";
}> = {
  "0": {
    name: "xDOT Liquidity Basket",
    symbol: "xDOT-LIQ",
    description: "Diversified liquidity provision across top Polkadot DeFi protocols. Earn LP fees and staking rewards.",
    allocations: [
      { chain: "Hydration LP", weight: 40, color: "#E6007A" },
      { chain: "Moonbeam Lending", weight: 30, color: "#53CBC9" },
      { chain: "Acala Staking", weight: 30, color: "#FF4B4B" },
    ],
    apy: "12.4%",
    risk: "Medium",
  },
  "1": {
    name: "Stable Yield Basket",
    symbol: "xSTABLE",
    description: "Focus on stablecoin yields with minimal impermanent loss risk.",
    allocations: [
      { chain: "Hydration Stable", weight: 50, color: "#E6007A" },
      { chain: "Moonbeam Liquid Staking", weight: 50, color: "#53CBC9" },
    ],
    apy: "8.2%",
    risk: "Low",
  },
  "2": {
    name: "High Risk Basket",
    symbol: "xRISK",
    description: "Leveraged positions for maximum yield. High risk of liquidation.",
    allocations: [
      { chain: "Moonbeam Leverage", weight: 60, color: "#53CBC9" },
      { chain: "Acala Leverage", weight: 40, color: "#FF4B4B" },
    ],
    apy: "24.8%",
    risk: "High",
  },
};

export function BasketPage() {
  const { id } = useParams<{ id: string }>();
  const basketId = id ? BigInt(id) : 0n;

  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");
  const [basketData, setBasketData] = useState(BASKET_DATA["0"]);
  const [userBalance] = useState("0");
  const [userDeposit] = useState("0");

  useEffect(() => {
    if (id && BASKET_DATA[id]) {
      setBasketData(BASKET_DATA[id]);
    }
  }, [id]);

  const riskColors = {
    Low: "bg-emerald-500/20 text-emerald-400",
    Medium: "bg-amber-500/20 text-amber-400",
    High: "bg-red-500/20 text-red-400",
  };

  return (
    <div className="min-h-screen bg-neutral-950 pt-20">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:px-10">
        <Link 
          to="/baskets" 
          className="mb-6 inline-flex items-center gap-2 text-neutral-400 no-underline transition hover:text-white"
        >
          <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Baskets
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-3xl border border-white/10 bg-neutral-900 p-6 sm:p-8">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-1">{basketData.name}</h1>
                  <p className="text-neutral-400">{basketData.symbol}</p>
                </div>
                <div className="flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${riskColors[basketData.risk]}`}>
                    {basketData.risk} Risk
                  </span>
                </div>
              </div>

              <p className="text-neutral-300 mb-6">{basketData.description}</p>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="rounded-xl border border-white/5 bg-white/5 p-4">
                  <p className="text-neutral-400 text-sm">APY</p>
                  <p className="text-2xl font-bold text-emerald-400">{basketData.apy}</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/5 p-4">
                  <p className="text-neutral-400 text-sm">TVL</p>
                  <p className="text-2xl font-bold text-white">$1.25M</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/5 p-4">
                  <p className="text-neutral-400 text-sm">Token Price</p>
                  <p className="text-2xl font-bold text-white">1.02 DOT</p>
                </div>
              </div>

              <div>
                <p className="text-gray-400 text-sm mb-3">Current Allocation</p>
                <AllocationChart allocations={basketData.allocations} />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-neutral-900 p-6 sm:p-8">
              <div className="flex border-b border-white/10 mb-6">
                <button
                  onClick={() => setActiveTab("deposit")}
                  className={`px-6 py-3 font-medium transition-colors ${
                    activeTab === "deposit"
                      ? "text-emerald-400 border-b-2 border-emerald-400"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Deposit
                </button>
                <button
                  onClick={() => setActiveTab("withdraw")}
                  className={`px-6 py-3 font-medium transition-colors ${
                    activeTab === "withdraw"
                      ? "text-emerald-400 border-b-2 border-emerald-400"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Withdraw
                </button>
              </div>

              {activeTab === "deposit" ? (
                <DepositForm
                  basketId={basketId}
                  basketName={basketData.symbol}
                />
              ) : (
                <WithdrawForm
                  basketId={basketId}
                  tokenSymbol={basketData.symbol}
                  userTokenBalance={userBalance}
                />
              )}
            </div>
          </div>

          <div className="space-y-6">
            <UserPositionCard 
              userDeposit={userDeposit}
              tokenSymbol={basketData.symbol}
            />

            <XCMStatusCard />

            <div className="rounded-3xl border border-white/10 bg-neutral-900 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Basket Info</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Chain</span>
                  <span className="text-white">Polkadot Hub</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Protocol</span>
                  <span className="text-white">PolkaVM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Token</span>
                  <span className="text-white">{basketData.symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Min Deposit</span>
                  <span className="text-white">1 DOT</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AllocationChart({ allocations }: { allocations: Allocation[] }) {
  let cumulative = 0;
  
  const arcs = allocations.map((alloc) => {
    const startAngle = (cumulative / 100) * 360;
    cumulative += alloc.weight;
    const endAngle = (cumulative / 100) * 360;
    return { ...alloc, startAngle, endAngle };
  });

  const describeArc = (startAngle: number, endAngle: number) => {
    const start = polarToCartesian(50, 50, 40, endAngle);
    const end = polarToCartesian(50, 50, 40, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return `M 50 50 L ${start.x} ${start.y} A 40 40 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
  };

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  return (
    <div className="flex flex-col md:flex-row items-center gap-8">
      <svg viewBox="0 0 100 100" className="w-40 h-40">
        {arcs.map((arc, i) => (
          <path
            key={i}
            d={describeArc(arc.startAngle, arc.endAngle)}
            fill={arc.color}
            stroke="rgb(38 38 38)"
            strokeWidth="0.5"
          />
        ))}
        <circle cx="50" cy="50" r="20" fill="rgb(38 38 38)" />
      </svg>
      <div className="flex-1 space-y-2">
        {allocations.map((alloc, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center">
              <div 
                className="w-3 h-3 rounded-full mr-2" 
                style={{ backgroundColor: alloc.color }}
              />
              <span className="text-neutral-300">{alloc.chain}</span>
            </div>
            <span className="text-white font-medium">{alloc.weight}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function UserPositionCard({ userDeposit, tokenSymbol }: { userDeposit: string; tokenSymbol: string }) {
  return (
    <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/50 to-neutral-900 p-6">
      <h3 className="text-lg font-bold text-white mb-4">Your Position</h3>
      <div className="space-y-4">
        <div>
          <p className="text-neutral-400 text-sm">Deposited</p>
          <p className="text-2xl font-bold text-white">{userDeposit || "100.00"} DOT</p>
        </div>
        <div>
          <p className="text-neutral-400 text-sm">Token Balance</p>
          <p className="text-2xl font-bold text-white">{userDeposit || "100.00"} {tokenSymbol}</p>
        </div>
        <div>
          <p className="text-neutral-400 text-sm">Value</p>
          <p className="text-2xl font-bold text-emerald-400">$102.00</p>
        </div>
      </div>
    </div>
  );
}

function XCMStatusCard() {
  const messages = [
    { chain: "Hydration", status: "confirmed" as const, amount: "40 DOT" },
    { chain: "Moonbeam", status: "confirmed" as const, amount: "30 DOT" },
    { chain: "Acala", status: "pending" as const, amount: "30 DOT" },
  ];

  const statusColors = {
    confirmed: "text-emerald-400",
    pending: "text-amber-400",
    failed: "text-red-400",
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-neutral-900 p-6">
      <h3 className="text-lg font-bold text-white mb-4">XCM Status</h3>
      <div className="space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center">
              <span className={`w-2 h-2 rounded-full mr-2 ${
                msg.status === "confirmed" ? "bg-emerald-400" :
                msg.status === "pending" ? "bg-amber-400" : "bg-red-400"
              }`} />
              <span className="text-neutral-300">{msg.chain}</span>
            </div>
            <span className={`text-sm ${statusColors[msg.status]}`}>
              {msg.status === "confirmed" ? "✓" : "⏳"} {msg.amount}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
