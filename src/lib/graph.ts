import type { Edge, Node } from "@xyflow/react";
import { findBlock, type BlockKind } from "./blocks";

// Shared canvas graph helpers: templates + node factories used by the
// dashboard workspace and the project provider (cross-page state).

let uid = 100;
export function nid() {
  uid += 1;
  return `n${Date.now()}_${uid}`;
}

export function makeNode(kind: BlockKind, x: number, y: number): Node {
  const def = findBlock(kind);
  return {
    id: nid(),
    type: "ez",
    position: { x, y },
    data: { kind, label: def?.label ?? kind, params: { ...(def?.defaults ?? {}) } },
  } as Node;
}

export function withParams(kind: BlockKind, x: number, y: number, params: Record<string, string>): Node {
  const n = makeNode(kind, x, y);
  n.data = { ...((n.data as object) ?? {}), params } as never;
  return n;
}

export function chain(nodes: Node[]): Edge[] {
  return nodes.slice(1).map((n, i) => ({ id: `e${nodes[0].id}_${i}`, source: nodes[i].id, target: n.id, animated: true }));
}

export function templateGraph(t: string | null): { nodes: Node[]; edges: Edge[] } {
  if (t === "erc20") {
    const ns = [makeNode("erc20", 60, 30), makeNode("ownable", 60, 250), makeNode("emitChain", 60, 420)];
    return { nodes: ns, edges: chain(ns) };
  }
  if (t === "nft") {
    const ns = [makeNode("erc721", 60, 30), makeNode("ownable", 60, 250), makeNode("pausable", 60, 420)];
    return { nodes: ns, edges: chain(ns) };
  }
  if (t === "escrow") {
    const ns = [makeNode("escrow", 60, 30), makeNode("reentrancyGuard", 60, 250), makeNode("cei", 60, 420)];
    return { nodes: ns, edges: chain(ns) };
  }
  if (t === "staking") {
    const ns = [makeNode("staking", 60, 30), makeNode("reentrancyGuard", 60, 250), withParams("emitChain", 60, 420, { text: "Staking pool open" })];
    return { nodes: ns, edges: chain(ns) };
  }
  if (t === "dao") {
    const ns = [makeNode("dao", 60, 30), withParams("accessControl", 60, 250, { role: "MEMBER" }), withParams("emitChain", 60, 420, { text: "DAO launched" })];
    return { nodes: ns, edges: chain(ns) };
  }
  if (t === "market") {
    const ns = [makeNode("marketplace", 60, 30), makeNode("ownable", 60, 250), makeNode("reentrancyGuard", 60, 420)];
    return { nodes: ns, edges: chain(ns) };
  }
  if (t === "tipjar" || t === "tips") {
    const ns = [
      withParams("customContract", 60, 30, { note: "Tip jar" }),
      withParams("transferEth", 60, 220, { to: "", amount: "0.01" }),
      withParams("emitChain", 60, 420, { text: "Thanks for the tip" }),
    ];
    return { nodes: ns, edges: chain(ns) };
  }
  // default starter: custom + a guard + an action
  const ns = [
    withParams("customContract", 60, 30, { note: "My first contract" }),
    makeNode("requireCheck", 60, 220),
    withParams("emitChain", 60, 420, { text: "Hello on-chain" }),
  ];
  return { nodes: ns, edges: chain(ns) };
}

export const TEMPLATES: [string, string][] = [
  ["erc20", "ERC-20 Coin"],
  ["nft", "NFT Collection"],
  ["escrow", "Escrow Deal"],
  ["tipjar", "Tip Jar"],
];
