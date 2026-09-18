"use client";
import Link from "next/link";
import { Wallet, TextAa, RocketLaunch, ArrowRight } from "@phosphor-icons/react";
import Reveal from "../Reveal";

const STEPS = [
  {
    icon: Wallet,
    title: "Get a wallet",
    body: "Create one in seconds or import yours. Keys are sealed with AES-256 on your device, then grab free Sepolia ETH from the Google Cloud faucet. The gate checks your balance before the workspace unlocks.",
    code: "wallet: created in-browser\nfaucet: google cloud\nneed: at least 0.005 ETH",
    href: "/config/wallet",
    cta: "Set up wallet",
    flip: false,
  },
  {
    icon: TextAa,
    title: "Describe or drag",
    body: "Type a sentence and let Groq plan the blocks and write the Solidity, or wire thirty blocks by hand. No key? The keyword planner and local engine cover you anyway.",
    code: "prompt → blocks → runFlow()\n30 blocks · 4 toolboxes",
    href: "/dashboard",
    cta: "Open workspace",
    flip: true,
  },
  {
    icon: RocketLaunch,
    title: "Export, deploy",
    body: "Download the .zip with Contract.sol, ABI and deploy script, or deploy straight to Sepolia. Approve in the on-page modal, auto-signed locally, Etherscan proof in seconds.",
    code: "modal approve → signed\nsepolia.etherscan.io proof",
    href: "/deploy",
    cta: "How deploy works",
    flip: false,
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 py-24 md:py-32">
      <Reveal>
        <p className="inline-flex rounded-full border border-line bg-white px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-inksoft dark:border-white/10 dark:bg-panel dark:text-fog">
          How it works
        </p>
        <h2 className="mt-4 max-w-[16ch] font-display text-4xl font-bold tracking-tighter md:text-6xl">
          Three moves. Zero Solidity homework.
        </h2>
      </Reveal>

      <div className="mt-12 space-y-4">
        {STEPS.map((s, i) => (
          <Reveal key={s.title} delay={i * 90}>
            <div className="grid items-stretch gap-4 lg:grid-cols-2">
              <div className={`rounded-[20px] border border-line bg-card p-7 dark:border-white/10 dark:bg-panel md:p-9 ${s.flip ? "lg:order-2" : ""}`}>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cream dark:bg-white/5">
                  <s.icon size={22} weight="duotone" className="text-accent-deep dark:text-emerald-400" />
                </span>
                <h3 className="mt-4 font-display text-2xl font-bold tracking-tight md:text-3xl">{s.title}</h3>
                <p className="mt-2.5 max-w-[52ch] leading-relaxed text-inksoft dark:text-fog">{s.body}</p>
                <Link
                  href={s.href}
                  className="group mt-5 inline-flex items-center gap-1.5 text-[14px] font-bold text-accent-deep dark:text-emerald-400"
                >
                  {s.cta}
                  <ArrowRight size={15} weight="bold" className="transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1" />
                </Link>
              </div>
              <pre className={`overflow-x-auto rounded-[20px] bg-forest p-7 font-mono2 text-[13px] leading-relaxed text-emerald-100/90 md:p-9 ${s.flip ? "lg:order-1" : ""}`}>
                {s.code}
              </pre>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
