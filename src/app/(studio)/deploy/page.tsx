"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Copy, LockOpen, RocketLaunch } from "@phosphor-icons/react";
import { ContractFactory, formatEther } from "ethers";
import { ThemeToggle } from "@/components/ThemeProvider";
import { useProject } from "@/lib/project";
import { useWallet, GOOGLE_FAUCET_URL } from "@/lib/wallet";

type DeployState = "idle" | "compiling" | "deploying" | "done" | "error";

export default function DeployPage() {
  const { gen, compiled, setCompiled } = useProject();
  const wallet = useWallet();
  const [deployState, setDeployState] = useState<DeployState>("idle");
  const [deployMsg, setDeployMsg] = useState("");
  const [deployed, setDeployed] = useState<{ address: string; tx: string } | null>(null);
  const [copied, setCopied] = useState(false);
  // inline unlock: locked EZ wallet + Deploy press resumes automatically
  const [unlockId, setUnlockId] = useState("");
  const [unlockPw, setUnlockPw] = useState("");
  const [unlockBusy, setUnlockBusy] = useState(false);
  const [pendingAutoDeploy, setPendingAutoDeploy] = useState(false);
  const deployRef = useRef<() => Promise<void>>(async () => {});
  // on-page approval modal for EZ wallets (approve = auto-sign, deny = cancel)
  const [review, setReview] = useState<null | {
    fundingEth: string;
    gasLimit: string;
    feeEth: string;
    totalEth: string;
    estimated: boolean;
  }>(null);
  const pendingTx = useRef<null | {
    factory: ContractFactory;
    funding: { value: bigint } | undefined;
  }>(null);

  // Step 1: compile, then either open the on-page approval modal (EZ wallet)
  // or send straight through (MetaMask approval happens in its own popup).
  const deploy = async () => {
    setDeployMsg("");
    setDeployed(null);
    setReview(null);
    pendingTx.current = null;
    if (!gen) return;
    if (!wallet.address) {
      setDeployMsg("Set up a wallet in Setup first, then come back.");
      setDeployState("error");
      return;
    }
    try {
      setDeployState("compiling");
      setDeployMsg("Compiling your blocks into EVM bytecode…");
      const res = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: gen.solidity, contractName: gen.contractName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Compile failed.");
      setCompiled({ abi: data.abi, bytecode: data.bytecode });

      const signer = await wallet.getSigner();
      const factory = new ContractFactory(data.abi, data.bytecode, signer);
      const funding = gen.deployValueWei && gen.deployValueWei !== "0" ? { value: BigInt(gen.deployValueWei) } : undefined;

      if (wallet.source !== "embedded") {
        await sendDeploy(factory, funding);
        return;
      }

      // EZ wallet: estimate the fee, then ask on this page. Nothing is
      // signed until Approve is pressed.
      setDeployMsg("Estimating network fee…");
      let gasLimit = "unknown";
      let feeEth = "unknown";
      let estimated = false;
      try {
        const tx = await factory.getDeployTransaction();
        const provider = signer.provider;
        if (!provider) throw new Error("No network connection.");
        const [gas, fee] = await Promise.all([signer.estimateGas(tx), provider.getFeeData()]);
        const price = fee.maxFeePerGas ?? fee.gasPrice ?? BigInt(0);
        gasLimit = gas.toString();
        feeEth = formatEther(gas * price);
        estimated = true;
      } catch {
        /* estimate unavailable: modal still opens, user decides */
      }
      const fundingEth = funding ? formatEther(funding.value) : "0";
      const totalEth = estimated && feeEth !== "unknown" ? (Number(fundingEth) + Number(feeEth)).toFixed(5) : fundingEth;
      pendingTx.current = { factory, funding };
      setReview({ fundingEth, gasLimit, feeEth, totalEth, estimated });
      setDeployState("idle");
      setDeployMsg("");
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : "Deploy failed.";
      setDeployMsg(m.includes("user rejected") ? "You rejected the transaction in the wallet. No worries, try again when ready." : m);
      setDeployState("error");
    }
  };

  // Step 2 (EZ wallet only): Approve was pressed in the modal. Signs with
  // the in-memory key and broadcasts. No popups anywhere in this path.
  const confirmDeploy = async () => {
    const p = pendingTx.current;
    if (!p) return;
    setReview(null);
    try {
      setDeployState("deploying");
      setDeployMsg("Approved. Auto-signing with your EZ wallet and sending…");
      await sendDeploy(p.factory, p.funding);
    } finally {
      pendingTx.current = null;
    }
  };

  const denyDeploy = () => {
    pendingTx.current = null;
    setReview(null);
    setDeployState("idle");
    setDeployMsg("Cancelled before signing. Nothing was sent.");
  };

  const sendDeploy = async (factory: ContractFactory, funding: { value: bigint } | undefined) => {
    if (!gen) return;
    if (wallet.source !== "embedded") {
      setDeployState("deploying");
      setDeployMsg("Waiting for wallet approval. Confirm in MetaMask…");
    }
    // embedded path: caller already set deploying state + approved message
    try {
      const c = funding ? await factory.deploy(funding) : await factory.deploy();
      const depTx = c.deploymentTransaction();
      setDeployMsg("Deploying. Waiting for Sepolia to confirm (10 to 20s).");
      await c.waitForDeployment();
      const addr = await c.getAddress();
      setDeployed({ address: addr, tx: depTx?.hash ?? "" });
      setDeployState("done");
      setDeployMsg("Live! Your contract is on Sepolia.");
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : "Deploy failed.";
      setDeployMsg(m.includes("user rejected") ? "You rejected the transaction in the wallet. No worries, try again when ready." : m);
      setDeployState("error");
    }
  };

  const copyAbi = async (abi: unknown) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(abi, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  // always call the latest deploy (fresh signer) after an inline unlock
  deployRef.current = deploy;
  useEffect(() => {
    if (pendingAutoDeploy && wallet.address) {
      setPendingAutoDeploy(false);
      deployRef.current();
    }
  }, [pendingAutoDeploy, wallet.address]);

  // Escape closes the review modal (same as deny)
  useEffect(() => {
    if (!review) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") denyDeploy();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [review]);

  const unlockAndDeploy = async () => {
    const id = unlockId || wallet.embeddedWallets[0]?.id || "";
    if (!id || unlockBusy) return;
    setUnlockBusy(true);
    setDeployMsg("");
    setDeployed(null);
    try {
      await wallet.unlockWallet(id, unlockPw);
      setUnlockPw("");
      setPendingAutoDeploy(true); // effect fires deploy with the fresh session
    } catch (e: unknown) {
      setDeployMsg(e instanceof Error ? e.message : "Unlock failed.");
      setDeployState("error");
    } finally {
      setUnlockBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16 pt-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard" className="flex items-center gap-2 text-[13.5px] font-bold text-inksoft hover:text-ink dark:text-fog dark:hover:text-mist">
          <ArrowLeft size={15} weight="regular" /> Back to workspace
        </Link>
        <div className="flex items-center gap-2">
          <span className="font-mono2 text-[11px] font-bold uppercase tracking-[0.16em] text-muted dark:text-fog">deploy</span>
          <ThemeToggle />
        </div>
      </div>

      <h1 className="mt-4 font-display text-4xl font-bold tracking-tighter md:text-5xl">Ship it to Sepolia.</h1>
      <p className="mt-2 max-w-[60ch] text-[15px] leading-relaxed text-inksoft dark:text-fog">
        {gen ? `Deploys ${gen.contractName} with your connected wallet. Free testnet, real Etherscan proof.` : "Nothing to deploy yet."}
      </p>

      {!gen ? (
        <div className="mt-6 rounded-[20px] border border-line bg-card p-10 text-center dark:border-white/10 dark:bg-panel">
          <p className="font-display text-2xl font-bold tracking-tight">Press Run first</p>
          <p className="mx-auto mt-2 max-w-[44ch] text-[14px] text-inksoft dark:text-fog">
            Generate code from your canvas, then come back to deploy it.
          </p>
          <Link href="/dashboard" className="ez-btn mt-5 inline-flex bg-ink px-6 py-2.5 text-[14px] font-bold text-white dark:bg-mist dark:text-ink">
            Open workspace
          </Link>
        </div>
      ) : (
        <div className="mt-6 rounded-[20px] border border-line bg-card p-5 dark:border-white/10 dark:bg-panel">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-paper px-4 py-3 dark:bg-white/[0.04]">
            <p className="font-mono2 text-[12.5px] font-bold">{gen.contractName}</p>
            <p className="font-mono2 text-[12px] text-muted dark:text-fog">
              {wallet.address
                ? `from ${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)} (${wallet.balanceEth === null ? "…" : `${Number(wallet.balanceEth).toFixed(4)} ETH`})`
                : "no wallet connected"}
            </p>
          </div>

          {!wallet.address && wallet.embeddedWallets.length === 0 && (
            <p className="mt-3 rounded-xl bg-amber-50 px-4 py-2.5 text-[13px] font-semibold text-amber-900 dark:bg-amber-400/10 dark:text-amber-200">
              No wallet connected. <Link href="/config/wallet" className="underline">Finish setup</Link> first.
            </p>
          )}

          {!wallet.address && wallet.embeddedWallets.length > 0 && (
            <div className="mt-3 rounded-2xl border border-line bg-paper p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="flex items-center gap-1.5 text-[14px] font-bold">
                <LockOpen size={15} weight="regular" /> Your EZ wallet is locked
              </p>
              <p className="mt-0.5 text-[13px] text-inksoft dark:text-fog">
                Unlock here, review the deployment on this page, then approve. No popups anywhere.
              </p>
              {wallet.embeddedWallets.length > 1 && (
                <select
                  value={unlockId || wallet.embeddedWallets[0]?.id || ""}
                  onChange={(e) => setUnlockId(e.target.value)}
                  className="ez-input mt-2.5 w-full border border-line bg-white px-3 py-2 text-[13px] font-bold outline-none focus:border-accent dark:border-white/10 dark:bg-white/5"
                >
                  {wallet.embeddedWallets.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.address.slice(0, 6)}…{m.address.slice(-4)})</option>
                  ))}
                </select>
              )}
              <div className="mt-2 flex gap-2">
                <input
                  value={unlockPw}
                  onChange={(e) => setUnlockPw(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") unlockAndDeploy(); }}
                  type="password"
                  placeholder="Wallet password"
                  className="ez-input flex-1 border border-line bg-white px-3 py-2 text-[13px] outline-none focus:border-accent dark:border-white/10 dark:bg-white/5"
                />
                <button
                  onClick={unlockAndDeploy}
                  disabled={unlockBusy || deployState === "compiling" || deployState === "deploying"}
                  className="ez-btn bg-accent px-5 py-2 text-[13px] font-bold text-white hover:bg-accent-deep disabled:opacity-50"
                >
                  {unlockBusy ? "Unlocking…" : "Unlock and review"}
                </button>
              </div>
            </div>
          )}
          {wallet.address && wallet.hasEnough === false && (
            <p className="mt-3 rounded-xl bg-amber-50 px-4 py-2.5 text-[13px] font-semibold text-amber-900 dark:bg-amber-400/10 dark:text-amber-200">
              Balance too low to deploy. <a href={GOOGLE_FAUCET_URL} target="_blank" rel="noreferrer" className="underline">Get free test ETH</a>, then refresh and retry.
            </p>
          )}

          {deployMsg && (
            <p className={`mt-3 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold ${deployState === "error" ? "bg-red-50 text-red-700 dark:bg-red-400/10 dark:text-red-300" : deployState === "done" ? "bg-accent-soft text-accent-deep dark:bg-emerald-400/10 dark:text-emerald-300" : "bg-paper text-inksoft dark:bg-white/[0.04] dark:text-fog"}`}>
              {deployMsg}
            </p>
          )}

          {deployed ? (
            <div className="mt-3 space-y-2">
              <div className="rounded-2xl bg-paper p-3.5 dark:bg-white/[0.04]">
                <p className="font-mono2 text-[10.5px] uppercase tracking-[0.16em] text-muted dark:text-fog">contract address</p>
                <p className="mt-0.5 break-all font-mono2 text-[13px] font-bold">{deployed.address}</p>
                <a className="mt-1.5 inline-block text-[13px] font-bold text-accent-deep underline dark:text-emerald-400" href={`https://sepolia.etherscan.io/address/${deployed.address}`} target="_blank" rel="noreferrer">
                  View on Etherscan ↗
                </a>
              </div>
              {deployed.tx && (
                <div className="rounded-2xl bg-paper p-3.5 dark:bg-white/[0.04]">
                  <p className="font-mono2 text-[10.5px] uppercase tracking-[0.16em] text-muted dark:text-fog">deploy transaction</p>
                  <p className="mt-0.5 break-all font-mono2 text-[12px]">{deployed.tx}</p>
                  <a className="mt-1.5 inline-block text-[13px] font-bold text-accent-deep underline dark:text-emerald-400" href={`https://sepolia.etherscan.io/tx/${deployed.tx}`} target="_blank" rel="noreferrer">
                    View transaction ↗
                  </a>
                </div>
              )}
              <button onClick={() => copyAbi(compiled?.abi ?? gen.abi)} className="ez-btn flex w-full items-center justify-center gap-1.5 border border-line bg-white px-4 py-2.5 text-[13px] font-bold hover:border-ink/30 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/30">
                {copied ? <Check size={14} weight="regular" /> : <Copy size={14} weight="regular" />} {copied ? "ABI copied!" : "Copy ABI for your app"}
              </button>
              <Link href="/export" className="ez-btn flex w-full items-center justify-center border border-line bg-white px-4 py-2.5 text-[13px] font-bold hover:border-ink/30 dark:border-white/10 dark:bg-white/5">
                Download the .zip instead
              </Link>
            </div>
          ) : (
            <button
              onClick={deploy}
              disabled={deployState === "compiling" || deployState === "deploying"}
              className="ez-btn mt-3 flex w-full items-center justify-center gap-2 bg-ink px-4 py-3 text-[14px] font-bold text-white hover:bg-forest active:scale-[0.99] disabled:opacity-40 dark:bg-mist dark:text-ink dark:hover:bg-emerald-200"
            >
              <RocketLaunch size={16} weight="duotone" />
              {deployState === "compiling" ? "Compiling…" : deployState === "deploying" ? "Sending…" : wallet.source === "embedded" ? "Review and sign" : "Deploy to Sepolia"}
            </button>
          )}

          <div className="mt-4 rounded-2xl bg-paper p-3.5 font-mono2 text-[11.5px] leading-relaxed text-muted dark:bg-white/[0.04] dark:text-fog">
            sepolia rpc: publicnode
            <br />explorer: sepolia.etherscan.io
            <br />compiler: solc 0.8.x + optimizer
            <br />EZ wallets sign on this page after your approval, no popups
          </div>
        </div>
      )}

      {/* on-page approval modal (EZ wallets): approve signs, deny cancels */}
      {review && gen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Approve deployment">
          <button aria-label="Deny and close" onClick={denyDeploy} className="absolute inset-0 cursor-default bg-ink/60 backdrop-blur-sm dark:bg-black/70" />
          <div className="relative w-full max-w-md rounded-[20px] border border-line bg-card p-6 shadow-[0_32px_80px_-24px_rgba(0,0,0,0.5)] dark:border-white/10 dark:bg-panel">
            <p className="font-mono2 text-[10.5px] uppercase tracking-[0.18em] text-muted dark:text-fog">review deployment</p>
            <h2 className="mt-1 font-display text-2xl font-bold tracking-tight">Sign this deployment?</h2>
            <p className="mt-1 text-[13px] text-inksoft dark:text-fog">
              Your EZ wallet signs right here. Nothing leaves this page until you approve.
            </p>
            <dl className="mt-4 space-y-2 rounded-2xl bg-paper p-4 font-mono2 text-[12.5px] dark:bg-white/[0.04]">
              <div className="flex justify-between gap-3"><dt className="text-muted dark:text-fog">contract</dt><dd className="font-bold">{gen.contractName}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted dark:text-fog">from</dt><dd className="font-bold">{wallet.address ? `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}` : "—"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted dark:text-fog">network</dt><dd className="font-bold">Sepolia 11155111</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted dark:text-fog">funding</dt><dd className="font-bold">{review.fundingEth} ETH</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted dark:text-fog">gas limit</dt><dd className="font-bold">{review.estimated ? review.gasLimit : "estimate unavailable"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted dark:text-fog">network fee</dt><dd className="font-bold">{review.estimated ? `~${review.feeEth} ETH` : "estimate unavailable"}</dd></div>
              <div className="flex justify-between gap-3 border-t border-line pt-2 dark:border-white/10"><dt className="text-muted dark:text-fog">max total</dt><dd className="font-bold text-accent-deep dark:text-emerald-400">~{review.totalEth} ETH</dd></div>
            </dl>
            {!review.estimated && (
              <p className="mt-2 text-[12px] text-muted dark:text-fog">Fee estimate failed, so approve carefully or deny and retry.</p>
            )}
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button
                onClick={denyDeploy}
                className="ez-btn border border-line bg-white px-4 py-3 text-[14px] font-bold hover:border-ink/30 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/30"
              >
                Deny
              </button>
              <button
                onClick={confirmDeploy}
                className="ez-btn bg-accent px-4 py-3 text-[14px] font-bold text-white hover:bg-accent-deep active:scale-[0.99]"
              >
                Approve and sign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
