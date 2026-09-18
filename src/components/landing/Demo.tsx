"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkle } from "@phosphor-icons/react";
import Reveal from "../Reveal";
import { keywordTemplate, guessName, type TemplateKey } from "@/lib/plan";
import { findBlock } from "@/lib/blocks";

const META: Record<TemplateKey, { title: string; blurb: string; kinds: string[]; href: string }> = {
  erc20: { title: "ERC-20 Coin", blurb: "Balances, minting and allowances.", kinds: ["erc20", "ownable", "emitChain"], href: "/dashboard?template=erc20" },
  nft: { title: "NFT Collection", blurb: "Unique tokens with a pause switch.", kinds: ["erc721", "ownable", "pausable"], href: "/dashboard?template=nft" },
  escrow: { title: "Escrow Deal", blurb: "Money held until delivery lands.", kinds: ["escrow", "reentrancyGuard", "cei"], href: "/dashboard?template=escrow" },
  staking: { title: "Staking Pool", blurb: "Lock ETH, earn rewards over time.", kinds: ["staking", "reentrancyGuard", "emitChain"], href: "/dashboard?template=staking" },
  dao: { title: "DAO Voting", blurb: "Proposals, votes and execution.", kinds: ["dao", "accessControl", "emitChain"], href: "/dashboard?template=dao" },
  market: { title: "Marketplace", blurb: "List NFTs, take a fee per sale.", kinds: ["marketplace", "ownable", "reentrancyGuard"], href: "/dashboard?template=market" },
  tipjar: { title: "Tip Jar", blurb: "Collect tips, announce thanks.", kinds: ["customContract", "transferEth", "emitChain"], href: "/dashboard?template=tipjar" },
  starter: { title: "Blank Canvas", blurb: "Custom contract, your rules.", kinds: ["customContract", "requireCheck", "emitChain"], href: "/dashboard" },
};

const EXAMPLES = [
  "An ERC-20 for my running club",
  "NFT passes for my event",
  "Hold pay until the work lands",
];

export default function Demo() {
  const [text, setText] = useState("An ERC-20 for my running club");
  const [tried, setTried] = useState(false);

  const run = () => setTried(true);
  const key = tried ? keywordTemplate(text.trim().length > 1 ? text : EXAMPLES[0]) : keywordTemplate(EXAMPLES[0]);
  const meta = META[key];
  const name = tried && text.trim().length > 1 ? guessName(text) : null;

  return (
    <section id="demo" className="w-full scroll-mt-24 bg-ink py-24 text-white md:py-32">
      <div className="mx-auto max-w-7xl px-4">
        <Reveal>
          <p className="inline-flex rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-200">
            Live planner demo
          </p>
          <h2 className="mt-4 max-w-[18ch] font-display text-4xl font-bold tracking-tighter md:text-6xl">
            Type it here. Watch it become blocks.
          </h2>
          <p className="mt-4 max-w-[60ch] text-[16px] leading-relaxed text-white/70">
            This is the real keyword planner from the studio, running in your browser. In the app,
            Groq AI takes it further and writes the Solidity too.
          </p>
        </Reveal>

        <Reveal delay={100}>
          <div className="bezel-dark mt-10">
            <div className="bezel-dark-inner p-6 md:p-8">
              <div className="flex flex-col gap-2.5 lg:flex-row">
                <input
                  value={text}
                  onChange={(e) => { setText(e.target.value); setTried(false); }}
                  onKeyDown={(e) => { if (e.key === "Enter") run(); }}
                  placeholder="Describe your contract…"
                  aria-label="Describe your contract"
                  className="w-full flex-1 rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-[15px] text-white outline-none placeholder:text-white/35 focus:border-emerald-300/50"
                />
                <button
                  onClick={run}
                  className="group ez-btn flex items-center justify-center gap-2 bg-accent px-6 py-3 text-[15px] font-bold text-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-emerald-500 active:scale-[0.98] lg:w-44"
                >
                  <Sparkle size={16} weight="duotone" />
                  Plan it
                </button>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => { setText(ex); setTried(true); }}
                    className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[12px] font-semibold text-white/70 transition-colors hover:border-emerald-300/40 hover:text-white"
                  >
                    {ex}
                  </button>
                ))}
              </div>

              <div className="mt-6 grid gap-4 border-t border-white/10 pt-6 md:grid-cols-[1fr_1.4fr] md:gap-8">
                <div>
                  <p className="font-mono2 text-[11px] uppercase tracking-[0.2em] text-white/45">matched template</p>
                  <p className="mt-2 font-display text-3xl font-bold tracking-tight">
                    {meta.title}{name ? <span className="text-emerald-300"> · {name}</span> : null}
                  </p>
                  <p className="mt-2 text-[14px] leading-relaxed text-white/65">{meta.blurb}</p>
                  <Link
                    href={meta.href}
                    className="group ez-btn mt-5 inline-flex items-center gap-2 bg-white px-6 py-3 text-[15px] font-bold text-ink transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-emerald-100 active:scale-[0.98]"
                  >
                    Open this canvas
                    <ArrowRight size={16} weight="bold" className="transition-transform duration-500 group-hover:translate-x-1" />
                  </Link>
                </div>
                <div className="flex flex-col justify-center gap-2">
                  {meta.kinds.map((k, i) => {
                    const def = findBlock(k);
                    if (!def) return null;
                    return (
                      <div key={k} className="flex items-center gap-3">
                        <div className={`flex flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3`}>
                          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${def.dot}`} />
                          <span>
                            <span className="block text-[14px] font-bold leading-tight">{def.label}</span>
                            <span className="block font-mono2 text-[11px] text-white/50">{def.category}</span>
                          </span>
                        </div>
                        {i < meta.kinds.length - 1 && <span className="hidden" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
