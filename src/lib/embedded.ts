// Embedded EZContract wallets: create + import + AES-GCM encrypted browser storage.
// Keys are encrypted with a user password (PBKDF2-SHA256 -> AES-GCM-256) and
// only ever decrypted into memory (never persisted as plaintext).

import { Wallet, isAddress } from "ethers";

export interface StoredWalletMeta {
  id: string;
  name: string;
  address: string;
  createdAt: number;
}

interface StoredWallet extends StoredWalletMeta {
  payload: { salt: string; iv: string; data: string };
}

const LS_KEY = "ezc_wallets_v1";
const ACTIVE_KEY = "ezc_active_v1";

// In-memory session keys: walletId -> privateKeyHex. Cleared on lock/reload.
const sessionKeys = new Map<string, string>();

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function b64encode(bytes: Uint8Array): string {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
}

function b64decode(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 210_000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptSecret(password: string, secret: string): Promise<StoredWallet["payload"]> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, new TextEncoder().encode(secret));
  return { salt: b64encode(salt), iv: b64encode(iv), data: b64encode(new Uint8Array(ct)) };
}

async function decryptSecret(password: string, p: StoredWallet["payload"]): Promise<string> {
  const key = await deriveKey(password, b64decode(p.salt));
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64decode(p.iv) as BufferSource },
    key,
    b64decode(p.data) as BufferSource
  );
  return new TextDecoder().decode(pt);
}

function readAll(): StoredWallet[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as StoredWallet[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeAll(w: StoredWallet[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(LS_KEY, JSON.stringify(w));
}

export function listEmbeddedWallets(): StoredWalletMeta[] {
  return readAll().map(({ payload, ...meta }) => meta);
}

export function getActiveWalletId(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(ACTIVE_KEY);
}

export function setActiveWalletId(id: string | null): void {
  if (!isBrowser()) return;
  if (id) window.localStorage.setItem(ACTIVE_KEY, id);
  else window.localStorage.removeItem(ACTIVE_KEY);
}

function normalizeSecret(secret: string): { privateKey: string } {
  const s = secret.trim();
  if (/^0x[0-9a-fA-F]{64}$/.test(s)) return { privateKey: s };
  if (/^[0-9a-fA-F]{64}$/.test(s)) return { privateKey: `0x${s}` };
  // try mnemonic phrase
  try {
    const w = Wallet.fromPhrase(s.toLowerCase().replace(/\s+/g, " ").trim());
    return { privateKey: w.privateKey };
  } catch {
    throw new Error("That doesn't look like a private key or recovery phrase. Check and try again.");
  }
}

export async function createEmbeddedWallet(name: string, password: string): Promise<{ meta: StoredWalletMeta; mnemonic: string }> {
  if (!name.trim()) throw new Error("Give your wallet a name first.");
  if (password.length < 6) throw new Error("Password needs at least 6 characters.");
  const w = Wallet.createRandom();
  const mnemonic = w.mnemonic?.phrase ?? "";
  const payload = await encryptSecret(password, w.privateKey);
  const meta: StoredWalletMeta = {
    id: `ez_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim().slice(0, 32),
    address: w.address,
    createdAt: Date.now(),
  };
  const all = readAll();
  writeAll([...all, { ...meta, payload }]);
  sessionKeys.set(meta.id, w.privateKey);
  setActiveWalletId(meta.id);
  return { meta, mnemonic };
}

export async function importEmbeddedWallet(name: string, password: string, secret: string): Promise<StoredWalletMeta> {
  if (!name.trim()) throw new Error("Give your wallet a name first.");
  if (password.length < 6) throw new Error("Password needs at least 6 characters.");
  const { privateKey } = normalizeSecret(secret);
  const w = new Wallet(privateKey);
  const all = readAll();
  if (all.some((x) => x.address.toLowerCase() === w.address.toLowerCase())) {
    throw new Error("This wallet is already saved here. Unlock it instead.");
  }
  const payload = await encryptSecret(password, privateKey);
  const meta: StoredWalletMeta = {
    id: `ez_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim().slice(0, 32),
    address: w.address,
    createdAt: Date.now(),
  };
  writeAll([...all, { ...meta, payload }]);
  sessionKeys.set(meta.id, privateKey);
  setActiveWalletId(meta.id);
  return meta;
}

export async function unlockEmbeddedWallet(id: string, password: string): Promise<string> {
  const found = readAll().find((x) => x.id === id);
  if (!found) throw new Error("Wallet not found on this device.");
  let pk: string;
  try {
    pk = await decryptSecret(password, found.payload);
  } catch {
    throw new Error("Wrong password. Try again.");
  }
  // sanity: decrypted value must be a valid key for the stored address
  try {
    const w = new Wallet(pk);
    if (w.address.toLowerCase() !== found.address.toLowerCase()) throw new Error("mismatch");
  } catch {
    throw new Error("Wrong password. Try again.");
  }
  sessionKeys.set(id, pk);
  setActiveWalletId(id);
  return found.address;
}

export function lockEmbeddedWallet(): void {
  sessionKeys.clear();
  setActiveWalletId(null);
}

export function removeEmbeddedWallet(id: string): void {
  writeAll(readAll().filter((x) => x.id !== id));
  sessionKeys.delete(id);
  if (getActiveWalletId() === id) setActiveWalletId(null);
}

export async function exportEmbeddedKey(id: string, password: string): Promise<string> {
  const found = readAll().find((x) => x.id === id);
  if (!found) throw new Error("Wallet not found on this device.");
  try {
    return await decryptSecret(password, found.payload);
  } catch {
    throw new Error("Wrong password. Try again.");
  }
}

export function getSessionKey(id: string): string | null {
  return sessionKeys.get(id) ?? null;
}

export function isValidAddress(a: string): boolean {
  try {
    return isAddress(a.trim());
  } catch {
    return false;
  }
}
