// Client helper: Run blocks -> code via Groq AI, with local fallback.
// The Groq key (user pastes it later) lives in localStorage; the server also
// accepts GROQ_API_KEY from the environment.

"use client";
import type { Edge, Node } from "@xyflow/react";
import { findBlock } from "./blocks";
import { generateSolidity, type GenResult } from "./solidity";

export const GROQ_LS_KEY = "ezc_groq_key";

export function getGroqKey(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(GROQ_LS_KEY) ?? "";
}

export function setGroqKey(k: string): void {
  if (typeof window === "undefined") return;
  if (k.trim()) window.localStorage.setItem(GROQ_LS_KEY, k.trim());
  else window.localStorage.removeItem(GROQ_LS_KEY);
}

export type Engine = "groq" | "local";

export async function generateWithAi(
  nodes: Node[],
  edges: Edge[],
  contractName: string
): Promise<{ result: GenResult; engine: Engine; notice?: string }> {
  const clean = (contractName || "EZContract").replace(/[^A-Za-z0-9_]/g, "") || "EZContract";
  const local = generateSolidity(nodes, edges, clean);

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const labelOf = (id: string): string => {
    const n = byId.get(id);
    const kind = (n?.data as unknown as { kind?: string })?.kind ?? id;
    return findBlock(kind)?.label ?? kind;
  };
  const payload = {
    contractName: clean,
    apiKey: getGroqKey() || undefined,
    nodes: nodes.map((n) => {
      const d = n.data as unknown as { kind?: string; label?: string; params?: Record<string, string> };
      return { kind: d.kind ?? "unknown", label: d.label ?? d.kind ?? "Block", params: d.params ?? {} };
    }),
    edges: edges
      .filter((e) => byId.has(e.source) && byId.has(e.target))
      .map((e) => ({ from: labelOf(e.source), to: labelOf(e.target) })),
  };

  let res: Response;
  try {
    res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    return { result: local, engine: "local", notice: "AI service unreachable. Used the local template engine." };
  }

  if (res.status === 402) {
    return { result: local, engine: "local", notice: "No Groq key yet. Used the local engine. Add a key in AI settings for smarter code." };
  }
  if (res.status === 429) {
    const d = (await res.json().catch(() => ({}))) as { error?: string };
    return { result: local, engine: "local", notice: d.error ?? "Rate limited. Used the local engine this time." };
  }
  if (!res.ok) {
    const d = (await res.json().catch(() => ({}))) as { error?: string };
    return { result: local, engine: "local", notice: d.error ?? "AI path failed. Used the local engine." };
  }
  const d = (await res.json()) as { solidity: string; summary: string[]; functionList: string[] };
  if (!d.solidity?.includes("pragma solidity")) {
    return { result: local, engine: "local", notice: "AI returned an unusable contract. Used the local engine." };
  }
  return {
    result: {
      solidity: d.solidity,
      summary: d.summary?.length ? d.summary : local.summary,
      functionList: d.functionList?.length ? d.functionList : local.functionList,
      abi: local.abi, // placeholder until compile/deploy returns the exact ABI
      contractName: clean,
      deployValueWei: local.deployValueWei,
    },
    engine: "groq",
  };
}
