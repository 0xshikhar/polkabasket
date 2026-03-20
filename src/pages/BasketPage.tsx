import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { formatUnits } from "viem";
import { DepositForm } from "../components/DepositForm";
import { WithdrawForm } from "../components/WithdrawForm";
import { useBasketManager, type BasketInfo } from "../hooks/useBasketManager";
import { useBasketToken } from "../hooks/useBasketToken";
import { useWalletAddress } from "../contexts/WalletContext";
import { APP_EXPLORER_URL, APP_NATIVE_DECIMALS, APP_NATIVE_SYMBOL, BASKET_MANAGER_ADDRESS, PVM_ENGINE_ADDRESS, USE_MOCK_PVM, getExplorerAddressUrl } from "../config/contracts";

interface Allocation {
  chain: string;
  weight: number;
  color: string;
}

const DEFAULT_BASKET_DATA = { 
  name: "xDOT Liquidity Basket",
  symbol: "xDOT-LIQ",
  description: "Diversified liquidity provision across top Polkadot DeFi protocols. Earn LP fees and staking rewards.",
  allocations: [
    { chain: "Hydration LP", weight: 40, color: "#E6007A" },
    { chain: "Moonbeam Lending", weight: 30, color: "#53CBC9" },
    { chain: "Acala Staking", weight: 30, color: "#FF4B4B" },
  ],
  apy: "12.4%",
  risk: "Medium" as const,
};

const CHAIN_COLORS: Record<number, string> = {
  2034: "#E6007A",
  2004: "#53CBC9",
  2000: "#FF4B4B",
};

