import { useState } from "react";
import { Link } from "react-router-dom";
import { APP_NATIVE_SYMBOL } from "../config/contracts";

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
    <div className="min-h-screen bg-neutral-950 pt-20">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:px-10">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Portfolio</h1>
            <p className="text-neutral-400">Track your basket positions</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/50 to-neutral-900 p-6">
            <p className="text-neutral-400 text-sm">Total Value</p>
            <p className="text-3xl font-bold text-white">${totalValue.toFixed(2)}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-neutral-900 p-6">
            <p className="text-neutral-400 text-sm">Total P&L</p>
            <p className={`text-3xl font-bold ${totalPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {totalPnL >= 0 ? "+" : ""}{totalPnL.toFixed(2)}
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-neutral-900 p-6">
            <p className="text-neutral-400 text-sm">Positions</p>
            <p className="text-3xl font-bold text-white">{positions.length}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-neutral-900 p-6">
            <p className="text-neutral-400 text-sm">Avg. APY</p>
            <p className="text-3xl font-bold text-emerald-400">12.4%</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-neutral-900">
          <div className="flex justify-between items-center border-b border-white/10 p-4 sm:p-6">
            <h2 className="text-xl font-bold text-white">Your Positions</h2>
          </div>

          {positions.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-neutral-400 mb-4">You don't have any positions yet.</p>
              <Link
                to="/baskets"
                className="inline-block rounded-full bg-white px-6 py-3 font-medium text-neutral-950 no-underline transition hover:bg-neutral-200"
              >
                Browse Baskets
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-6 py-4 text-left font-medium text-neutral-400">Basket</th>
                    <th className="px-6 py-4 text-right font-medium text-neutral-400">Deposited</th>
                    <th className="px-6 py-4 text-right font-medium text-neutral-400">Tokens</th>
                    <th className="px-6 py-4 text-right font-medium text-neutral-400">Value</th>
                    <th className="px-6 py-4 text-right font-medium text-neutral-400">P&L</th>
                    <th className="px-6 py-4 text-right font-medium text-neutral-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((position) => (
                    <tr key={position.id.toString()} className="border-t border-white/5 transition hover:bg-white/5">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-white">{position.name}</p>
                          <p className="text-sm text-neutral-400">{position.symbol}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-white">{position.deposited} {APP_NATIVE_SYMBOL}</td>
                      <td className="px-6 py-4 text-right text-white">{position.tokens}</td>
                      <td className="px-6 py-4 text-right font-medium text-white">${position.value}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={parseFloat(position.pnl) >= 0 ? "text-emerald-400" : "text-red-400"}>
                          {position.pnl} ({position.pnlPercent})
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/basket/${position.id}`}
                          className="text-emerald-400 no-underline transition hover:text-emerald-300"
                        >
                          Manage →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-10">
          <h2 className="text-xl font-bold text-white mb-4">Transaction History</h2>
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-neutral-900">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-6 py-4 text-left font-medium text-neutral-400">Type</th>
                    <th className="px-6 py-4 text-left font-medium text-neutral-400">Basket</th>
                    <th className="px-6 py-4 text-right font-medium text-neutral-400">Amount</th>
                    <th className="px-6 py-4 text-right font-medium text-neutral-400">Status</th>
                    <th className="px-6 py-4 text-right font-medium text-neutral-400">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { type: "Deposit", basket: "xDOT-LIQ", amount: `50.00 ${APP_NATIVE_SYMBOL}`, status: "Confirmed", time: "2 hours ago" },
                    { type: "Deposit", basket: "xDOT-LIQ", amount: `50.00 ${APP_NATIVE_SYMBOL}`, status: "Confirmed", time: "1 day ago" },
                    { type: "Rebalance", basket: "xDOT-LIQ", amount: "-", status: "Confirmed", time: "3 days ago" },
                  ].map((tx, i) => (
                    <tr key={i} className="border-t border-white/5">
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            tx.type === "Deposit"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : tx.type === "Withdraw"
                                ? "bg-red-500/20 text-red-400"
                                : "bg-amber-500/20 text-amber-400"
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-white">{tx.basket}</td>
                      <td className="px-6 py-4 text-right text-white">{tx.amount}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-emerald-400">✓ {tx.status}</span>
                      </td>
                      <td className="px-6 py-4 text-right text-neutral-400">{tx.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
