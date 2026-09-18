"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, WarningCircle } from "@phosphor-icons/react";
import { ThemeToggle } from "@/components/ThemeProvider";
import AiSettings from "@/components/dashboard/AiSettings";
import CheckRow from "@/components/dashboard/CheckRow";
import { useWallet } from "@/lib/wallet";
import { getGroqKey } from "@/lib/ai";

type KeyState = "none" | "checking" | "valid" | "invalid";

export default function ApiStepPage() {
  const router = useRouter();
  const wallet = useWallet();
  const [keyState, setKeyState] = useState<KeyState>("none");
  const [keyError, setKeyError] = useState("");

  const validateKey = useCallback(async () => {
    const key = getGroqKey();
    if (!key) {
      setKeyState("none");
      setKeyError("");
      return;
    }
    setKeyState("checking");
    setKeyError("");
    try {
      const res = await fetch("/api/validate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: key }),
      });
      const d = (await res.json()) as { valid?: boolean; error?: string };
      if (d.valid) {
        setKeyState("valid");
      } else {
        setKeyState("invalid");
        setKeyError(d.error ?? "Key check failed.");
      }
    } catch {
      setKeyState("invalid");
      setKeyError("Could not reach the checker. Try again.");
    }
  }, []);

  useEffect(() => {
    validateKey();
    window.addEventListener("focus", validateKey);
    return () => window.removeEventListener("focus", validateKey);
  }, [validateKey]);

  const walletOk = !!wallet.address && wallet.hasEnough === true;
  const keyOk = keyState === "valid";
  const localMode = keyState === "none";
  const canContinue = walletOk && (keyOk || localMode);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/config/wallet" className="flex items-center gap-2 text-[13.5px] font-bold text-inksoft hover:text-ink dark:text-fog dark:hover:text-mist">
          <ArrowLeft size={15} weight="regular" /> Back to wallet
        </Link>
        <div className="flex items-center gap-2">
          <span className="font-mono2 text-[11px] font-bold uppercase tracking-[0.16em] text-muted dark:text-fog">step 2 of 2 · AI key</span>
          <ThemeToggle />
        </div>
      </div>

      <h1 className="mt-4 font-display text-4xl font-bold tracking-tighter md:text-5xl">Add AI (optional).</h1>
      <p className="mt-2 max-w-[60ch] text-[15px] leading-relaxed text-inksoft dark:text-fog">
        A Groq key makes Run and Describe smarter. Skip it and the local engine still writes your contracts.
      </p>

      <div className="mt-6 space-y-4">
        <AiSettings />

        <div className="rounded-[20px] border border-line bg-card p-5 dark:border-white/10 dark:bg-panel">
          <p className="font-mono2 text-[11px] font-bold uppercase tracking-[0.16em] text-muted dark:text-fog">system checks</p>
          <div className="mt-3 space-y-2.5">
            <CheckRow
              state={walletOk ? "pass" : "fail"}
              title="Funded wallet from step 1"
              body={
                walletOk ? (
                  <>Still ready. {wallet.balanceEth === null ? "" : `${Number(wallet.balanceEth).toFixed(4)} SepoliaETH available.`}</>
                ) : (
                  <>No funded wallet active. Go back one step and finish the wallet first.</>
                )
              }
              action={
                !walletOk ? (
                  <Link href="/config/wallet" className="ez-btn inline-flex border border-line bg-white px-4 py-2 text-[12.5px] font-bold hover:border-ink/30 dark:border-white/10 dark:bg-white/5">
                    Back to wallet step
                  </Link>
                ) : undefined
              }
            />
            <CheckRow
              state={keyState === "valid" ? "pass" : keyState === "invalid" ? "fail" : "wait"}
              title="Groq API key"
              body={
                keyState === "none" ? (
                  <>No key saved. Continue below and the local engine writes your code.</>
                ) : keyState === "checking" ? (
                  <>Checking key with Groq…</>
                ) : keyState === "valid" ? (
                  <>Key works. Run and Describe will use Groq AI.</>
                ) : (
                  <>{keyError} Fix the key above and validate again, or continue local.</>
                )
              }
              action={
                keyState !== "none" && keyState !== "valid" ? (
                  <button onClick={validateKey} className="ez-btn border border-line bg-white px-4 py-2 text-[12.5px] font-bold hover:border-ink/30 dark:border-white/10 dark:bg-white/5">
                    Validate again
                  </button>
                ) : undefined
              }
            />
          </div>

          {!walletOk && (
            <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-paper px-4 py-2.5 text-[13px] font-semibold text-inksoft dark:bg-white/[0.04] dark:text-fog">
              <WarningCircle size={16} weight="fill" className="shrink-0 text-amber-500" />
              A funded wallet is required before the workspace unlocks.
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              disabled={!canContinue}
              className="ez-btn group flex items-center gap-2 bg-accent px-7 py-3 text-[15px] font-bold text-white transition-all hover:bg-accent-deep active:scale-[0.98] disabled:opacity-40"
            >
              {localMode ? "Continue with local engine" : "Continue to dashboard"}
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition-transform duration-500 group-hover:translate-x-1">
                <ArrowRight size={15} weight="regular" />
              </span>
            </button>
            {localMode && walletOk && (
              <span className="font-mono2 text-[11.5px] text-muted dark:text-fog">no key, local template engine</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
