import { useState } from "react";
import { Link } from "react-router-dom";

interface Position {
  id: bigint;
  name: string;
  symbol: string;
  deposited: string;
  tokens: string;
  value: string;
  pnl: string;
  pnlPercent: string;
}

const MOCK_POSITIONS: Position[] = [
  {
    id: 0n,
    name: "xDOT Liquidity Basket",
    symbol: "xDOT-LIQ",
    deposited: "100.00",
    tokens: "100.00",
    value: "102.00",
    pnl: "+2.00",
    pnlPercent: "+2.00%",
  },
];

export function PortfolioPage() {
  const [positions] = useState<Position[]>(MOCK_POSITIONS);

  const totalValue = positions.reduce((acc, p) => acc + parseFloat(p.value), 0);
  const totalPnL = positions.reduce((acc, p) => acc + parseFloat(p.pnl), 0);

  return (
    <div className="min-h-screen bg-neutral-950 pt-24 pb-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-10">

        {/* Header Section */}
        <div className="mb-12 flex flex-col items-center justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">Dashboard</h1>
            <p className="mt-2 text-neutral-400">Total yield and cross-chain position summary</p>
          </div>
          <div className="flex gap-3">
            <button className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10">Export Data</button>
            <button className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-neutral-950 transition hover:bg-neutral-200">Rebalance All</button>
          </div>
        </div>

        {/* Hero Summary Widget */}
        <div className="relative mb-12 overflow-hidden rounded-[2.5rem] border border-white/10 bg-neutral-900 p-8 md:p-12 shadow-2xl">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-[80px]" />
          <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-blue-500/10 blur-[80px]" />

          <div className="grid gap-12 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">Total Portfolio Value</p>
              <div className="mt-2 flex items-baseline gap-4">
                <h2 className="text-6xl font-black tracking-tighter text-white sm:text-7xl">
                  ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h2>
                <span className={`text-xl font-bold ${totalPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {totalPnL >= 0 ? "+" : ""}{totalPnL.toFixed(2)}%
                </span>
              </div>

              <div className="mt-12 grid grid-cols-2 gap-8 sm:grid-cols-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Active Baskets</p>
                  <p className="mt-1 text-xl font-bold text-white">{positions.length}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Avg. 24h Yield</p>
                  <p className="mt-1 text-xl font-bold text-emerald-400">0.08%</p>
                </div>
                <div className="hidden sm:block">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Chain Spread</p>
                  <p className="mt-1 text-xl font-bold text-white">4 Parachains</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center border-t border-white/5 pt-12 lg:border-l lg:border-t-0 lg:pt-0">
              {/* Simplified Radial Chart SVG */}
              <div className="relative h-48 w-48">
                <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-white/5" />
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="currentColor" strokeWidth="8" strokeDasharray="251.2" strokeDashoffset="60" className="text-emerald-500" />
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="currentColor" strokeWidth="8" strokeDasharray="251.2" strokeDashoffset="180" className="text-blue-500" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-xs font-bold text-neutral-500 uppercase tracking-tighter">Asset Mix</p>
                  <p className="text-lg font-bold text-white">Diversified</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Positions Section */}
        <div className="mb-12">
          <h3 className="mb-6 text-xl font-bold text-white">Active Positions</h3>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {positions.length === 0 ? (
              <div className="col-span-full rounded-3xl border border-white/5 bg-white/[0.02] p-12 text-center">
                <p className="text-neutral-500">No active positions found.</p>
                <Link to="/baskets" className="mt-4 inline-block text-emerald-400 hover:underline">Explore Baskets →</Link>
              </div>
            ) : (
              positions.map((pos) => (
                <div key={pos.id.toString()} className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 transition hover:border-white/20 hover:bg-white/[0.05]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold text-white">{pos.name}</p>
                      <p className="text-xs text-neutral-500">{pos.symbol}</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-emerald-500/10 p-2 text-emerald-400">
                      <svg fill="currentColor" viewBox="0 0 24 24"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    </div>
                  </div>

                  <div className="mt-8 flex items-end justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Value</p>
                      <p className="text-2xl font-black text-white">${pos.value}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">P&L</p>
                      <p className="text-sm font-bold text-emerald-400">{pos.pnlPercent}</p>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-2">
                    <Link to={`/basket/${pos.id}`} className="flex-grow rounded-xl bg-white/5 py-2 text-center text-xs font-bold text-white transition hover:bg-white/10">Manage</Link>
                    <button className="rounded-xl bg-white/10 border border-white/10 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/20">Withdraw</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity Timeline */}
        <div className="rounded-[2rem] border border-white/10 bg-neutral-900 p-8">
          <h3 className="mb-8 text-xl font-bold text-white">Recent Activity</h3>
          <div className="space-y-8">
            {[
              { type: "Deposit", basket: "xDOT Liquidity", amount: "+50.00 DOT", status: "Confirmed", time: "2 hours ago", color: "emerald" },
              { type: "Rebalance", basket: "xDOT Liquidity", amount: "Executed", status: "Confirmed", time: "1 day ago", color: "blue" },
              { type: "Creation", basket: "Custom Alpha", amount: "Configured", status: "Confirmed", time: "3 days ago", color: "purple" },
            ].map((tx, i) => (
              <div key={i} className="relative flex gap-6">
                {i !== 2 && <div className="absolute left-6 top-12 h-8 w-[1px] bg-white/10" />}
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/5 border border-white/10`}>
                  <div className={`h-2.5 w-2.5 rounded-full bg-${tx.color}-500 shadow-[0_0_8px_rgba(var(--${tx.color}-500),0.5)]`} />
                </div>
                <div className="flex flex-grow items-center justify-between">
                  <div>
                    <p className="font-bold text-white">{tx.type}</p>
                    <p className="text-xs text-neutral-500">{tx.basket} · {tx.time}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xs font-bold text-white">{tx.amount}</p>
                    <p className="text-[10px] uppercase text-emerald-400 flex items-center justify-end gap-1">
                      <span className="h-1 w-1 rounded-full bg-emerald-400" /> Confirmed
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
