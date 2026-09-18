"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Brain, Check, Copy, DownloadSimple, RocketLaunch } from "@phosphor-icons/react";
import { ThemeToggle } from "@/components/ThemeProvider";
import { useProject } from "@/lib/project";
import { downloadProjectZip } from "@/lib/exportZip";

export default function ExportPage() {
  const { gen, engine, compiled } = useProject();
  const [tab, setTab] = useState<"sol" | "abi" | "files">("sol");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const copyAbi = async () => {
    const abi = compiled?.abi ?? gen?.abi;
    if (!abi) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(abi, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const download = async () => {
    if (!gen) return;
    setBusy(true);
    try {
      await downloadProjectZip(gen, compiled, engine);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard" className="flex items-center gap-2 text-[13.5px] font-bold text-inksoft hover:text-ink dark:text-fog dark:hover:text-mist">
          <ArrowLeft size={15} weight="regular" /> Back to workspace
        </Link>
        <div className="flex items-center gap-2">
          <span className="font-mono2 text-[11px] font-bold uppercase tracking-[0.16em] text-muted dark:text-fog">export</span>
          <ThemeToggle />
        </div>
      </div>

      <h1 className="mt-4 font-display text-4xl font-bold tracking-tighter md:text-5xl">Take your code.</h1>
      <p className="mt-2 max-w-[60ch] text-[15px] leading-relaxed text-inksoft dark:text-fog">
        {gen ? "Solidity, ABI and deploy script. Yours to keep." : "Nothing to export yet."}
      </p>

      {!gen ? (
        <div className="mt-6 rounded-[20px] border border-line bg-card p-10 text-center dark:border-white/10 dark:bg-panel">
          <p className="font-display text-2xl font-bold tracking-tight">Press Run first</p>
          <p className="mx-auto mt-2 max-w-[44ch] text-[14px] text-inksoft dark:text-fog">
            Code appears here after you generate it from blocks or a description.
          </p>
          <Link href="/dashboard" className="ez-btn mt-5 inline-flex bg-ink px-6 py-2.5 text-[14px] font-bold text-white dark:bg-mist dark:text-ink">
            Open workspace
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-2 rounded-[20px] bg-forest px-5 py-3.5 text-white">
            <p className="flex items-center gap-1.5 font-mono2 text-[10.5px] uppercase tracking-[0.16em] text-white/55">
              {engine === "groq" && <Brain size={13} weight="duotone" className="text-emerald-300" />}
              {gen.contractName} · {engine === "groq" ? "groq ai" : "local engine"}
            </p>
            <p className="text-[12.5px] font-semibold text-white/90">{gen.summary.slice(0, 4).join(" · ")}</p>
          </div>

          <div className="mt-4 overflow-hidden rounded-[20px] border border-line bg-ink text-white">
            <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-3">
              {([["sol", "Contract.sol"], ["abi", "ABI"], ["files", "Folder"]] as const).map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={`ez-btn px-4 py-1.5 font-mono2 text-[12px] font-bold ${tab === k ? "bg-white text-ink" : "bg-white/10 text-white/70 hover:bg-white/15"}`}
                >
                  {l}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={copyAbi}
                  className="ez-btn flex items-center gap-1.5 bg-white/10 px-3.5 py-1.5 text-[12px] font-bold hover:bg-white/15"
                >
                  {copied ? <Check size={13} weight="regular" /> : <Copy size={13} weight="regular" />} {copied ? "Copied" : "Copy ABI"}
                </button>
                <button
                  onClick={download}
                  disabled={busy}
                  className="ez-btn flex items-center gap-1.5 bg-accent px-3.5 py-1.5 text-[12px] font-bold text-white hover:bg-emerald-500 disabled:opacity-40"
                >
                  <DownloadSimple size={13} weight="regular" /> {busy ? "Zipping…" : ".zip folder"}
                </button>
              </div>
            </div>
            <div className="max-h-[480px] min-h-[280px] overflow-auto p-5">
              {tab === "sol" ? (
                <pre className="whitespace-pre-wrap font-mono2 text-[12.5px] leading-relaxed text-emerald-50/90">{gen.solidity}</pre>
              ) : tab === "abi" ? (
                <pre className="whitespace-pre-wrap font-mono2 text-[12px] leading-relaxed text-sky-100/90">
                  {compiled ? JSON.stringify(compiled.abi, null, 2) : `${JSON.stringify(gen.abi, null, 2)}\n\n// ↑ draft ABI. Deploy for the exact one.`}
                </pre>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {[`${gen.contractName}.sol`, "abi.json", "deploy.js", "README.md", ...(compiled ? ["artifact.json (bytecode)"] : [])].map((f) => (
                    <div key={f} className="rounded-2xl bg-white/[0.06] px-4 py-3 font-mono2 text-[12.5px]">
                      <span className="text-emerald-300">✓</span> {f}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2.5">
            <button
              onClick={download}
              disabled={busy}
              className="ez-btn flex items-center gap-2 bg-ink px-6 py-3 text-[14px] font-bold text-white hover:bg-forest active:scale-[0.99] disabled:opacity-40 dark:bg-mist dark:text-ink dark:hover:bg-emerald-200"
            >
              <DownloadSimple size={15} weight="regular" /> {busy ? "Zipping…" : "Download .zip"}
            </button>
            <Link
              href="/deploy"
              className="ez-btn flex items-center gap-2 bg-accent px-6 py-3 text-[14px] font-bold text-white hover:bg-accent-deep active:scale-[0.99]"
            >
              <RocketLaunch size={15} weight="duotone" /> Deploy it
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
