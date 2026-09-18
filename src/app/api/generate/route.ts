import { NextRequest, NextResponse } from "next/server";
import { BLOCKS } from "@/lib/blocks";
import { checkRateLimit, clientIp, GENERATE_LIMIT } from "@/lib/ratelimit";
import { callGroqChat } from "@/lib/groq";

// POST /api/generate — blocks+connectors -> Solidity, powered by Groq.
// Body: { nodes: [{kind,label,params}], edges: [{from,to}], contractName?, apiKey? }
// apiKey is optional per-request (dashboard settings). Server falls back to
// process.env.GROQ_API_KEY. Rate limited per IP (see src/lib/ratelimit.ts).

interface InNode {
  kind: string;
  label: string;
  params: Record<string, string>;
}
interface InEdge {
  from: string;
  to: string;
}

function catalog(): string {
  return BLOCKS.map((b) => `- ${b.kind} [${b.category}] "${b.label}": ${b.plain}`).join("\n");
}

function buildPrompt(contractName: string, nodes: InNode[], edges: InEdge[]): { system: string; user: string } {
  const system = [
    "You are EZContract's Solidity compiler. You turn a beginner's drag-and-drop block graph into a complete, secure, COMPILABLE Solidity contract.",
    "Hard rules:",
    "1. Output STRICT JSON only: {\"solidity\": string, \"summary\": string[], \"functionList\": string[]}. No markdown fences, no commentary.",
    "2. Solidity 0.8.20, SPDX MIT, pragma ^0.8.20. Self-contained: NO imports, NO OpenZeppelin, NO external dependencies (the compiler has no node_modules). Inline any Ownable/Guard/Pausable logic yourself.",
    "3. The contract MUST compile with solc optimizer settings. Every referenced variable, event and modifier must be declared. Never call undeclared identifiers. Validate: state vars exist before use, events declared before emit, all functions closed.",
    "4. Security: use checks-effects-interactions order, guard money-moving functions with a reentrancy lock when a ReentrancyGuard block is present, add onlyOwner / role checks when Ownable / AccessControl blocks are present.",
    "5. Contract blocks (erc20, erc721, erc1155, escrow, dao, staking, marketplace, customContract) choose the contract's base shape. The FIRST contract block in flow order is the primary base; extra contract blocks add companion features only if coherent, otherwise note them in summary as skipped.",
    "6. Logic blocks add declarations (stateVar, mappingVar, structDef, eventDef, modifierDef, functionDef with the given body) and runFlow() statements (requireCheck, ifElse, loop). Chain blocks (transferEth, approveToken, transferToken, callFunction, emitChain, readState) become statements inside runFlow() or their own functions. deployConfig sets constructor funding notes.",
    "7. Addresses the user left empty: use address(0) placeholders that compile, and say so in summary. Never invent fake-looking mainnet addresses.",
    "8. summary: 3-10 short plain-English bullets a non-coder understands. functionList: public/external function signatures like runFlow(), transfer(address,uint256).",
  ].join("\n");

  const nodeLines = nodes.map((n, i) => {
    const params = Object.entries(n.params ?? {})
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => `${k}="${String(v).slice(0, 200)}"`)
      .join(", ");
    return `${i + 1}. [${n.kind}] ${n.label}${params ? ` {${params}}` : ""}`;
  });
  const edgeLines = edges.map((e) => `"${e.from}" -> "${e.to}"`);

  const user = [
    `Contract name: ${contractName}`,
    "",
    "BLOCK CATALOG (kind [toolbox] label: meaning):",
    catalog(),
    "",
    "USER GRAPH (flow order = canvas top-to-bottom, connectors show sequence):",
    nodeLines.length ? nodeLines.join("\n") : "(empty canvas — generate a friendly starter contract)",
    "",
    "CONNECTORS:",
    edgeLines.length ? edgeLines.join("\n") : "(none)",
    "",
    "Return the JSON now.",
  ].join("\n");

  return { system, user };
}

function extractJson(text: string): { solidity: string; summary: string[]; functionList: string[] } {
  let t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  const obj = JSON.parse(t) as { solidity?: unknown; summary?: unknown; functionList?: unknown };
  if (typeof obj.solidity !== "string" || !obj.solidity.includes("pragma solidity")) {
    throw new Error("Model returned no usable contract.");
  }
  return {
    solidity: obj.solidity.slice(0, 60_000),
    summary: Array.isArray(obj.summary) ? obj.summary.map(String).slice(0, 14) : [],
    functionList: Array.isArray(obj.functionList) ? obj.functionList.map(String).slice(0, 30) : [],
  };
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = checkRateLimit(`gen:${ip}`, GENERATE_LIMIT.limit, GENERATE_LIMIT.windowMs);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many generations. Wait about ${rl.retryAfterSec}s and try again. (10/min)` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let body: { nodes?: InNode[]; edges?: InEdge[]; contractName?: string; apiKey?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad JSON body." }, { status: 400 });
  }

  const nodes = Array.isArray(body.nodes) ? body.nodes.slice(0, 60) : [];
  const edges = Array.isArray(body.edges) ? body.edges.slice(0, 120) : [];
  const contractName = (body.contractName || "EZContract").replace(/[^A-Za-z0-9_]/g, "") || "EZContract";
  const apiKey = (body.apiKey || "").trim() || process.env.GROQ_API_KEY || "";

  if (!apiKey) {
    return NextResponse.json(
      {
        error: "NO_GROQ_KEY",
        message: "No Groq API key yet. Paste one in Dashboard → AI settings (or set GROQ_API_KEY on the server). Falling back to the local template engine.",
      },
      { status: 402 }
    );
  }

  const { system, user } = buildPrompt(contractName, nodes, edges);

  try {
    const { content, model } = await callGroqChat(
      apiKey,
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { temperature: 0.2, maxTokens: 5000 }
    );
    const parsed = extractJson(content);
    return NextResponse.json({ ...parsed, contractName, engine: "groq", model }, { headers: { "X-RateLimit-Remaining": String(rl.remaining) } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "AI generation failed.";
    return NextResponse.json({ error: `${msg} The app falls back to the local engine.` }, { status: 502 });
  }
}
