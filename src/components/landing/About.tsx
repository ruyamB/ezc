"use client";
import { Eye, ShieldCheck, HandHeart } from "@phosphor-icons/react";
import Reveal from "../Reveal";

const CELLS = [
  {
    icon: Eye,
    title: "You describe the deal",
    body: "“Only let members in after they pay 0.01 ETH.” That sentence is already 90% of a contract. EZContract just draws it as blocks.",
    tag: "No jargon",
    wide: true,
  },
  {
    icon: ShieldCheck,
    title: "Templates do the hard math",
    body: "Every block is a pre-checked Solidity snippet. Overflow, ownership and reverts are handled before you press Run.",
    tag: "Safe by default",
    wide: false,
  },
  {
    icon: HandHeart,
    title: " humans, not docs",
    body: "Stuck? ETHShala runs live cohorts and reviews. You are never reading a 400-page yellow paper alone at 2am.",
    tag: "ETHShala care",
    wide: false,
  },
];

export default function About() {
  return (
    <section id="about" className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 py-24 md:py-32">
      <Reveal>
        <h2 className="max-w-[20ch] font-display text-4xl font-bold tracking-tighter md:text-6xl">
          Web3 is confusing. Building on it shouldn&apos;t be.
        </h2>
        <p className="mt-4 max-w-[62ch] text-[16px] leading-relaxed text-inksoft dark:text-fog">
          Most tools assume you already know wallets, gas and Solidity. EZContract assumes you know
          nothing. It walks you from a plain sentence to a live contract with an Etherscan link
          you can send to anyone.
        </p>
      </Reveal>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <Reveal className="md:col-span-2">
          <div className="bezel">
            <div className="bezel-inner grid gap-6 p-7 md:grid-cols-[1fr_1fr] md:p-10">
              <div>
                <span className="rounded-full bg-accent-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-accent-deep dark:bg-emerald-400/10 dark:text-emerald-300">
                  {CELLS[0].tag}
                </span>
                <h3 className="mt-3 font-display text-3xl font-bold tracking-tight">{CELLS[0].title}</h3>
                <p className="mt-3 leading-relaxed text-inksoft dark:text-fog">{CELLS[0].body}</p>
                <div className="mt-5 flex flex-wrap gap-2 font-mono2 text-[12px]">
                  {["if paid →", "check owner →", "send + announce"].map((s) => (
                    <span key={s} className="rounded-full border border-line bg-paper px-3 py-1.5 dark:border-white/10 dark:bg-white/5">{s}</span>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl bg-forest p-5 font-mono2 text-[13px] leading-relaxed text-white/85">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">plain english → blocks</p>
                <p className="mt-3 rounded-xl bg-white/10 p-3 text-white">“Charge 0.01 ETH for entry, only I can withdraw.”</p>
                <p className="mt-2 text-emerald-300">↓ becomes 3 blocks on your canvas</p>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[12px] font-bold">
                  <span className="rounded-xl bg-emerald-400/20 px-2 py-2.5">Must send ETH</span>
                  <span className="rounded-xl bg-amber-200/20 px-2 py-2.5">Only owner</span>
                  <span className="rounded-xl bg-sky-300/20 px-2 py-2.5">Send money</span>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        {CELLS.slice(1).map((c, i) => (
          <Reveal key={c.title} delay={i * 100}>
            <div className="h-full rounded-[20px] border border-line bg-card p-7 shadow-[0_20px_60px_-40px_rgba(18,55,42,0.4)] dark:border-white/10 dark:bg-panel dark:shadow-[0_20px_60px_-40px_rgba(0,0,0,0.8)]">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cream dark:bg-white/5">
                <c.icon size={22} weight="duotone" className="text-accent-deep dark:text-emerald-400" />
              </span>
              <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-accent-deep dark:text-emerald-400">{c.tag}</p>
              <h3 className="mt-1.5 font-display text-2xl font-bold tracking-tight">{c.title}</h3>
              <p className="mt-2.5 leading-relaxed text-inksoft dark:text-fog">{c.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
