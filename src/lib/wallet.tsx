"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { BrowserProvider, formatEther, JsonRpcProvider, Network, Wallet, type Signer } from "ethers";
import {
  listEmbeddedWallets,
  createEmbeddedWallet,
  importEmbeddedWallet,
  unlockEmbeddedWallet,
  lockEmbeddedWallet,
  removeEmbeddedWallet,
  exportEmbeddedKey,
  getSessionKey,
  getActiveWalletId,
  type StoredWalletMeta,
} from "./embedded";

export const SEPOLIA_CHAIN_ID = 11155111;
export const SEPOLIA_RPC = process.env.NEXT_PUBLIC_SEPOLIA_RPC || "https://ethereum-sepolia-rpc.publicnode.com";
export const MIN_BALANCE_ETH = 0.005;
export const GOOGLE_FAUCET_URL = "https://cloud.google.com/application/web3/faucet/ethereum/sepolia";

export type WalletSource = "embedded" | "metamask" | null;

interface WalletState {
  // unified active identity
  address: string | null;
  source: WalletSource;
  balanceEth: string | null;
  chainId: number | null;
  connecting: boolean;
  error: string | null;
  hasEnough: boolean | null;
  provider: BrowserProvider | null; // metamask provider (null for embedded)
  // metamask
  connect: () => Promise<void>;
  disconnect: () => void;
  refresh: () => Promise<void>;
  // embedded
  embeddedWallets: StoredWalletMeta[];
  embeddedUnlocked: boolean;
  createWallet: (name: string, password: string) => Promise<{ meta: StoredWalletMeta; mnemonic: string }>;
  importWallet: (name: string, password: string, secret: string) => Promise<StoredWalletMeta>;
  unlockWallet: (id: string, password: string) => Promise<void>;
  lockWallet: () => void;
  removeWallet: (id: string) => void;
  exportKey: (id: string, password: string) => Promise<string>;
  refreshWallets: () => void;
  // signing (works for either source)
  getSigner: () => Promise<Signer>;
}

const Ctx = createContext<WalletState | null>(null);

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown }) => Promise<unknown>;
      on?: (ev: string, cb: (...a: unknown[]) => void) => void;
      removeListener?: (ev: string, cb: (...a: unknown[]) => void) => void;
    };
  }
}

