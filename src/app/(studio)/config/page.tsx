"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle, WarningCircle, CircleDashed, XCircle, Drop } from "@phosphor-icons/react";
import { ThemeToggle } from "@/components/ThemeProvider";
import WalletBar from "@/components/dashboard/WalletBar";
import AiSettings from "@/components/dashboard/AiSettings";
import { useWallet, MIN_BALANCE_ETH, GOOGLE_FAUCET_URL } from "@/lib/wallet";
import { getGroqKey } from "@/lib/ai";

type KeyState = "none" | "checking" | "valid" | "invalid";

function CheckRow({
  state,
  title,
  body,
  action,
}: {
  state: "pass" | "fail" | "wait";
  title: string;
  body: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start gap-3 rounded-2xl bg-paper p-4 dark:bg-white/[0.04]">
      <span className="mt-0.5">
        {state === "pass" ? (
          <CheckCircle size={22} weight="fill" className="text-accent-deep dark:text-emerald-400" />
        ) : state === "fail" ? (
          <XCircle size={22} weight="fill" className="text-red-500 dark:text-red-400" />
        ) : (
          <CircleDashed size={22} weight="regular" className="text-muted dark:text-fog" />
        )}
      </span>
      <div className="min-w-52 flex-1">
        <p className="text-[14.5px] font-bold">{title}</p>
        <div className="mt-0.5 text-[13px] leading-relaxed text-inksoft dark:text-fog">{body}</div>
        {action && <div className="mt-2.5">{action}</div>}
      </div>
    </div>
  );
}

function ConfigInner() {
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
  const walletLow = !!wallet.address && wallet.hasEnough === false;
  const keyOk = keyState === "valid";
  const localMode = keyState === "none";
  const canContinue = walletOk && (keyOk || localMode);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 text-[13.5px] font-bold text-inksoft hover:text-ink dark:text-fog dark:hover:text-mist">
          <ArrowLeft size={15} weight="regular" /> Home
        </Link>
        <div className="flex items-center gap-2">
          <span className="font-mono2 text-[11px] font-bold uppercase tracking-[0.16em] text-muted dark:text-fog">step 1 of 2, setup</span>
          <ThemeToggle />
        </div>
      </div>

      <h1 className="mt-4 font-display text-4xl font-bold tracking-tighter md:text-5xl">Set up your studio.</h1>
      <p className="mt-2 max-w-[60ch] text-[15px] leading-relaxed text-inksoft dark:text-fog">
        Two minutes, once. Get a wallet with free test ETH and an AI key, then the workspace unlocks.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <p className="mb-2 font-mono2 text-[11px] font-bold uppercase tracking-[0.16em] text-muted dark:text-fog">1, Wallet + free test ETH</p>
          <WalletBar />
        </div>

        <div>
          <p className="mb-2 font-mono2 text-[11px] font-bold uppercase tracking-[0.16em] text-muted dark:text-fog">2, AI key (optional, smarter code)</p>
          <AiSettings />
        </div>

        <div className="rounded-[20px] border border-line bg-card p-5 dark:border-white/10 dark:bg-panel">
          <p className="font-mono2 text-[11px] font-bold uppercase tracking-[0.16em] text-muted dark:text-fog">3, System checks</p>

          <div className="mt-3 space-y-2.5">
            <CheckRow
              state={!wallet.address ? "wait" : walletOk ? "pass" : "fail"}
              title="Enough Sepolia ETH on your address"
              body={
                !wallet.address ? (
                  <>Create or unlock a wallet above first.</>
                ) : walletLow ? (
                  <>
                    Balance is {wallet.balanceEth === null ? "…" : `${Number(wallet.balanceEth).toFixed(5)} ETH`}, need at least {MIN_BALANCE_ETH} ETH. Top up free, then press Refresh on the wallet card.
                  </>
                ) : (
                  <>Ready. {wallet.balanceEth === null ? "" : `${Number(wallet.balanceEth).toFixed(4)} SepoliaETH available.`}</>
                )
              }
              action={
                walletLow ? (
                  <a href={GOOGLE_FAUCET_URL} target="_blank" rel="noreferrer" className="ez-btn inline-flex items-center gap-1.5 bg-ink px-4 py-2 text-[12.5px] font-bold text-white dark:bg-mist dark:text-ink">
                    <Drop size={14} weight="regular" /> Open Google Cloud faucet
                  </a>
                ) : undefined
              }
            />

            <CheckRow
              state={keyState === "valid" ? "pass" : keyState === "invalid" ? "fail" : "wait"}
              title="Groq API key"
              body={
                keyState === "none" ? (
                  <>No key saved. You can continue with the local engine, or paste a key above and validate it.</>
                ) : keyState === "checking" ? (
                  <>Checking key with Groq…</>
                ) : keyState === "valid" ? (
                  <>Key works. Run and Describe will use Groq AI.</>
                ) : (
                  <>{keyError} Fix the key above and validate again.</>
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

          {!wallet.address && (
            <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-paper px-4 py-2.5 text-[13px] font-semibold text-inksoft dark:bg-white/[0.04] dark:text-fog">
              <WarningCircle size={16} weight="fill" className="shrink-0 text-amber-500" />
              Finish the wallet step above to continue.
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

export default function ConfigPage() {
  return <ConfigInner />;
}
