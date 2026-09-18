"use client";
import { useState } from "react";
import Link from "next/link";
import { List, X, ArrowUpRight } from "@phosphor-icons/react";
import { ThemeToggle } from "@/components/ThemeProvider";

export default function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-40 flex justify-center px-4 pt-5">
        <div className="w-full max-w-5xl rounded-full border border-white/40 bg-white/70 shadow-[0_10px_40px_-15px_rgba(18,55,42,0.3)] backdrop-blur-2xl dark:border-white/10 dark:bg-panel/70 dark:shadow-[0_10px_40px_-15px_rgba(0,0,0,0.8)]">
          <div className="flex h-14 items-center justify-between pl-5 pr-2">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink font-display text-sm font-bold text-white dark:bg-mist dark:text-ink">
                EZ
              </span>
              <span className="leading-none">
                <span className="block font-display text-[15px] font-700 font-bold tracking-tight">EZContract</span>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted dark:text-fog">
                  by ETHShala
                </span>
              </span>
            </Link>
            <nav className="hidden items-center gap-7 text-[14px] font-semibold text-inksoft dark:text-fog md:flex">
              <a href="#why" className="transition-colors hover:text-ink dark:hover:text-mist">Why it exists</a>
              <a href="#demo" className="transition-colors hover:text-ink dark:hover:text-mist">Planner</a>
              <a href="#how" className="transition-colors hover:text-ink dark:hover:text-mist">How it works</a>
              <a href="#templates" className="transition-colors hover:text-ink dark:hover:text-mist">Templates</a>
            </nav>
            <div className="flex items-center gap-2">
              <ThemeToggle className="h-10 w-10 border-transparent bg-transparent" />
              <Link
                href="/config/wallet"
                className="group ez-btn hidden items-center gap-2 bg-ink px-5 py-2.5 text-[14px] font-bold text-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-forest active:scale-[0.98] dark:bg-mist dark:text-ink dark:hover:bg-emerald-200 sm:flex"
              >
                Start building free
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 dark:bg-ink/10">
                  <ArrowUpRight size={14} weight="bold" />
                </span>
              </Link>
              <button
                onClick={() => setOpen(!open)}
                aria-label="Menu"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white dark:border-white/10 dark:bg-white/5 md:hidden"
              >
                {open ? <X size={18} /> : <List size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-30 bg-ink/80 backdrop-blur-3xl md:hidden">
          <div className="flex min-h-full flex-col items-center justify-center gap-2 px-8">
            {[
              { label: "Why it exists", href: "#why" },
              { label: "Planner", href: "#demo" },
              { label: "How it works", href: "#how" },
              { label: "Templates", href: "#templates" },
              { label: "Start building free", href: "/config/wallet" },
            ].map((l, i) => (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                style={{ transitionDelay: `${100 + i * 60}ms` }}
                className="w-full rounded-2xl bg-white/10 px-6 py-4 text-center font-display text-2xl font-bold text-white"
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
