"use client";
import Link from "next/link";
import { ArrowRight, Play, Coins, ShieldCheck, Megaphone } from "@phosphor-icons/react";
import Reveal from "../Reveal";

function LivePreview() {
  return (
    <div className="relative overflow-hidden rounded-[20px] bg-forest p-5 text-white">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate rounded-xl bg-white/10 px-3 py-2 font-mono2 text-[12px] text-white">
          “An ERC-20 for my running club…”
        </p>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-400/15 px-3 py-1 text-[11px] font-bold text-emerald-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
          Groq AI
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[12px] font-bold">
        {[
          { icon: Coins, t: "ERC-20 Token", c: "border-emerald-300/30 bg-white/[0.07]" },
          { icon: ShieldCheck, t: "Ownable", c: "border-amber-200/30 bg-white/[0.07]" },
          { icon: Megaphone, t: "Emit Event", c: "border-sky-200/30 bg-white/[0.07]" },
        ].map((r) => (
          <div key={r.t} className={`rounded-2xl border px-2 py-3 ${r.c}`}>
            <r.icon size={18} weight="duotone" className="mx-auto" />
            <span className="mt-1 block leading-tight">{r.t}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl bg-black/40 p-4 font-mono2 text-[12px] leading-relaxed">
        <p className="text-white/40">{"// generated automatically"}</p>
        <p><span className="text-emerald-300">function</span> <span className="text-white">runFlow</span><span className="text-white/60">() payable {"{"}</span></p>
        <p className="pl-4 text-white/80">mint(msg.sender, 1000);</p>
        <p className="pl-4 text-white/80">emit Announced(<span className="text-amber-200">"Club coin live"</span>);</p>
        <p className="text-white/60">{"}"}</p>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-2xl bg-accent px-4 py-3">
        <span className="text-[13px] font-bold text-white">Approved on-page, auto-signed</span>
        <span className="font-mono2 text-[11px] text-white/80">sepolia.etherscan.io</span>
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <header className="mx-auto w-full max-w-7xl px-4 pt-28 md:pt-32">
      <div className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
        <Reveal delay={120} className="order-2 lg:order-1">
          <div className="bezel">
            <div className="bezel-inner p-2">
              <LivePreview />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between px-2 font-mono2 text-[11px] text-muted dark:text-fog">
            <span>sentence → blocks → solidity</span>
            <span className="rounded-full bg-accent-soft px-2.5 py-1 font-bold text-accent-deep dark:bg-emerald-400/10 dark:text-emerald-300">live product flow</span>
          </div>
        </Reveal>

        <Reveal className="order-1 lg:order-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-inksoft dark:border-white/10 dark:bg-panel dark:text-fog">
              <span className="h-2 w-2 rounded-full bg-accent" />
              By ETHShala · for total beginners
            </span>
            <h1 className="mt-5 font-display text-5xl font-bold leading-[0.95] tracking-tighter md:text-7xl">
              Type a sentence.
              <br />
              <span className="italic leading-[1.1] text-accent-deep dark:text-emerald-400">Ship a contract.</span>
            </h1>
            <p className="mt-5 max-w-[46ch] text-[17px] leading-relaxed text-inksoft dark:text-fog">
              EZContract turns plain English and drag-drop blocks into clean Solidity on Sepolia. No wallet setup hell, no Solidity homework.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/config/wallet"
                className="group ez-btn flex items-center gap-2 bg-ink px-7 py-3.5 text-[15px] font-bold text-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-forest active:scale-[0.98] dark:bg-mist dark:text-ink dark:hover:bg-emerald-200"
              >
                Start building free
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition-transform duration-500 group-hover:translate-x-1 dark:bg-ink/10">
                  <ArrowRight size={15} weight="bold" />
                </span>
              </Link>
              <a
                href="#demo"
                className="group ez-btn flex items-center gap-2 border border-ink/15 bg-white px-6 py-3.5 text-[15px] font-bold transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-ink/30 active:scale-[0.98] dark:border-white/15 dark:bg-panel dark:hover:border-white/30"
              >
                <Play size={15} weight="fill" className="text-accent-deep dark:text-emerald-400" />
                Try the planner
              </a>
            </div>
            <p className="mt-5 font-mono2 text-[12px] text-muted dark:text-fog">
              Free testnet, free faucet ETH, keys stay on your device
            </p>
          </div>
        </Reveal>
      </div>

      <Reveal delay={80}>
        <div className="mt-12 grid grid-cols-2 gap-3 border-t border-line pt-6 dark:border-white/10 md:grid-cols-4">
          {[
            ["Sepolia testnet", "real Ethereum, zero real money"],
            ["Keys stay home", "AES-256 encrypted, never uploaded"],
            ["AI plus fallback", "Groq key optional, local engine included"],
            ["Etherscan proof", "address, ABI and tx links"],
          ].map(([t, s]) => (
            <div key={t} className="rounded-2xl bg-white/70 px-4 py-3.5 dark:bg-white/[0.04]">
              <p className="text-[14px] font-bold">{t}</p>
              <p className="text-[13px] text-muted dark:text-fog">{s}</p>
            </div>
          ))}
        </div>
      </Reveal>
    </header>
  );
}
