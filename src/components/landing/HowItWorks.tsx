"use client";
import Link from "next/link";
import { Wallet, Stack, RocketLaunch, ArrowRight } from "@phosphor-icons/react";
import Reveal from "../Reveal";

const STEPS = [
  {
    n: "01",
    icon: Wallet,
    title: "Connect + check balance",
    body: "Link MetaMask. We switch you to Sepolia and check you hold enough test ETH. Broke? One click takes you to a free faucet.",
    code: "chain: sepolia 11155111\nneed: ≥ 0.005 ETH\ncost: $0 real money",
  },
  {
    n: "02",
    icon: Stack,
    title: "Drag, drop, press Run",
    body: "Pick triggers, checks and actions like Lego. Connect them like n8n. Run turns the drawing into clean Solidity + ABI instantly.",
    code: "9 blocks · plain english\nrun → Contract.sol\nrun → ABI + deploy.js",
  },
  {
    n: "03",
    icon: RocketLaunch,
    title: "Deploy + share the proof",
    body: "Happy? Deploy from the dashboard. You get a live address, an ABI for your app, and an Etherscan link to flex.",
    code: "sepolia.etherscan.io/\naddress/0x…\nabi.json included",
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="w-full scroll-mt-24 bg-ink py-24 text-white md:py-32">
      <div className="mx-auto max-w-7xl px-4">
        <Reveal>
          <p className="inline-flex rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-200">
            How it works
          </p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
            <h2 className="max-w-[16ch] font-display text-4xl font-bold tracking-tighter md:text-6xl">
              Three steps. Zero Solidity homework.
            </h2>
            <Link
              href="/config/wallet"
              className="group ez-btn flex items-center gap-2 bg-accent px-6 py-3 text-[15px] font-bold text-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-emerald-500 active:scale-[0.98]"
            >
              Try the dashboard
              <ArrowRight size={16} weight="bold" className="transition-transform duration-500 group-hover:translate-x-1" />
            </Link>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 110}>
              <div className="bezel-dark h-full">
                <div className="bezel-dark-inner flex h-full flex-col p-7">
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                      <s.icon size={22} weight="duotone" className="text-emerald-300" />
                    </span>
                    <span className="font-display text-5xl font-bold text-white/15">{s.n}</span>
                  </div>
                  <h3 className="mt-5 font-display text-2xl font-bold tracking-tight">{s.title}</h3>
                  <p className="mt-2.5 flex-1 leading-relaxed text-white/70">{s.body}</p>
                  <pre className="mt-5 overflow-x-auto rounded-2xl bg-black/50 p-4 font-mono2 text-[12px] leading-relaxed text-emerald-100/90">
                    {s.code}
                  </pre>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={100}>
          <div id="templates" className="mt-12 grid scroll-mt-28 gap-3 rounded-[20px] border border-white/10 bg-white/[0.04] p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8">
            <div>
              <p className="font-display text-2xl font-bold tracking-tight">Start from a template, not a blank page.</p>
              <p className="mt-1.5 text-white/65">Tip jar, Club entry, Timed vault and Badge drop. Each one is a pre-wired canvas you can remix.</p>
            </div>
            <Link
              href="/dashboard?template=tipjar"
              className="ez-btn bg-white px-6 py-3 text-center text-[15px] font-bold text-ink transition-all duration-500 hover:bg-emerald-100 active:scale-[0.98]"
            >
              Open the tip-jar template
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