function rpc(): JsonRpcProvider {
  return new JsonRpcProvider(SEPOLIA_RPC);
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [source, setSource] = useState<WalletSource>(null);
  const [mmAddress, setMmAddress] = useState<string | null>(null);
  const [mmChainId, setMmChainId] = useState<number | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [embeddedWallets, setEmbeddedWallets] = useState<StoredWalletMeta[]>([]);
  const [activeEmbeddedId, setActiveEmbeddedId] = useState<string | null>(null);
  const [embeddedAddr, setEmbeddedAddr] = useState<string | null>(null);
  const [balanceEth, setBalanceEth] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshWallets = useCallback(() => {
    setEmbeddedWallets(listEmbeddedWallets());
  }, []);

  useEffect(() => {
    refreshWallets();
    // If an embedded wallet was active, require explicit unlock after reload
    // (session keys never survive a refresh — by design).
    lockEmbeddedWallet();
    setActiveEmbeddedId(null);
    setEmbeddedAddr(null);
  }, [refreshWallets]);

  const address = source === "metamask" ? mmAddress : source === "embedded" ? embeddedAddr : null;
  const chainId = source === "metamask" ? mmChainId : source === "embedded" ? SEPOLIA_CHAIN_ID : null;
  const embeddedUnlocked = source === "embedded" && embeddedAddr !== null;

  const readBalance = useCallback(async (addr: string) => {
    try {
      const bal = await rpc().getBalance(addr);
      setBalanceEth(formatEther(bal));
    } catch {
      setBalanceEth(null);
    }
  }, []);

  useEffect(() => {
    if (address) readBalance(address);
    else setBalanceEth(null);
  }, [address, readBalance]);

  // ---- MetaMask ----
  const connect = useCallback(async () => {
    setError(null);
    if (!window.ethereum) {
      setError("No browser wallet found. You can create a free EZContract wallet here instead. No install needed.");
      return;
    }
    setConnecting(true);
    try {
      const prov = new BrowserProvider(window.ethereum);
      setProvider(prov);
      const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
      const addr = accounts?.[0] ?? null;
      if (!addr) throw new Error("Wallet returned no accounts.");
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xaa36a7" }],
        });
      } catch (switchErr: unknown) {
        const e = switchErr as { code?: number };
        if (e?.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0xaa36a7",
                chainName: "Sepolia test network",
                nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 },
                rpcUrls: [SEPOLIA_RPC],
                blockExplorerUrls: ["https://sepolia.etherscan.io"],
              },
            ],
          });
        }
      }
      const net: Network = await prov.getNetwork();
      setMmChainId(Number(net.chainId));
      setMmAddress(addr);
      setSource("metamask");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Wallet connection failed.";
      setError(msg);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setMmAddress(null);
    setMmChainId(null);
    setProvider(null);
    lockEmbeddedWallet();
    setActiveEmbeddedId(null);
    setEmbeddedAddr(null);
    setSource(null);
    setError(null);
    setBalanceEth(null);
  }, []);

  const refresh = useCallback(async () => {
    refreshWallets();
    if (address) await readBalance(address);
    if (provider && source === "metamask") {
      try {
        const net = await provider.getNetwork();
        setMmChainId(Number(net.chainId));
      } catch {
        /* ignore */
      }
    }
  }, [address, provider, source, readBalance, refreshWallets]);

  // ---- Embedded ----
  const createWallet = useCallback(async (name: string, password: string) => {
    setError(null);
    const { meta, mnemonic } = await createEmbeddedWallet(name, password);
    refreshWallets();
    setActiveEmbeddedId(meta.id);
    setEmbeddedAddr(meta.address);
    setSource("embedded");
    return { meta, mnemonic };
  }, [refreshWallets]);

  const importWallet = useCallback(async (name: string, password: string, secret: string) => {
    setError(null);
    const meta = await importEmbeddedWallet(name, password, secret);
    refreshWallets();
    setActiveEmbeddedId(meta.id);
    setEmbeddedAddr(meta.address);
    setSource("embedded");
    return meta;
  }, [refreshWallets]);

  const unlockWallet = useCallback(async (id: string, password: string) => {
    setError(null);
    const addr = await unlockEmbeddedWallet(id, password);
    refreshWallets();
    setActiveEmbeddedId(id);
    setEmbeddedAddr(addr);
    setSource("embedded");
  }, [refreshWallets]);

  const lockWallet = useCallback(() => {
    lockEmbeddedWallet();
    setActiveEmbeddedId(null);
    setEmbeddedAddr(null);
    if (source === "embedded") {
      setSource(mmAddress ? "metamask" : null);
    }
  }, [source, mmAddress]);

  const removeWallet = useCallback((id: string) => {
    removeEmbeddedWallet(id);
    refreshWallets();
    if (getActiveWalletId() === null || id === activeEmbeddedId) {
      setActiveEmbeddedId(null);
      setEmbeddedAddr(null);
      if (source === "embedded") setSource(mmAddress ? "metamask" : null);
    }
  }, [activeEmbeddedId, source, mmAddress, refreshWallets]);

  const exportKey = useCallback(async (id: string, password: string) => {
    return exportEmbeddedKey(id, password);
  }, []);

  const getSigner = useCallback(async (): Promise<Signer> => {
    if (source === "embedded" && activeEmbeddedId) {
      const pk = getSessionKey(activeEmbeddedId);
      if (!pk) throw new Error("Your EZ wallet is locked. Unlock it with your password first.");
      return new Wallet(pk, rpc());
    }
    if (source === "metamask" && provider) {
      if (mmChainId !== SEPOLIA_CHAIN_ID) throw new Error("Switch MetaMask to Sepolia testnet, then try again.");
      return provider.getSigner();
    }
    throw new Error("Connect a wallet first (create an EZ wallet or link MetaMask).");
  }, [source, activeEmbeddedId, provider, mmChainId]);

  const hasEnough = useMemo(() => {
    if (balanceEth === null) return null;
    const n = Number(balanceEth);
    if (!isFinite(n)) return null;
    return n >= MIN_BALANCE_ETH;
  }, [balanceEth]);

  const value: WalletState = {
    address,
    source,
    balanceEth,
    chainId,
    connecting,
    error,
    hasEnough,
    provider,
    connect,
    disconnect,
    refresh,
    embeddedWallets,
    embeddedUnlocked,
    createWallet,
    importWallet,
    unlockWallet,
    lockWallet,
    removeWallet,
    exportKey,
    refreshWallets,
    getSigner,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWallet(): WalletState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWallet must be used inside WalletProvider");
  return v;
}
