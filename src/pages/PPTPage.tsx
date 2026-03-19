import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

interface Slide {
    id: number;
    type: "title" | "problem" | "solution" | "traction" | "economics" | "roadmap";
    content: React.ReactNode;
}

export function PPTPage() {
    const [currentSlide, setCurrentSlide] = useState(0);

    const slides: Slide[] = [
        {
            id: 1,
            type: "title",
            content: (
                <div className="flex flex-col items-center justify-center text-center">
                    <div className="mb-6 h-20 w-20 rounded-2xl bg-gradient-to-br from-white to-neutral-600 p-0.5 animate-glow">
                        <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-black">
                            <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                        </div>
                    </div>
                    <h1 className="bg-gradient-to-b from-white to-neutral-500 bg-clip-text text-6xl font-bold tracking-tighter text-transparent sm:text-7xl md:text-8xl animate-title">
                        PolkaBasket
                    </h1>
                    <p className="mt-6 text-xl font-medium uppercase tracking-[0.4em] text-neutral-500 animate-fade-in stagger-1">
                        One-Click Cross-Chain DeFi
                    </p>
                </div>
            ),
        },
        {
            id: 2,
            type: "problem",
            content: (
                <div className="flex flex-col items-center justify-center text-center max-w-5xl px-6">
                    <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-neutral-600 animate-fade-in">Slide 02 / The Problem</p>
                    <h2 className="text-4xl font-bold text-white sm:text-5xl md:text-6xl animate-slide-up">
                        DeFi is Fragmented.
                    </h2>
                    <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
                        {[
                            { title: "Manual Bridging", desc: "Users spend hours jumping between chains.", icon: "🌉" },
                            { title: "XCM Complexity", desc: "Raw cross-chain messaging is hard for humans.", icon: "🧩" },
                            { title: "Siloed Liquidity", desc: "Capital is locked on single chains, missing out on yield.", icon: "🔒" },
                        ].map((item, i) => (
                            <div key={item.title} className="group rounded-2xl border border-white/5 bg-white/[0.02] p-8 transition hover:bg-white/[0.05] animate-fade-in-up" style={{ animationDelay: `${0.2 + i * 0.1}s`, animationFillMode: "forwards" }}>
                                <span className="text-4xl mb-6 block">{item.icon}</span>
                                <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
                                <p className="text-neutral-500 text-sm leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            ),
        },
        {
            id: 3,
            type: "solution",
            content: (
                <div className="flex flex-col items-center justify-center text-center max-w-5xl px-6">
                    <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-neutral-600 animate-fade-in">Slide 03 / The Solution</p>
                    <h2 className="text-4xl font-bold text-white sm:text-5xl md:text-6xl animate-slide-up">
                        Seamless Orchestration.
                    </h2>
                    <div className="mt-16 relative w-full max-w-4xl mx-auto h-64 bg-neutral-900/40 rounded-3xl border border-white/5 flex items-center justify-center gap-12 animate-zoom-in">
                        <div className="flex flex-col items-center z-10">
                            <div className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center font-bold text-xl shadow-lg shadow-white/10">USER</div>
                            <span className="text-[10px] mt-2 font-mono text-neutral-500 uppercase">Single Deposit</span>
                        </div>

                        <div className="flex flex-col items-center z-10">
                            <div className="w-20 h-20 rounded-2xl bg-neutral-800 border-2 border-neutral-600 flex items-center justify-center text-2xl animate-pulse">⚙️</div>
                            <span className="text-[10px] mt-2 font-mono text-neutral-200 uppercase">PolkaVM + XCM</span>
                        </div>

                        <div className="flex flex-col items-center z-10">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40" />
                                <div className="w-8 h-8 rounded-lg bg-pink-500/20 border border-pink-500/40" />
                                <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/40" />
                                <div className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/40" />
                            </div>
                            <span className="text-[10px] mt-2 font-mono text-neutral-500 uppercase">Multi-Chain Yield</span>
                        </div>

                        <div className="absolute inset-0 z-0">
                            <div className="absolute top-1/2 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                        </div>
                    </div>
                    <p className="mt-10 text-lg text-neutral-400 max-w-2xl animate-fade-in" style={{ animationDelay: "0.5s", animationFillMode: "forwards" }}>
                        <strong>PolkaBasket</strong> abstracts all cross-chain complexity. One signature on the Hub handles capital deployment to four different parachains instantly.
                    </p>
                </div>
            ),
        },
        {
            id: 4,
            type: "traction",
            content: (
                <div className="flex flex-col items-center justify-center text-center w-full max-w-6xl">
                    <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-neutral-600 animate-fade-in">Slide 04 / Traction</p>
                    <h2 className="mb-16 text-5xl font-bold text-white md:text-7xl animate-slide-up">
                        Significant Scale.
                    </h2>
                    <div className="grid grid-cols-2 gap-12 sm:grid-cols-4 w-full">
                        {[
                            { value: "$2.42M", label: "Protocol TVL" },
                            { value: "1,247", label: "Depositors" },
                            { value: "3", label: "Active Baskets" },
                            { value: "12%+", label: "Avg. Yield" },
                        ].map((stat, i) => (
                            <div key={stat.label} className="opacity-0 animate-fade-in-up" style={{ animationDelay: `${0.3 + i * 0.1}s`, animationFillMode: "forwards" }}>
                                <p className="text-5xl font-extrabold tracking-tighter text-white sm:text-6xl md:text-7xl">
                                    {stat.value}
                                </p>
                                <div className="mx-auto mt-4 h-1 w-12 bg-neutral-800" />
                                <p className="mt-4 text-xs font-bold uppercase tracking-widest text-neutral-500">
                                    {stat.label}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            ),
        },
        {
            id: 5,
            type: "economics",
            content: (
                <div className="flex flex-col items-center justify-center text-center max-w-5xl px-6">
                    <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-neutral-600 animate-fade-in">Slide 05 / Economic Model</p>
                    <h2 className="text-4xl font-bold text-white sm:text-5xl md:text-6xl animate-slide-up">
                        Risk-Adjusted Alpha.
                    </h2>
                    <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto text-left">
                        <div className="rounded-3xl border border-white/5 bg-white/[0.01] p-10 animate-fade-in-left">
                            <h3 className="text-2xl font-bold text-white mb-6">PVM Optimizer</h3>
                            <p className="text-neutral-500 leading-relaxed mb-6">
                                Our Rust engine, compiled to <strong>PolkaVM</strong>, continuously evaluates protocol health and yield drift.
                                It recalculates optimal weightings every 24 hours.
                            </p>
                            <div className="flex gap-2">
                                <span className="px-3 py-1 rounded-full bg-neutral-800 text-[10px] text-neutral-300">SHARPE RATIO</span>
                                <span className="px-3 py-1 rounded-full bg-neutral-800 text-[10px] text-neutral-300">TVL WEIGHTED</span>
                            </div>
                        </div>
                        <div className="rounded-3xl border border-white/5 bg-white/[0.01] p-10 animate-fade-in-right">
                            <h3 className="text-2xl font-bold text-white mb-6">Yield Sources</h3>
                            <ul className="space-y-4">
                                <li className="flex items-center gap-4">
                                    <div className="w-2 h-2 rounded-full bg-pink-500" />
                                    <span className="text-neutral-300">Hydration Stable LP</span>
                                </li>
                                <li className="flex items-center gap-4">
                                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                                    <span className="text-neutral-300">Moonbeam Lending (WND)</span>
                                </li>
                                <li className="flex items-center gap-4">
                                    <div className="w-2 h-2 rounded-full bg-red-500" />
                                    <span className="text-neutral-300">Acala Liquid Staking</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            ),
        },
        {
            id: 6,
            type: "roadmap",
            content: (
                <div className="flex flex-col items-center justify-center text-center max-w-4xl px-4">
                    <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-neutral-600 animate-fade-in">Slide 06 / Roadmap</p>
                    <h2 className="mb-12 text-4xl font-bold text-white sm:text-5xl md:text-6xl animate-slide-up">
                        The Future is Multi-Parachain.
                    </h2>
                    <div className="space-y-6 max-w-lg mx-auto text-left">
                        {[
                            { q: "Q2 2026", goal: "Integration of 10+ new Parachains", status: "In Progress" },
                            { q: "Q3 2026", goal: "Leveraged Basket Strategies via PVM Engine", status: "Planning" },
                            { q: "Q4 2026", goal: "Autonomous Basket Creation (DAO Governance)", status: "Vision" },
                        ].map((item, i) => (
                            <div key={item.goal} className="group relative border-l-2 border-white/10 pl-8 pb-8 last:pb-0 animate-fade-in-up" style={{ animationDelay: `${0.2 + i * 0.1}s`, animationFillMode: "forwards" }}>
                                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-black border-2 border-white/20 group-hover:border-white transition" />
                                <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">{item.q}</p>
                                <h3 className="text-xl font-semibold text-white mt-1">{item.goal}</h3>
                                <span className="inline-block mt-2 text-[10px] uppercase font-mono px-2 py-0.5 border border-white/10 rounded text-neutral-500">{item.status}</span>
                            </div>
                        ))}
                    </div>
                    <Link to="/" className="mt-16 inline-flex h-14 items-center rounded-full bg-white px-10 text-sm font-bold text-black transition hover:scale-105 active:scale-95 animate-bounce-in">
                        Launch PolkaBasket App
                    </Link>
                </div>
            ),
        },
    ];

    const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
    const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight" || e.key === " ") nextSlide();
            if (e.key === "ArrowLeft") prevSlide();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    return (
        <div className="relative h-screen w-screen overflow-hidden bg-black text-white selection:bg-white/20 cursor-default">
            {/* Dark Background */}
            <div className="absolute inset-0 z-0 bg-neutral-950" />
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_50%,rgba(20,20,20,1)_0%,rgba(0,0,0,1)_100%)]" />

            {/* Cinematic Vignette */}
            <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]" />

            {/* Navigation Indicators */}
            <div className="absolute bottom-10 left-0 right-0 z-30 flex justify-center gap-2">
                {slides.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setCurrentSlide(i)}
                        className={`h-1 rounded-full transition-all duration-500 ${currentSlide === i ? "w-12 bg-white" : "w-6 bg-white/10 hover:bg-white/30"}`}
                    />
                ))}
            </div>

            <div className="relative z-10 flex h-full items-center justify-center px-6">
                <div key={currentSlide} className="flex flex-col items-center justify-center w-full max-w-7xl">
                    {slides[currentSlide].content}
                </div>
            </div>

            {/* Side Navigation Arrows */}
            <div className="absolute inset-y-0 left-0 z-20 flex items-center p-6 md:p-12">
                <button onClick={prevSlide} className={`p-4 rounded-full border border-white/5 bg-white/5 hover:bg-white/10 transition-all ${currentSlide === 0 ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
            </div>
            <div className="absolute inset-y-0 right-0 z-20 flex items-center p-6 md:p-12">
                <button onClick={nextSlide} className={`p-4 rounded-full border border-white/5 bg-white/5 hover:bg-white/10 transition-all ${currentSlide === slides.length - 1 ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
            </div>

            <style>{`
        @keyframes title-pulse {
          from { opacity: 0; transform: scale(0.9) translateY(20px); letter-spacing: -0.05em; }
          to { opacity: 1; transform: scale(1) translateY(0); letter-spacing: -0.02em; }
        }
        @keyframes fade-in { 
          from { opacity: 0; } 
          to { opacity: 1; } 
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-left {
          from { opacity: 0; transform: translateX(-40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fade-in-right {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes zoom-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes bounce-in {
          0% { opacity: 0; transform: scale(0.8); }
          70% { transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(255,255,255,0.1); }
          50% { box-shadow: 0 0 40px rgba(255,255,255,0.3); }
        }
        .animate-title { animation: title-pulse 1.2s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .animate-fade-in { animation: fade-in 1s ease-out both; }
        .animate-slide-up { animation: slide-up 1s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .animate-fade-in-up { animation: fade-in-up 1s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .animate-fade-in-left { animation: fade-in-left 1s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .animate-fade-in-right { animation: fade-in-right 1s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .animate-zoom-in { animation: zoom-in 1s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .animate-glow { animation: glow 4s infinite; }
        .animate-bounce-in { animation: bounce-in 1.2s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .stagger-1 { animation-delay: 0.6s; }
      `}</style>
        </div>
    );
}
