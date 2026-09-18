// Client helper: plain-English description -> block graph (text→blocks).
// Uses /api/plan (Groq) when a key is available, otherwise plans from
// keywords so beginners always get a starting canvas.

"use client";
import type { Edge, Node } from "@xyflow/react";
import { findBlock, type BlockKind } from "./blocks";
import { getGroqKey, type Engine } from "./ai";

export type TemplateKey = "erc20" | "nft" | "escrow" | "staking" | "dao" | "market" | "tipjar" | "starter";

let uid = 5000;
function nid() {
  uid += 1;
  return `p${Date.now()}_${uid}`;
}

export function layoutNodes(items: { kind: string; params: Record<string, string> }[]): { nodes: Node[]; indexIds: string[] } {
  const nodes: Node[] = items.map((it, i) => {
    const def = findBlock(it.kind);
    return {
      id: nid(),
      type: "ez",
      // 2-column snake — reads well on the wide landscape canvas
      position: { x: 80 + (i % 2) * 300, y: 40 + Math.floor(i / 2) * 240 },
      data: {
        kind: (def?.kind ?? "customContract") as BlockKind,
        label: def?.label ?? it.kind,
        params: { ...(def?.defaults ?? {}), ...it.params },
      },
    } as Node;
  });
  return { nodes, indexIds: nodes.map((n) => n.id) };
}

export function keywordTemplate(prompt: string): TemplateKey {
  const t = prompt.toLowerCase();
  if (/(nft|erc-?721|collectib|artwork|pfp|mint.*(art|image|picture))/.test(t)) return "nft";
  if (/(escrow|middleman|arbiter|referee|hold.*(fund|payment|money))/.test(t)) return "escrow";
  if (/(dao|vot|proposal|govern|quorum|ballot)/.test(t)) return "dao";
  if (/(stak|yield|earn|reward|apy|lock.*eth)/.test(t)) return "staking";
  if (/(market|shop|listing|buy|sell|storefront)/.test(t)) return "market";
  if (/(tip|donat|jar|coffee|support me)/.test(t)) return "tipjar";
  if (/(token|coin|erc-?20|currency|supply|symbol)/.test(t)) return "erc20";
  return "starter";
}

export function guessName(prompt: string): string | null {
  const m = prompt.match(/(?:called|named|name it|name:?)\s+([A-Za-z0-9][A-Za-z0-9 _-]{1,28})/i);
  if (!m) return null;
  const pascal = m[1]
    .split(/[\s_-]+/)
    .slice(0, 3)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("")
    .replace(/[^A-Za-z0-9]/g, "");
  return pascal || null;
}

export async function describeToGraph(
  prompt: string,
  contractName: string
): Promise<{
  mode: "ai" | "keyword";
  blocks?: { kind: string; params: Record<string, string> }[];
  edges?: [number, number][];
  template?: TemplateKey;
  name?: string;
  summary?: string[];
  notice?: string;
  engine: Engine;
}> {
  const clean = prompt.trim().slice(0, 1500);
  const guessed = guessName(clean) ?? undefined;

  let res: Response;
  try {
    res = await fetch("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: clean, contractName, apiKey: getGroqKey() || undefined }),
    });
  } catch {
    return { mode: "keyword", template: keywordTemplate(clean), name: guessed, engine: "local", notice: "AI planner unreachable. Started you from a matching template instead." };
  }

  if (res.status === 402) {
    return { mode: "keyword", template: keywordTemplate(clean), name: guessed, engine: "local", notice: "No Groq key yet. Matched your words to the closest template. Save a key in AI settings for full understanding." };
  }
  if (!res.ok) {
    const d = (await res.json().catch(() => ({}))) as { error?: string };
    return { mode: "keyword", template: keywordTemplate(clean), name: guessed, engine: "local", notice: `${d.error ?? "Planner hiccup"}. Started from a template instead.` };
  }
  const d = (await res.json()) as {
    blocks: { kind: string; params: Record<string, string> }[];
    edges: [number, number][];
    summary: string[];
    contractName: string;
  };
  if (!Array.isArray(d.blocks) || !d.blocks.length) {
    return { mode: "keyword", template: keywordTemplate(clean), name: guessed, engine: "local", notice: "AI plan came back empty. Started from a template instead." };
  }
  return { mode: "ai", blocks: d.blocks, edges: d.edges, summary: d.summary, name: d.contractName || guessed, engine: "groq" };
}
