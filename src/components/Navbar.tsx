import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { useWallet } from "../contexts/WalletContext";

function truncateAddress(addr: string, head = 6, tail = 4) {
  if (addr.length <= head + tail) return addr;
  return `${addr.slice(0, head)}...${addr.slice(-tail)}`;
}

export function Navbar() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { path: "/baskets", label: "Baskets" },
    { path: "/portfolio", label: "Portfolio" },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="absolute left-0 right-0 top-0 z-50 px-4 pt-4 sm:px-6 md:px-8">
      <div className="mx-auto max-w-7xl">
        <nav
          className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-neutral-950/90 px-4 py-3 shadow-xl backdrop-blur-md sm:px-6"
          aria-label="Main"
        >
          <Link
            to="/"
            className="text-lg font-semibold tracking-tight text-white no-underline transition hover:opacity-90 sm:text-xl"
          >
            PolkaBasket
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${isActive(link.path)
                    ? "border-b-2 border-white text-white"
                    : "text-neutral-400 hover:bg-white/5 hover:text-white"
                  }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <SubWalletButton />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-2 text-neutral-400 hover:bg-white/5 hover:text-white md:hidden"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle menu"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </nav>

        {mobileMenuOpen && (
          <div className="mt-2 rounded-2xl border border-white/10 bg-neutral-950/95 p-4 shadow-xl backdrop-blur-md md:hidden">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`rounded-xl px-4 py-3 text-sm font-medium transition-colors ${isActive(link.path)
                      ? "border-b-2 border-white text-white"
                      : "text-neutral-400 hover:bg-white/5 hover:text-white"
                    }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

function SubWalletButton() {
  const { state, isAvailable, error, loading, connectEVM, disconnect } = useWallet();
  const [showDropdown, setShowDropdown] = useState(false);

  if (state.evm.address) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowDropdown((v) => !v)}
          className="flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          {truncateAddress(state.evm.address)}
        </button>
        {showDropdown && (
          <>
            <div className="fixed inset-0 z-40" aria-hidden onClick={() => setShowDropdown(false)} />
            <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-white/10 bg-neutral-900 py-2 shadow-xl">
              <div className="border-b border-white/10 px-4 py-2">
                <p className="text-xs text-neutral-500">EVM (SubWallet / MetaMask)</p>
                <p className="mt-1 truncate font-mono text-sm text-white">{state.evm.address}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  disconnect();
                  setShowDropdown(false);
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-neutral-400 transition hover:bg-white/5 hover:text-white"
              >
                Disconnect
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  if (!isAvailable) {
    return (
      <a
        href="https://subwallet.app/download.html"
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
      >
        Install SubWallet
      </a>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => connectEVM()}
        disabled={loading}
        className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
      >
        {loading ? "Connecting…" : "Connect Wallet"}
      </button>
      {error && (
        <p className="absolute right-0 top-full mt-1 max-w-[200px] text-right text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
