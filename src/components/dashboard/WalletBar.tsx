"use client";
import { useState } from "react";
import { useWallet, SEPOLIA_CHAIN_ID, MIN_BALANCE_ETH, GOOGLE_FAUCET_URL } from "@/lib/wallet";
import {
  Wallet,
  CheckCircle,
  WarningCircle,
  ArrowClockwise,
  Drop,
  Plus,
  DownloadSimple,
  LockKey,
  LockOpen,
  Copy,
  Check,
  Trash,
  Eye,
  EyeSlash,
} from "@phosphor-icons/react";

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

async function copy(text: string, done: () => void) {
  try {
    await navigator.clipboard.writeText(text);
    done();
  } catch {
    /* clipboard unavailable */
  }
}

export default function WalletBar() {
  const w = useWallet();
  const { address, balanceEth, chainId, connecting, error, hasEnough } = w;
  const onSepolia = chainId === SEPOLIA_CHAIN_ID;

  const [tab, setTab] = useState<"ez" | "mm">("ez");
  const [busy, setBusy] = useState(false);
  const [localErr, setLocalErr] = useState("");
  const [copied, setCopied] = useState("");

  // create / import forms
  const [cName, setCName] = useState("");
  const [cPw, setCPw] = useState("");
  const [iName, setIName] = useState("");
  const [iPw, setIPw] = useState("");
  const [iSecret, setISecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [mnemonic, setMnemonic] = useState<string | null>(null);

  // unlock / export
  const [unlockId, setUnlockId] = useState<string | null>(null);
  const [unlockPw, setUnlockPw] = useState("");
  const [exportId, setExportId] = useState<string | null>(null);
  const [exportPw, setExportPw] = useState("");
  const [exported, setExported] = useState<string | null>(null);

  const fail = (e: unknown) => setLocalErr(e instanceof Error ? e.message : "Something went wrong.");

  const doCreate = async () => {
    setLocalErr(""); setMnemonic(null); setBusy(true);
    try {
      const { mnemonic: m } = await w.createWallet(cName, cPw);
      setMnemonic(m);
      setCName(""); setCPw("");
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const doImport = async () => {
    setLocalErr(""); setBusy(true);
    try {
      await w.importWallet(iName, iPw, iSecret);
      setIName(""); setIPw(""); setISecret("");
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const doUnlock = async (id: string) => {
    setLocalErr(""); setBusy(true);
    try {
      await w.unlockWallet(id, unlockPw);
      setUnlockId(null); setUnlockPw("");
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const doExport = async (id: string) => {
    setLocalErr(""); setExported(null);
    try {
      const pk = await w.exportKey(id, exportPw);
      setExported(pk);
    } catch (e) { fail(e); }
  };

  const mg = (m: string) => { setCopied(m); setTimeout(() => setCopied(""), 1500); };

  return (
    <div className="rounded-[20px] border border-line bg-card p-5 shadow-[0_20px_60px_-40px_rgba(18,55,42,0.4)] dark:border-white/10 dark:bg-panel dark:shadow-[0_20px_60px_-40px_rgba(0,0,0,0.8)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cream dark:bg-white/5">
            <Wallet size={22} weight="duotone" className="text-accent-deep dark:text-emerald-400" />
          </span>
          <div>
            <p className="font-display text-[17px] font-bold tracking-tight">
              Wallet
              {address && (
                <span className="ml-2 rounded-full bg-accent-soft px-2.5 py-0.5 font-mono2 text-[11px] font-bold text-accent-deep dark:bg-emerald-400/10 dark:text-emerald-300">
                  {short(address)} · {w.source === "embedded" ? "EZ wallet" : "MetaMask"}
                </span>
              )}
            </p>
            <p className="text-[13px] text-muted dark:text-fog">Create one here in seconds, import your own, or link MetaMask.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {address && (
            <button onClick={w.refresh} className="ez-btn flex items-center gap-1.5 border border-line bg-white px-4 py-2 text-[13px] font-bold hover:border-ink/25 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/25">
              <ArrowClockwise size={14} weight="regular" /> Refresh
            </button>
          )}
          {address && (
            <button onClick={w.disconnect} className="ez-btn border border-line bg-white px-4 py-2 text-[13px] font-bold hover:border-ink/25 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/25">
              Disconnect
            </button>
          )}
        </div>
      </div>

      {/* tabs */}
      <div className="mt-4 flex gap-1.5 rounded-full bg-paper p-1.5 dark:bg-white/5">
        {(["ez", "mm"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`ez-btn flex-1 px-4 py-2 text-[13.5px] font-bold transition-all ${tab === t ? "bg-ink text-white dark:bg-mist dark:text-ink" : "text-muted hover:text-ink dark:text-fog dark:hover:text-mist"}`}
          >
            {t === "ez" ? "EZContract wallet (built-in)" : "I have MetaMask"}
          </button>
        ))}
      </div>

      {(error || localErr) && (
        <p className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-[13px] font-semibold text-red-700 dark:bg-red-400/10 dark:text-red-300">{error || localErr}</p>
      )}

      {tab === "ez" ? (
        <div className="mt-4">
          {mnemonic && (
            <div className="rounded-2xl border border-accent/40 bg-accent-soft/60 p-4 dark:border-emerald-300/25 dark:bg-emerald-400/10">
              <p className="text-[14px] font-bold text-accent-deep dark:text-emerald-300">Wallet created. Back this up now</p>
              <p className="mt-0.5 text-[13px] text-inksoft dark:text-fog">Write these 12 words on paper. Anyone with them owns the wallet. We never see them.</p>
              <p className="mt-2 rounded-xl bg-ink p-3.5 font-mono2 text-[13.5px] font-bold leading-relaxed text-white">{mnemonic}</p>
              <button onClick={() => copy(mnemonic, () => mg("mn"))} className="ez-btn mt-2 flex items-center gap-1.5 bg-ink px-4 py-2 text-[12.5px] font-bold text-white dark:bg-mist dark:text-ink">
                {copied === "mn" ? <Check size={14} weight="regular" /> : <Copy size={14} weight="regular" />} {copied === "mn" ? "Copied" : "Copy phrase"}
              </button>
            </div>
          )}

          {w.embeddedWallets.length === 0 ? (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl bg-paper p-4 dark:bg-white/[0.04]">
                <p className="flex items-center gap-1.5 text-[14px] font-bold"><Plus size={15} weight="regular" /> Create a wallet</p>
                <p className="mt-0.5 text-[12.5px] text-muted dark:text-fog">Free, 10 seconds, no install. Encrypted with your password on this device.</p>
                <input value={cName} onChange={(e) => setCName(e.target.value)} placeholder="Wallet name (e.g. My first wallet)" className="ez-input mt-2.5 w-full border border-line bg-white px-3 py-2 text-[13.5px] outline-none focus:border-accent dark:border-white/10 dark:bg-white/5" />
                <input value={cPw} onChange={(e) => setCPw(e.target.value)} type="password" placeholder="Password (min 6 characters)" className="ez-input mt-2 w-full border border-line bg-white px-3 py-2 text-[13.5px] outline-none focus:border-accent dark:border-white/10 dark:bg-white/5" />
                <button onClick={doCreate} disabled={busy} className="ez-btn mt-2.5 w-full bg-accent px-4 py-2.5 text-[14px] font-bold text-white hover:bg-accent-deep active:scale-[0.99] disabled:opacity-50">
                  {busy ? "Creating…" : "Create my wallet"}
                </button>
              </div>
              <div className="rounded-2xl bg-paper p-4 dark:bg-white/[0.04]">
                <p className="flex items-center gap-1.5 text-[14px] font-bold"><DownloadSimple size={15} weight="regular" /> Import a wallet</p>
                <p className="mt-0.5 text-[12.5px] text-muted dark:text-fog">Paste a private key or 12-word phrase. It gets encrypted instantly.</p>
                <input value={iName} onChange={(e) => setIName(e.target.value)} placeholder="Wallet name" className="ez-input mt-2.5 w-full border border-line bg-white px-3 py-2 text-[13.5px] outline-none focus:border-accent dark:border-white/10 dark:bg-white/5" />
                <input value={iPw} onChange={(e) => setIPw(e.target.value)} type="password" placeholder="New password for this device" className="ez-input mt-2 w-full border border-line bg-white px-3 py-2 text-[13.5px] outline-none focus:border-accent dark:border-white/10 dark:bg-white/5" />
                <div className="relative mt-2">
                  <input value={iSecret} onChange={(e) => setISecret(e.target.value)} type={showSecret ? "text" : "password"} placeholder="0x… private key or recovery phrase" className="ez-input w-full border border-line bg-white px-3 py-2 pr-10 font-mono2 text-[12.5px] outline-none focus:border-accent dark:border-white/10 dark:bg-white/5" />
                  <button onClick={() => setShowSecret(!showSecret)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted hover:bg-line dark:text-fog dark:hover:bg-white/10" aria-label="toggle secret visibility">
                    {showSecret ? <EyeSlash size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <button onClick={doImport} disabled={busy} className="ez-btn mt-2.5 w-full border border-ink/20 bg-white px-4 py-2.5 text-[14px] font-bold hover:border-ink disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:hover:border-white/30">
                  {busy ? "Importing…" : "Import wallet"}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {w.embeddedWallets.map((m) => {
                const active = address?.toLowerCase() === m.address.toLowerCase() && w.source === "embedded";
                return (
                  <div key={m.id} className={`rounded-2xl border p-3.5 ${active ? "border-accent/50 bg-accent-soft/40 dark:border-emerald-300/25 dark:bg-emerald-400/10" : "border-line bg-paper dark:border-white/10 dark:bg-white/[0.03]"}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-[14px] font-bold">{m.name} {active && <span className="ml-1 rounded-full bg-accent px-2 py-0.5 text-[10.5px] font-bold text-white">ACTIVE</span>}</p>
                        <p className="font-mono2 text-[12px] text-muted dark:text-fog">{m.address}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {!active && (
                          <button onClick={() => { setUnlockId(unlockId === m.id ? null : m.id); setUnlockPw(""); setLocalErr(""); }} className="ez-btn flex items-center gap-1 bg-ink px-3.5 py-1.5 text-[12.5px] font-bold text-white dark:bg-mist dark:text-ink">
                            <LockOpen size={13} weight="regular" /> Unlock
                          </button>
                        )}
                        {active && (
                          <button onClick={w.lockWallet} className="ez-btn flex items-center gap-1 border border-line bg-white px-3.5 py-1.5 text-[12.5px] font-bold dark:border-white/10 dark:bg-white/5">
                            <LockKey size={13} weight="regular" /> Lock
                          </button>
                        )}
                        <button onClick={() => { setExportId(exportId === m.id ? null : m.id); setExportPw(""); setExported(null); setLocalErr(""); }} className="ez-btn border border-line bg-white px-3.5 py-1.5 text-[12.5px] font-bold dark:border-white/10 dark:bg-white/5">Export</button>
                        <button onClick={() => { if (window.confirm(`Remove "${m.name}" from this device? (Funds stay on-chain; re-import anytime.)`)) w.removeWallet(m.id); }} className="ez-btn border border-red-200 bg-white px-3 py-1.5 text-[12.5px] font-bold text-red-600 hover:bg-red-50 dark:border-red-300/20 dark:bg-white/5 dark:text-red-300 dark:hover:bg-red-400/10" aria-label="remove wallet">
                          <Trash size={13} weight="regular" />
                        </button>
                      </div>
                    </div>
                    {unlockId === m.id && !active && (
                      <div className="mt-2.5 flex gap-2">
                        <input value={unlockPw} onChange={(e) => setUnlockPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doUnlock(m.id)} type="password" placeholder="Password" className="ez-input flex-1 border border-line bg-white px-3 py-2 text-[13px] outline-none focus:border-accent dark:border-white/10 dark:bg-white/5" />
                        <button onClick={() => doUnlock(m.id)} disabled={busy} className="ez-btn bg-accent px-5 py-2 text-[13px] font-bold text-white disabled:opacity-50">Unlock</button>
                      </div>
                    )}
                    {exportId === m.id && (
                      <div className="mt-2.5 rounded-xl bg-white/70 p-3 dark:bg-white/5">
                        {!exported ? (
                          <div className="flex gap-2">
                            <input value={exportPw} onChange={(e) => setExportPw(e.target.value)} type="password" placeholder="Confirm password to reveal key" className="ez-input flex-1 border border-line bg-white px-3 py-2 font-mono2 text-[12.5px] outline-none focus:border-accent dark:border-white/10 dark:bg-white/5" />
                            <button onClick={() => doExport(m.id)} className="ez-btn bg-ink px-4 py-2 text-[12.5px] font-bold text-white dark:bg-mist dark:text-ink">Reveal</button>
                          </div>
                        ) : (
                          <div>
                            <p className="text-[12px] font-bold text-red-600 dark:text-red-300">Never share this key. Anyone with it owns the wallet.</p>
                            <p className="mt-1 break-all rounded-lg bg-ink p-2.5 font-mono2 text-[12px] text-white">{exported}</p>
                            <div className="mt-1.5 flex gap-2">
                              <button onClick={() => copy(exported, () => mg("ex"))} className="ez-btn flex items-center gap-1 border border-line bg-white px-3 py-1.5 text-[12px] font-bold dark:border-white/10 dark:bg-white/5">
                                {copied === "ex" ? <Check size={13} weight="regular" /> : <Copy size={13} weight="regular" />} {copied === "ex" ? "Copied" : "Copy"}
                              </button>
                              <button onClick={() => { setExported(null); setExportId(null); }} className="ez-btn px-3 py-1.5 text-[12px] font-bold text-muted dark:text-fog">Hide</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              <details className="rounded-2xl bg-paper px-4 py-3 text-[13px] dark:bg-white/[0.04]">
                <summary className="cursor-pointer font-bold">Add another wallet</summary>
                <div className="mt-2.5 grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-[13px] font-bold">Create new</p>
                    <input value={cName} onChange={(e) => setCName(e.target.value)} placeholder="Wallet name" className="ez-input mt-1.5 w-full border border-line bg-white px-3 py-2 text-[13px] outline-none focus:border-accent dark:border-white/10 dark:bg-white/5" />
                    <input value={cPw} onChange={(e) => setCPw(e.target.value)} type="password" placeholder="Password (min 6)" className="ez-input mt-1.5 w-full border border-line bg-white px-3 py-2 text-[13px] outline-none focus:border-accent dark:border-white/10 dark:bg-white/5" />
                    <button onClick={doCreate} disabled={busy} className="ez-btn mt-1.5 w-full bg-accent px-4 py-2 text-[13px] font-bold text-white disabled:opacity-50">Create</button>
                  </div>
                  <div>
                    <p className="text-[13px] font-bold">Import existing</p>
                    <input value={iName} onChange={(e) => setIName(e.target.value)} placeholder="Wallet name" className="ez-input mt-1.5 w-full border border-line bg-white px-3 py-2 text-[13px] outline-none focus:border-accent dark:border-white/10 dark:bg-white/5" />
                    <input value={iPw} onChange={(e) => setIPw(e.target.value)} type="password" placeholder="Password for this device" className="ez-input mt-1.5 w-full border border-line bg-white px-3 py-2 text-[13px] outline-none focus:border-accent dark:border-white/10 dark:bg-white/5" />
                    <input value={iSecret} onChange={(e) => setISecret(e.target.value)} type="password" placeholder="Private key or phrase" className="ez-input mt-1.5 w-full border border-line bg-white px-3 py-2 font-mono2 text-[12px] outline-none focus:border-accent dark:border-white/10 dark:bg-white/5" />
                    <button onClick={doImport} disabled={busy} className="ez-btn mt-1.5 w-full border border-ink/20 bg-white px-4 py-2 text-[13px] font-bold disabled:opacity-50 dark:border-white/15 dark:bg-white/5">Import</button>
                  </div>
                </div>
              </details>
              <p className="px-1 text-[12px] text-muted dark:text-fog">Keys are AES-256 encrypted with your password and never leave this device. Locking or refreshing clears them from memory.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl bg-paper p-4 dark:bg-white/[0.04]">
          <p className="text-[14px] font-bold">Link MetaMask (or any browser wallet)</p>
          <p className="mt-0.5 text-[12.5px] text-muted dark:text-fog">We switch you to Sepolia automatically. No real money involved.</p>
          {!address || w.source !== "metamask" ? (
            <button onClick={() => w.connect()} disabled={connecting} className="ez-btn mt-2.5 bg-ink px-6 py-2.5 text-[14px] font-bold text-white hover:bg-forest active:scale-[0.98] disabled:opacity-60 dark:bg-mist dark:text-ink dark:hover:bg-emerald-200">
              {connecting ? "Connecting…" : "Connect MetaMask"}
            </button>
          ) : (
            <p className="mt-2 text-[13.5px] font-bold text-accent-deep dark:text-emerald-400"><CheckCircle size={16} weight="fill" className="mr-1 inline" /> {short(address)} connected</p>
          )}
        </div>
      )}

      {/* balance / readiness */}
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl bg-paper px-4 py-3 dark:bg-white/[0.04]">
          <p className="font-mono2 text-[11px] uppercase tracking-[0.16em] text-muted dark:text-fog">Network</p>
          <p className="mt-1 text-[14px] font-bold">
            {!address ? "Not connected" : onSepolia ? "Sepolia testnet ✓" : `Wrong network (${chainId}). Switch to Sepolia`}
          </p>
        </div>
        <div className="rounded-2xl bg-paper px-4 py-3 dark:bg-white/[0.04]">
          <p className="font-mono2 text-[11px] uppercase tracking-[0.16em] text-muted dark:text-fog">Balance</p>
          <p className="mt-1 text-[14px] font-bold">
            {!address ? "Not connected" : balanceEth === null ? "loading…" : `${Number(balanceEth).toFixed(5)} SepoliaETH`}
          </p>
        </div>
        <div className={`rounded-2xl px-4 py-3 ${hasEnough === null ? "bg-paper dark:bg-white/[0.04]" : hasEnough ? "bg-accent-soft dark:bg-emerald-400/10" : "bg-amber-50 dark:bg-amber-400/10"}`}>
          <p className="font-mono2 text-[11px] uppercase tracking-[0.16em] text-muted dark:text-fog">Ready to deploy?</p>
          <p className="mt-1 flex items-center gap-1.5 text-[14px] font-bold">
            {hasEnough === null ? "Connect a wallet" : hasEnough ? (
              <><CheckCircle size={17} weight="fill" className="shrink-0 text-accent-deep dark:text-emerald-400" /> Yes, enough (at least {MIN_BALANCE_ETH} ETH)</>
            ) : (
              <><WarningCircle size={17} weight="fill" className="shrink-0 text-amber-600 dark:text-amber-300" /> Too low, get free test ETH</>
            )}
          </p>
        </div>
      </div>

      {address && hasEnough === false && (
        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-300/20 dark:bg-amber-400/10">
          <p className="flex items-center gap-1.5 text-[14px] font-bold text-amber-900 dark:text-amber-200"><Drop size={16} weight="duotone" /> Out of test ETH? Top up free:</p>
          <p className="mt-1 text-[13px] text-amber-800 dark:text-amber-200/80">Copy your address, paste it in the Google Cloud faucet, wait about a minute, then press Refresh.</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <a href={GOOGLE_FAUCET_URL} target="_blank" rel="noreferrer" className="ez-btn bg-ink px-5 py-2.5 text-[13.5px] font-bold text-white hover:bg-forest dark:bg-mist dark:text-ink dark:hover:bg-emerald-200">
              Open Google Cloud faucet ↗
            </a>
            <button onClick={() => address && copy(address, () => mg("ad"))} className="ez-btn flex items-center gap-1.5 border border-amber-300 bg-white px-4 py-2.5 font-mono2 text-[12.5px] font-bold dark:border-amber-300/25 dark:bg-white/5">
              {copied === "ad" ? <Check size={14} weight="regular" /> : <Copy size={14} weight="regular" />} {copied === "ad" ? "Copied!" : short(address)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
