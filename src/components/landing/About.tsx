"use client";
import { ChatText, LockKey, Coins } from "@phosphor-icons/react";
import Reveal from "../Reveal";

const ROWS = [
  {
    icon: ChatText,
    kick: "no solidity",
    title: "Start from a sentence, not a spec",
    body: "“An ERC-20 for my running club.” The planner maps it to blocks, Groq AI refines it, and the canvas stays editable. Every step speaks plain English first.",
  },
  {
    icon: LockKey,
    kick: "no uploads",
    title: "Your keys never leave this device",
    body: "Wallets are created in your browser and sealed with AES-256 encryption. Deployments are approved in an on-page modal and auto-signed locally. No popups, no custody, no server ever sees a secret.",
  },
  {
    icon: Coins,
    kick: "no real money",
    title: "Testnet practice with real proof",
    body: "Everything runs on Sepolia with free faucet ETH. What you ship is still real: a live address, a full ABI, and an Etherscan trail you can send to anyone.",
  },
];

export default function About() {
  return (
    <section id="why" className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 py-24 md:py-32">
      <Reveal>
        <h2 className="max-w-[20ch] font-display text-4xl font-bold tracking-tighter md:text-6xl">
          Web3 is confusing. Building on it shouldn&apos;t be.
        </h2>
        <p className="mt-4 max-w-[62ch] text-[16px] leading-relaxed text-inksoft dark:text-fog">
          Most tools assume you already know wallets, gas and Solidity. EZContract assumes you know
          nothing, then removes the three things that stop beginners cold.
        </p>
      </Reveal>

      <div className="mt-12">
        {ROWS.map((r, i) => (
          <Reveal key={r.kick} delay={i * 90}>
            <div className={`border-t border-line py-8 dark:border-white/10 md:py-10 ${i === 1 ? "md:ml-24" : ""} ${i === 2 ? "md:ml-48" : ""} ${i === ROWS.length - 1 ? "border-b" : ""}`}>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-10">
                <div className="flex shrink-0 items-center gap-3 md:w-64">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cream dark:bg-white/5">
                    <r.icon size={22} weight="duotone" className="text-accent-deep dark:text-emerald-400" />
                  </span>
                  <span className="font-mono2 text-[11px] uppercase tracking-[0.2em] text-muted dark:text-fog">{r.kick}</span>
                </div>
                <div className="max-w-[62ch]">
                  <h3 className="font-display text-2xl font-bold tracking-tight md:text-3xl">{r.title}</h3>
                  <p className="mt-2.5 leading-relaxed text-inksoft dark:text-fog">{r.body}</p>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
