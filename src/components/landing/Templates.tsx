"use client";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import Reveal from "../Reveal";
import { findBlock } from "@/lib/blocks";

const TEMPLATES = [
  { key: "erc20", title: "ERC-20 Coin", blurb: "Your own currency with balances, allowances and owner minting.", kinds: ["erc20", "ownable", "emitChain"], href: "/dashboard?template=erc20" },
  { key: "nft", title: "NFT Collection", blurb: "One-of-one collectibles with metadata URIs and a pause switch.", kinds: ["erc721", "ownable", "pausable"], href: "/dashboard?template=nft" },
  { key: "escrow", title: "Escrow Deal", blurb: "Buyer funds lock until delivery, arbiter settles disputes.", kinds: ["escrow", "reentrancyGuard", "cei"], href: "/dashboard?template=escrow" },
  { key: "tipjar", title: "Tip Jar", blurb: "Collect Sepolia tips and announce every thank-you onchain.", kinds: ["customContract", "transferEth", "emitChain"], href: "/dashboard?template=tipjar" },
];

export default function Templates() {
  return (
    <section id="templates" className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 pb-24 md:pb-32">
      <Reveal>
        <h2 className="max-w-[18ch] font-display text-4xl font-bold tracking-tighter md:text-6xl">
          Start from a template, not a blank page.
        </h2>
        <p className="mt-4 max-w-[60ch] text-[16px] leading-relaxed text-inksoft dark:text-fog">
          Each one opens a pre-wired canvas you can remix. Four more starters, staking, DAO,
          marketplace and blank, wait inside the workspace.
        </p>
      </Reveal>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {TEMPLATES.map((t, i) => (
          <Reveal key={t.key} delay={i * 80}>
            <Link
              href={t.href}
              className="group flex h-full flex-col rounded-[20px] border border-line bg-card p-7 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:border-ink/25 dark:border-white/10 dark:bg-panel dark:hover:border-white/25"
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-display text-2xl font-bold tracking-tight">{t.title}</h3>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cream transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:bg-accent group-hover:text-white dark:bg-white/5 dark:group-hover:bg-emerald-500">
                  <ArrowRight size={16} weight="bold" className="transition-transform duration-500 group-hover:translate-x-0.5" />
                </span>
              </div>
              <p className="mt-2 text-[14px] leading-relaxed text-inksoft dark:text-fog">{t.blurb}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {t.kinds.map((k) => {
                  const def = findBlock(k);
                  if (!def) return null;
                  return (
                    <span key={k} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-bold ${def.color}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${def.dot}`} />
                      {def.label}
                    </span>
                  );
                })}
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
