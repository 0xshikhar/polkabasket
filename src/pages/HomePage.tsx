import { Link } from "react-router-dom";
import PixelBlast from "../components/PixelBlast";
import { APP_NATIVE_SYMBOL } from "../config/contracts";

const SECTION_PADDING = "px-4 py-16 sm:px-6 sm:py-20 md:px-10 md:py-24 lg:py-28";
const CONTENT_MAX = "mx-auto max-w-7xl";

const SILVER = "#A3A3A3";

export function HomePage() {
  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Hero */}
      <section
        className={`relative min-h-[92vh] w-full overflow-hidden sm:min-h-[95vh] ${SECTION_PADDING}`}
        style={{ paddingTop: "calc(5rem + 2vh)" }}
      >
        {/* PixelBlast background — silver dither */}
        <div
          className="absolute inset-0 z-0"
          style={{
            maskImage: "radial-gradient(circle at center, transparent 20%, black 80%)",
            WebkitMaskImage: "radial-gradient(circle at center, transparent 20%, black 80%)",
            opacity: 0.7
          }}
        >
          <PixelBlast
            variant="square"
            pixelSize={3}
            color={SILVER}
            patternScale={2}
            patternDensity={0.6}
            pixelSizeJitter={0}
            enableRipples
            rippleSpeed={0.4}
            rippleThickness={0.12}
            rippleIntensityScale={0.8}
            liquid={false}
            liquidStrength={0.12}
            liquidRadius={1.2}
            liquidWobbleSpeed={5}
            speed={0.5}
            edgeFade={0.3}
            transparent
          />
        </div>
        {/* Gradient + grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 z-[1]"
          aria-hidden
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-15%,rgba(163,163,163,0.08),transparent_50%)]" />
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)`,
              backgroundSize: "64px 64px",
            }}
          />
        </div>

        <div className={`relative z-10 flex min-h-[85vh] flex-col items-center justify-center text-center ${CONTENT_MAX}`}>
          <div className="landing-section landing-stagger-1 mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
            <span className="text-xs font-medium tracking-widest uppercase text-neutral-400">Cross-chain DeFi Protocol</span>
          </div>

          <h1 className="landing-section landing-stagger-2 max-w-4xl text-5xl font-bold tracking-tight text-white sm:text-6xl md:text-7xl lg:text-8xl">
            <span className="bg-gradient-to-br from-white via-white to-neutral-500 bg-clip-text text-transparent">Baskets in</span>
            <br />
            <span className="bg-gradient-to-br from-white via-white to-neutral-500 bg-clip-text text-transparent">one click</span>
          </h1>

          <p className="landing-section landing-stagger-3 mt-8 max-w-2xl text-lg leading-relaxed text-neutral-400 sm:text-xl">
            The first unified yield layer for Polkadot. One deposit into a basket automatically allocates your capital across <span className="text-white">Hydration, Moonbeam, and Acala</span> via secure XCM.
          </p>

          <div className="landing-section landing-stagger-4 mt-12 flex flex-col items-center gap-6 sm:flex-row">
            <Link
              to="/baskets"
              className="group relative inline-flex items-center justify-center overflow-hidden rounded-2xl bg-white px-10 py-4 text-sm font-bold text-neutral-950 transition hover:bg-neutral-200"
            >
              <span className="relative z-10">Start Investing</span>
              <div className="absolute inset-0 z-0 bg-gradient-to-r from-white via-neutral-100 to-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
            <a
              href="#how"
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-10 py-4 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* Stats — structured card */}
      <section className={`relative overflow-hidden bg-black ${SECTION_PADDING}`}>
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />
        <div className={`relative z-10 ${CONTENT_MAX}`}>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 sm:p-10 md:p-12 backdrop-blur-3xl">
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 sm:gap-0">
              {[
                { value: "$2.42M", label: "TVL" },
                { value: "3", label: "Baskets" },
                { value: "1,247", label: "Depositors" },
                { value: "12%+", label: "Avg. APY" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className={`flex flex-col items-center text-center sm:border-e sm:border-white/10 last:sm:border-e-0 sm:px-6`}
                >
                  <p className="bg-gradient-to-br from-white to-neutral-500 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl md:text-6xl">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-xs font-medium uppercase tracking-widest text-neutral-500">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* What exactly we doing — New Section */}
      <section className={`relative overflow-hidden ${SECTION_PADDING}`}>
        <div className={`relative z-10 ${CONTENT_MAX}`}>
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-emerald-500">Cross-Chain Automation</p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                One Deposit.
                <br />
                Infinite Allocation.
              </h2>
              <div className="mt-8 space-y-6 text-lg text-neutral-400">
                <p>
                  PolkaBasket abstracts the complexity of the Polkadot ecosystem. Instead of manually bridging assets and managing multiple wallets, you deposit <span className="text-white">{APP_NATIVE_SYMBOL}</span> once on our hub.
                </p>
                <p>
                  Our <span className="text-white">XCM Engine</span> then instantly routes your capital to the most efficient yield-bearing protocols across the relay chain and parachains.
                </p>
              </div>
              <div className="mt-10 flex items-center gap-4">
                <div className="h-px flex-grow bg-white/10" />
                <span className="text-xs font-medium uppercase tracking-widest text-neutral-500 italic font-serif">Secure via Polkadot XCM</span>
              </div>
            </div>
            <div className="relative aspect-square rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-50" />
              <div className="relative flex h-full flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="h-12 w-12 rounded-xl bg-white/10 p-2.5">
                    <svg className="text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <span className="text-xs font-mono text-neutral-500 uppercase tracking-tighter">Chain State: Synchronized</span>
                </div>
                <div className="space-y-4">
                  <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full w-[80%] bg-emerald-500/50" />
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full w-[65%] bg-blue-500/50" />
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full w-[90%] bg-pink-500/50" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-white">Aggregating Yield from 6+ Protocols</p>
                  <p className="text-[10px] text-neutral-500 uppercase mt-1 tracking-widest font-mono">Real-time Rebalancing</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Custom Baskets — New Section */}
      <section className={`relative overflow-hidden bg-white/5 ${SECTION_PADDING}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(163,163,163,0.05),transparent_50%)]" />
        <div className={`relative z-10 ${CONTENT_MAX}`}>
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="order-2 lg:order-1 relative aspect-video rounded-3xl border border-white/10 bg-neutral-900 p-8 shadow-2xl">
              <div className="flex h-full flex-col justify-center items-center">
                <div className="mb-6 flex gap-3">
                  <div className="h-4 w-4 rounded-full bg-emerald-500 animate-pulse" />
                  <div className="h-4 w-12 rounded-full bg-white/10" />
                  <div className="h-4 w-8 rounded-full bg-white/10" />
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">Design Your Strategy</p>
                  <p className="mt-2 text-sm text-neutral-400">Total Selection: 5 Tokens</p>
                </div>
                <div className="mt-10 w-full max-w-xs space-y-3">
                  <div className="h-10 rounded-xl bg-white/5 border border-white/10 border-dashed flex items-center justify-center">
                    <span className="text-xs text-neutral-500">+ Add Token</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <p className="text-sm font-bold uppercase tracking-widest text-emerald-500">Power to the User</p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                Craft Your Own
                <br />
                Basket Strategy.
              </h2>
              <div className="mt-8 space-y-6 text-lg text-neutral-400">
                <p>
                  Don't settle for pre-made portfolios. Use our <span className="text-white">Custom Builder</span> to pick the specific tokens and parachains you want to back.
                </p>
                <p>
                  Set your allocation percentages, and our engine will handle the complex cross-chain execution. <span className="text-white">Made by you, powered by Polkadot.</span>
                </p>
              </div>
              <div className="mt-10">
                <Link to="/baskets" className="inline-flex items-center gap-2 text-white font-bold hover:gap-3 transition-all">
                  Try the Builder <span className="text-emerald-500">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* How it works — headline + steps */}
      <section
        id="how"
        className={`relative overflow-hidden ${SECTION_PADDING}`}
      >
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(163,163,163,0.06),transparent_60%)]" />
        <div className={`relative z-10 ${CONTENT_MAX}`}>
          <div className="flex flex-col items-center text-center">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-neutral-500">
              The Process
            </p>
            <h2 className="mt-4 max-w-4xl text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
              From deposit to yield
              <br />
              across chains
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-neutral-400 sm:text-lg md:text-xl">
              One deposit, one basket token. XCM handles the rest-your {APP_NATIVE_SYMBOL} is allocated across Hydration, Moonbeam, Acala and more.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-3 sm:gap-8 lg:mt-20">
            {[
              {
                step: "1",
                title: `Deposit ${APP_NATIVE_SYMBOL}`,
                description:
                  `Deposit your ${APP_NATIVE_SYMBOL} into any basket. You receive basket tokens representing your share of the portfolio.`,
                icon: (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
              {
                step: "2",
                title: "XCM Allocation",
                description:
                  "Your capital is automatically sent across parachains via XCM according to the basket's allocation.",
                icon: (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                ),
              },
              {
                step: "3",
                title: "Earn Yield",
                description:
                  "Earn yield from multiple DeFi protocols. Rebalance anytime. One token, multiple chains.",
                icon: (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                ),
              },
            ].map((item) => (
              <article
                key={item.step}
                className="group relative flex flex-col rounded-2xl border border-white/[0.06] bg-white/[0.03] p-8 transition duration-300 hover:border-white/[0.1] hover:bg-white/[0.05]"
              >
                <div className="flex items-start justify-between">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition group-hover:border-white/15 group-hover:bg-white/10">
                    {item.icon}
                  </span>
                  <span className="text-2xl font-bold tabular-nums text-white/20">
                    {item.step}
                  </span>
                </div>
                <h3 className="mt-6 text-xl font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-neutral-400">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Thin footer — landing only */}
      <footer className="border-t border-white/[0.06] py-12 bg-black/20">
        <div className={`${CONTENT_MAX} px-4 sm:px-6 md:px-10`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="text-center md:text-left">
              <p className="text-lg font-bold text-white mb-2">PolkaBasket</p>
              <p className="text-sm text-neutral-400 max-w-xs mx-auto md:mx-0">
                The unified yield layer for the Polkadot ecosystem. Secure, automated, and cross-chain.
              </p>
            </div>
            <div className="flex justify-center md:justify-end gap-6">
              <Link to="/baskets" className="text-sm text-neutral-400 hover:text-white transition">Explore</Link>
              <Link to="/portfolio" className="text-sm text-neutral-400 hover:text-white transition">Portfolio</Link>
              <a href="#" className="text-sm text-neutral-400 hover:text-white transition">Docs</a>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-white/5 text-center">
            <p className="text-xs text-neutral-600">
              © {new Date().getFullYear()} PolkaBasket · Powered by Polkadot XCM & SubWallet
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
