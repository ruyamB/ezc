import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import Logo from "@/components/Logo";

export default function Footer() {
  return (
    <footer className="w-full bg-ink pb-10 pt-4 text-white">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid gap-10 border-t border-white/10 pt-12 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-accent-deep"><Logo size={20} /></span>
              <span>
                <span className="block font-display text-lg font-bold tracking-tight">EZContract</span>
                <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">by ETHShala</span>
              </span>
            </div>
            <p className="mt-4 max-w-[36ch] text-[14px] leading-relaxed text-white/60">
              The friendliest way to ship your first Ethereum contract. Built for people who
              don&apos;t know web3 yet.
            </p>
            <Link
              href="/config/wallet"
              className="ez-btn mt-5 inline-flex items-center gap-2 bg-white px-5 py-2.5 text-[14px] font-bold text-ink transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Launch dashboard <ArrowUpRight size={15} weight="bold" />
            </Link>
          </div>
          <div>
            <p className="font-mono2 text-[11px] uppercase tracking-[0.2em] text-white/40">Product</p>
            <ul className="mt-4 space-y-2.5 text-[14px] font-semibold text-white/80">
              <li><a href="#about" className="hover:text-white">Why it exists</a></li>
              <li><a href="#how" className="hover:text-white">How it works</a></li>
              <li><a href="#templates" className="hover:text-white">Templates</a></li>
              <li><Link href="/dashboard" className="hover:text-white">Dashboard</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-mono2 text-[11px] uppercase tracking-[0.2em] text-white/40">Testnet help</p>
            <ul className="mt-4 space-y-2.5 text-[14px] font-semibold text-white/80">
              <li><a className="hover:text-white" href="https://sepoliafaucet.com" target="_blank" rel="noreferrer">Sepolia faucet</a></li>
              <li><a className="hover:text-white" href="https://sepolia.etherscan.io" target="_blank" rel="noreferrer">Sepolia Etherscan</a></li>
              <li><a className="hover:text-white" href="https://metamask.io" target="_blank" rel="noreferrer">Get MetaMask</a></li>
            </ul>
          </div>
          <div>
            <p className="font-mono2 text-[11px] uppercase tracking-[0.2em] text-white/40">ETHShala</p>
            <ul className="mt-4 space-y-2.5 text-[14px] font-semibold text-white/80">
              <li><a className="hover:text-white hover:underline" href="https://ethshala.com" target="_blank" rel="noreferrer">ethshala.com</a></li>
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
