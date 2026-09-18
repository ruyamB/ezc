"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Drop } from "@phosphor-icons/react";
import { ThemeToggle } from "@/components/ThemeProvider";
import WalletBar from "@/components/dashboard/WalletBar";
import CheckRow from "@/components/dashboard/CheckRow";
import { useWallet, MIN_BALANCE_ETH, GOOGLE_FAUCET_URL } from "@/lib/wallet";

export default function WalletStepPage() {
  const router = useRouter();
  const wallet = useWallet();
  const walletOk = !!wallet.address && wallet.hasEnough === true;
  const walletLow = !!wallet.address && wallet.hasEnough === false;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 text-[13.5px] font-bold text-inksoft hover:text-ink dark:text-fog dark:hover:text-mist">
          <ArrowLeft size={15} weight="regular" /> Home
        </Link>
        <div className="flex items-center gap-2">
          <span className="font-mono2 text-[11px] font-bold uppercase tracking-[0.16em] text-muted dark:text-fog">step 1 of 2 · wallet</span>
          <ThemeToggle />
        </div>
      </div>

      <h1 className="mt-4 font-display text-4xl font-bold tracking-tighter md:text-5xl">Get a wallet.</h1>
      <p className="mt-2 max-w-[60ch] text-[15px] leading-relaxed text-inksoft dark:text-fog">
        Create one here in seconds or bring your own, then grab free Sepolia test ETH. Deploying costs nothing real.
      </p>

      <div className="mt-6 space-y-4">
        <WalletBar />

        <div className="rounded-[20px] border border-line bg-card p-5 dark:border-white/10 dark:bg-panel">
          <p className="font-mono2 text-[11px] font-bold uppercase tracking-[0.16em] text-muted dark:text-fog">funds check</p>
          <div className="mt-3">
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
          </div>
          <div className="mt-4">
            <button
              onClick={() => router.push("/config/api")}
              disabled={!walletOk}
              className="ez-btn group flex items-center gap-2 bg-accent px-7 py-3 text-[15px] font-bold text-white transition-all hover:bg-accent-deep active:scale-[0.98] disabled:opacity-40"
            >
              Continue to AI key
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition-transform duration-500 group-hover:translate-x-1">
                <ArrowRight size={15} weight="regular" />
              </span>
            </button>
            {!walletOk && (
              <p className="mt-2 text-[13px] text-muted dark:text-fog">Funded wallet required to continue.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
