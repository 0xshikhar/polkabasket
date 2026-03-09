import { Link, useLocation } from "react-router-dom";
import { useState } from "react";

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
            TeleBasket
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive(link.path)
                    ? "border-b-2 border-white text-white"
                    : "text-neutral-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <NetworkSelector />
            <WalletButton />
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
                  className={`rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                    isActive(link.path)
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

function NetworkSelector() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("Westend");

  const networks = ["Westend", "Polkadot Hub"];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-white transition hover:bg-white/10"
      >
        <span className="h-2 w-2 rounded-full bg-neutral-400" />
        <span>{selected}</span>
        <svg className="h-4 w-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" aria-hidden onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-44 rounded-xl border border-white/10 bg-neutral-900 py-1 shadow-xl">
            {networks.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => {
                  setSelected(name);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-neutral-400 transition hover:bg-white/5 hover:text-white"
              >
                <span className="h-2 w-2 rounded-full bg-neutral-400" />
                {name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function WalletButton() {
  const [connected, setConnected] = useState(false);

  if (connected) {
    return (
      <button
        type="button"
        className="flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
      >
        <span className="h-2 w-2 rounded-full bg-neutral-400" />
        0x1234...5678
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConnected(true)}
      className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
    >
      Connect Wallet
    </button>
  );
}