export function BasketPage() {
  const { id } = useParams<{ id: string }>();
  const basketId = id ? BigInt(id) : 0n;
  const { getBasketInfo } = useBasketManager();

  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");
  const [basketInfo, setBasketInfo] = useState<BasketInfo | null>(null);
  const [basketData, setBasketData] = useState(DEFAULT_BASKET_DATA);
  const [userBalance, setUserBalance] = useState("0");
  const [userDeposit, setUserDeposit] = useState("0");
  const [isLoadingBasket, setIsLoadingBasket] = useState(true);
  const walletAddress = useWalletAddress();
  const tokenAddress = basketInfo?.token ? (basketInfo.token as `0x${string}`) : null;
  const { getBalance } = useBasketToken(tokenAddress);

  useEffect(() => {
    async function fetchBasket() {
      setIsLoadingBasket(true);
      try {
        const info = await getBasketInfo(basketId);
        if (info) {
          setBasketInfo(info);
          setBasketData({
            name: info.name,
            symbol: info.symbol,
            description: `Multi-chain basket deployed across ${info.allocations.length} protocols.`,
            allocations: info.allocations.map((a, i) => ({
              chain: a.chain,
              weight: a.weight,
              color: CHAIN_COLORS[a.paraId] || `hsl(${i * 120}, 70%, 50%)`,
            })),
            apy: "12.4%",
            risk: "Medium",
          });
        }
      } catch (err) {
        console.error("Error fetching basket info:", err);
      } finally {
        setIsLoadingBasket(false);
      }
    }
    fetchBasket();
  }, [id, basketId, getBasketInfo]);

  useEffect(() => {
    let cancelled = false;

    async function fetchUserTokenBalance() {
      if (!walletAddress || !tokenAddress) {
        if (!cancelled) {
          setUserBalance("0");
          setUserDeposit("0");
        }
        return;
      }

      try {
        const balance = await getBalance(walletAddress);
        const formatted = formatUnits(balance, APP_NATIVE_DECIMALS);
        const parsed = Number.parseFloat(formatted);
        const display = Number.isFinite(parsed) && parsed > 0 ? parsed.toFixed(4).replace(/\.?0+$/, "") : "0";
        if (!cancelled) {
          setUserBalance(display);
          setUserDeposit(display);
        }
      } catch {
        if (!cancelled) {
          setUserBalance("0");
          setUserDeposit("0");
        }
      }
    }

    fetchUserTokenBalance();

    return () => {
      cancelled = true;
    };
  }, [walletAddress, tokenAddress, getBalance]);

  const riskColors = {
    Low: "bg-emerald-500/20 text-emerald-400",
    Medium: "bg-amber-500/20 text-amber-400",
    High: "bg-red-500/20 text-red-400",
  };

  const explorerUrl = APP_EXPLORER_URL;

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
                  {isLoadingBasket && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-500/20 text-blue-400">
                      Loading...
                    </span>
                  )}
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
                  <p className="text-2xl font-bold text-white">
                    {basketInfo?.totalDeposited ? `${parseFloat(basketInfo.totalDeposited).toFixed(2)} ${APP_NATIVE_SYMBOL}` : "$1.25M"}
                  </p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/5 p-4">
                  <p className="text-neutral-400 text-sm">Token Price</p>
                  <p className="text-2xl font-bold text-white">1.00 {APP_NATIVE_SYMBOL}</p>
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

            <ContractStatusCard 
              basketManager={BASKET_MANAGER_ADDRESS}
              pvmEngine={PVM_ENGINE_ADDRESS}
              isMockPVM={USE_MOCK_PVM}
              explorerUrl={explorerUrl}
            />

            <XCMStatusCard allocations={basketInfo?.allocations} />

            <div className="rounded-3xl border border-white/10 bg-neutral-900 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Basket Info</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Chain</span>
                  <span className="text-white">Polkadot Hub</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Network</span>
                  <span className="text-white">Paseo TestNet</span>
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
                  <span className="text-neutral-400">Basket ID</span>
                  <span className="text-white">{basketId.toString()}</span>
                </div>
                {basketInfo?.token && (
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Token Address</span>
                    <a 
                      href={`${explorerUrl}/address/${basketInfo.token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 text-xs hover:underline"
                    >
                      {basketInfo.token.slice(0, 6)}...{basketInfo.token.slice(-4)}
                    </a>
                  </div>
                )}
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
          <p className="text-2xl font-bold text-white">{userDeposit || "0.00"} {APP_NATIVE_SYMBOL}</p>
        </div>
        <div>
          <p className="text-neutral-400 text-sm">Token Balance</p>
          <p className="text-2xl font-bold text-white">{userDeposit || "0.00"} {tokenSymbol}</p>
        </div>
        <div>
          <p className="text-neutral-400 text-sm">Value</p>
          <p className="text-2xl font-bold text-emerald-400">$0.00</p>
        </div>
      </div>
    </div>
  );
}

function ContractStatusCard({ 
  basketManager, 
  pvmEngine, 
  isMockPVM,
  explorerUrl 
}: { 
  basketManager: string; 
  pvmEngine: string; 
  isMockPVM: boolean;
  explorerUrl: string;
}) {
  const contracts = [
    {
      name: "BasketManager",
      address: basketManager,
      status: basketManager ? "deployed" : "not-deployed",
    },
    {
      name: "PVM Engine",
      address: pvmEngine,
      status: !basketManager ? "not-deployed" : pvmEngine ? (isMockPVM ? "mock" : "deployed") : "not-deployed",
    },
  ];

  const statusStyles = {
    deployed: "bg-emerald-500/20 text-emerald-400",
    mock: "bg-amber-500/20 text-amber-400",
    "not-deployed": "bg-red-500/20 text-red-400",
  };

  const statusLabels = {
    deployed: "Deployed",
    mock: "Mock Mode",
    "not-deployed": "Not Deployed",
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-neutral-900 p-6">
      <h3 className="text-lg font-bold text-white mb-4">Contract Status</h3>
      <div className="space-y-4">
        {contracts.map((contract) => (
          <div key={contract.name}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-neutral-400 text-sm">{contract.name}</span>
              <span className={`px-2 py-0.5 rounded text-xs ${statusStyles[contract.status as keyof typeof statusStyles]}`}>
                {statusLabels[contract.status as keyof typeof statusLabels]}
              </span>
            </div>
            {contract.address && (
              <a
                href={getExplorerAddressUrl(contract.address, explorerUrl) || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 text-xs hover:underline font-mono"
              >
                {contract.address.slice(0, 10)}...{contract.address.slice(-8)}
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function XCMStatusCard({ allocations }: { allocations?: Array<{ paraId: number; chain: string; weight: number }> }) {
  const messages = allocations?.map((a) => ({
    chain: a.chain,
    paraId: a.paraId,
    status: "ready" as const,
    weight: a.weight,
  })) || [
    { chain: "Hydration LP", paraId: 2034, status: "ready" as const, weight: 40 },
    { chain: "Moonbeam Lending", paraId: 2004, status: "ready" as const, weight: 30 },
    { chain: "Acala Staking", paraId: 2000, status: "ready" as const, weight: 30 },
  ];

  const statusColors = {
    ready: "text-emerald-400",
    pending: "text-amber-400",
    failed: "text-red-400",
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-neutral-900 p-6">
      <h3 className="text-lg font-bold text-white mb-4">XCM Destinations</h3>
      <div className="space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="w-2 h-2 rounded-full mr-2 bg-emerald-400" />
              <span className="text-neutral-300">{msg.chain}</span>
            </div>
            <span className={`text-sm ${statusColors[msg.status]}`}>
              {msg.weight}% via XCM
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
