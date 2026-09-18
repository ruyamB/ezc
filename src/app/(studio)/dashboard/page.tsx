"use client";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, GearSix } from "@phosphor-icons/react";
import { ThemeToggle } from "@/components/ThemeProvider";
import Builder from "@/components/dashboard/Builder";

const TEMPLATE_BLURB: Record<string, string> = {
  erc20: "ERC-20 template loaded. Set your name, symbol and supply, then Run.",
  nft: "NFT template loaded. Set your collection details, then Run.",
  escrow: "Escrow template loaded. Fill in seller and arbiter, then Run.",
  tipjar: "Tip-jar template loaded. Press Run to see its code, then make it yours.",
};

function DashInner() {
  const sp = useSearchParams();
  const template = sp.get("template");
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 text-[13.5px] font-bold text-inksoft hover:text-ink dark:text-fog dark:hover:text-mist">
            <ArrowLeft size={15} weight="regular" /> Home
          </Link>
          <span className="text-muted dark:text-fog">/</span>
          <Link href="/config/wallet" className="flex items-center gap-1.5 text-[13.5px] font-bold text-inksoft hover:text-ink dark:text-fog dark:hover:text-mist">
            <GearSix size={15} weight="regular" /> Setup
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-1.5 font-mono2 text-[11px] font-bold text-muted dark:border-white/10 dark:bg-panel dark:text-fog">
            <span className="h-2 w-2 animate-pulse rounded-full bg-accent" /> EZContract studio, Sepolia only
          </span>
          <ThemeToggle />
        </div>
      </div>

      <div className="mt-4">
        <h1 className="font-display text-4xl font-bold tracking-tighter md:text-5xl">Build your contract.</h1>
        <p className="mt-2 max-w-[64ch] text-[15px] leading-relaxed text-inksoft dark:text-fog">
          {TEMPLATE_BLURB[template ?? ""] ?? "Describe it or drag blocks, press Run, then Export or Deploy from the toolbar."}
        </p>
      </div>

      <div className="mt-5">
        <Builder initialTemplate={template} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-10 font-mono2 text-sm text-muted">Loading studio…</div>}>
      <DashInner />
    </Suspense>
  );
}
