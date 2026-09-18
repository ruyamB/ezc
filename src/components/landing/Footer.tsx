import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import Reveal from "../Reveal";

export default function Footer() {
  return (
    <footer className="w-full bg-ink pb-10 pt-4 text-white">
      <div className="mx-auto max-w-7xl px-4">
        <Reveal>
          <div className="bezel-dark">
            <div className="bezel-dark-inner flex flex-col items-start justify-between gap-6 p-8 md:flex-row md:items-center md:p-12">
              <div>
                <h2 className="max-w-[20ch] font-display text-3xl font-bold tracking-tighter md:text-5xl">
                  Your first contract is one sentence away.
                </h2>
                <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-white/65">
                  Set up a wallet, describe the deal, approve the deploy. Beginners welcome, Solidity optional.
                </p>
              </div>
              <Link
                href="/config/wallet"
                className="group ez-btn flex shrink-0 items-center gap-2 bg-accent px-7 py-3.5 text-[15px] font-bold text-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-emerald-500 active:scale-[0.98]"
              >
                Start building free
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition-transform duration-500 group-hover:translate-x-1">
                  <ArrowUpRight size={15} weight="bold" />
                </span>
              </Link>
            </div>
          </div>
        </Reveal>

        <div className="grid gap-10 border-t border-white/10 pt-12 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white font-display text-sm font-bold text-ink">EZ</span>
              <span>
                <span className="block font-display text-lg font-bold tracking-tight">EZContract</span>
                <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">by ETHShala</span>
              </span>
            </div>
            <p className="mt-4 max-w-[36ch] text-[14px] leading-relaxed text-white/60">
              The friendliest way to ship your first Ethereum contract. Built for people who
              don&apos;t know web3 yet.
            </p>
          </div>
          <div>
            <p className="font-mono2 text-[11px] uppercase tracking-[0.2em] text-white/40">Studio</p>
            <ul className="mt-4 space-y-2.5 text-[14px] font-semibold text-white/80">
              <li><Link href="/config/wallet" className="hover:text-white">Get a wallet</Link></li>
              <li><Link href="/config/api" className="hover:text-white">AI key setup</Link></li>
              <li><Link href="/dashboard" className="hover:text-white">Workspace</Link></li>
              <li><Link href="/export" className="hover:text-white">Export code</Link></li>
              <li><Link href="/deploy" className="hover:text-white">Deploy</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-mono2 text-[11px] uppercase tracking-[0.2em] text-white/40">Testnet help</p>
            <ul className="mt-4 space-y-2.5 text-[14px] font-semibold text-white/80">
              <li><a className="hover:text-white" href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia" target="_blank" rel="noreferrer">Google Cloud faucet</a></li>
              <li><a className="hover:text-white" href="https://sepolia.etherscan.io" target="_blank" rel="noreferrer">Sepolia Etherscan</a></li>
              <li><a className="hover:text-white" href="https://console.groq.com" target="_blank" rel="noreferrer">Free Groq AI keys</a></li>
            </ul>
          </div>
          <div>
            <p className="font-mono2 text-[11px] uppercase tracking-[0.2em] text-white/40">ETHShala</p>
            <ul className="mt-4 space-y-2.5 text-[14px] font-semibold text-white/80">
              <li><a className="hover:text-white" href="https://ethshala.xyz" target="_blank" rel="noreferrer">ethshala.xyz</a></li>
              <li><span className="text-white/50">Cohorts, workshops and support</span></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6 font-mono2 text-[12px] text-white/40">
          <span>© 2026 EZContract by ETHShala, Sepolia testnet only, not financial advice</span>
          <span>drag, drop, deploy</span>
        </div>
      </div>
    </footer>
  );
}
