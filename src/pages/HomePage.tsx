import { Link } from "react-router-dom";
import PixelBlast from "../components/PixelBlast";

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
        <div className="absolute inset-0 z-0">
          <PixelBlast
            variant="square"
            pixelSize={4}
            color={SILVER}
            patternScale={2}
            patternDensity={1}
            pixelSizeJitter={0}
            enableRipples
            rippleSpeed={0.4}
            rippleThickness={0.12}
            rippleIntensityScale={1.5}
            liquid={false}
            liquidStrength={0.12}
            liquidRadius={1.2}
            liquidWobbleSpeed={5}
            speed={0.5}
            edgeFade={0.25}
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
          <p className="landing-section landing-stagger-1 text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
            Cross-chain DeFi
          </p>
          <h1 className="landing-section landing-stagger-2 mt-4 max-w-4xl text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl">
            Baskets in one click
          </h1>
          <p className="landing-section landing-stagger-3 mt-5 max-w-xl text-base leading-relaxed text-neutral-400 sm:mt-6 sm:text-lg md:text-xl">
            Deposit DOT once. Get automatic allocation across parachains via XCM. One unified basket token—yield from multiple chains.
          </p>
          <div className="landing-section landing-stagger-4 mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Link
              to="/baskets"
              className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-white px-8 py-3.5 text-sm font-medium text-neutral-950 no-underline transition hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-white/30"
            >
              Browse Baskets
            </Link>
            <a
              href="#how"
              className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-white/25 px-8 py-3.5 text-sm font-medium text-white no-underline transition hover:border-white/40 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              How it works
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
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 sm:p-10 md:p-12">
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
                  <p className="bg-gradient-to-br from-white to-neutral-400 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl md:text-6xl">
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

      {/* How it works — one section: headline + steps */}
      <section
        id="how"
        className={`relative overflow-hidden ${SECTION_PADDING}`}
      >
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(163,163,163,0.06),transparent_60%)]" />
        <div className={`relative z-10 ${CONTENT_MAX}`}>
          <div className="flex flex-col items-center text-center">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-neutral-500">
              How it works
            </p>
            <h2 className="mt-4 max-w-4xl text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
              From deposit to yield
              <br />
              across chains
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-neutral-400 sm:text-lg md:text-xl">
              One deposit, one basket token. XCM handles the rest—your DOT is allocated across Hydration, Moonbeam, Acala and more.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-3 sm:gap-8 lg:mt-20">
            {[
              {
                step: "1",
                title: "Deposit DOT",
                description:
                  "Deposit your DOT into any basket. You receive basket tokens representing your share of the portfolio.",
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
      <footer className="border-t border-white/[0.06] py-6">
        <div className={`${CONTENT_MAX} px-4 sm:px-6 md:px-10`}>
          <p className="text-center text-xs text-neutral-500">
            © {new Date().getFullYear()} TeleBasket · Cross-chain DeFi on Polkadot
          </p>
        </div>
      </footer>
    </div>
  );
}
