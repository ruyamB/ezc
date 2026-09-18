"use client";
import { useRef } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import Reveal from "../Reveal";
import { BLOCKS, type BlockCategory } from "@/lib/blocks";

const GROUPS: { name: BlockCategory; line: string }[] = [
  { name: "Contracts", line: "What the contract is. Pick one as your base." },
  { name: "Logic", line: "How it thinks. Rules, records and custom functions." },
  { name: "Security", line: "How it stays safe. Battle-tested guards." },
  { name: "Chain", line: "How it talks to Sepolia. Money, calls and logs." },
];

export default function Toolbox() {
  const rail = useRef<HTMLDivElement>(null);
  const nudge = (dir: 1 | -1) => {
    rail.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  return (
    <section id="toolbox" className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 py-24 md:py-32">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="max-w-[18ch] font-display text-4xl font-bold tracking-tighter md:text-6xl">
              Thirty blocks. Four toolboxes.
            </h2>
            <p className="mt-4 max-w-[60ch] text-[16px] leading-relaxed text-inksoft dark:text-fog">
              Each block is a pre-checked Solidity snippet with plain-English settings.
              Drag them in, connect top to bottom, press Run.
            </p>
          </div>
          <div className="hidden gap-2 md:flex">
            <button onClick={() => nudge(-1)} aria-label="Scroll toolboxes left" className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-ink/30 active:scale-[0.96] dark:border-white/10 dark:bg-panel">
              <CaretLeft size={18} weight="regular" />
            </button>
            <button onClick={() => nudge(1)} aria-label="Scroll toolboxes right" className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-ink/30 active:scale-[0.96] dark:border-white/10 dark:bg-panel">
              <CaretRight size={18} weight="regular" />
            </button>
          </div>
        </div>
      </Reveal>

      <Reveal delay={100}>
        <div ref={rail} className="mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
          {GROUPS.map((g) => {
            const items = BLOCKS.filter((b) => b.category === g.name);
            return (
              <article
                key={g.name}
                className="w-[85vw] max-w-[420px] shrink-0 snap-start rounded-[20px] border border-line bg-card p-7 shadow-[0_20px_60px_-40px_rgba(18,55,42,0.4)] dark:border-white/10 dark:bg-panel dark:shadow-[0_20px_60px_-40px_rgba(0,0,0,0.8)] sm:w-[420px]"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-2xl font-bold tracking-tight">{g.name}</h3>
                  <span className="font-mono2 text-[11px] text-muted dark:text-fog">{items.length} blocks</span>
                </div>
                <p className="mt-1.5 text-[14px] text-inksoft dark:text-fog">{g.line}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {items.map((b) => (
                    <span
                      key={b.kind}
                      title={b.plain}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-bold ${b.color}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${b.dot}`} />
                      {b.label}
                    </span>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}
