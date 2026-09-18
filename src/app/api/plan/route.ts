import { NextRequest, NextResponse } from "next/server";
import { BLOCKS, type BlockKind } from "@/lib/blocks";
import { checkRateLimit, clientIp, PLAN_LIMIT } from "@/lib/ratelimit";
import { callGroqChat } from "@/lib/groq";

// POST /api/plan — plain-English description -> block graph (text→blocks).
// Body: { prompt, contractName?, apiKey? }
// Returns: { blocks: [{kind, params}], edges: [[fromIdx, toIdx]], summary[], contractName, engine }
// Sanitized server-side: unknown kinds dropped, params filtered to known
// fields, caps enforced. Rate limited per IP (see src/lib/ratelimit.ts).

const MAX_BLOCKS = 14;
const MAX_EDGES = 20;

function catalog(): string {
  return BLOCKS.map(
    (b) => `- ${b.kind} [${b.category}] "${b.label}": ${b.plain} fields(${b.fields.map((f) => f.key).join(", ") || "none"})`
  ).join("\n");
}

function buildPrompt(prompt: string, contractName: string): { system: string; user: string } {
  const system = [
    "You are EZContract's visual planner. A beginner describes a smart contract in plain English; you reply with the drag-and-drop BLOCK GRAPH that builds it.",
    "Hard rules:",
    "1. Output STRICT JSON only: {\"blocks\": [{\"kind\": string, \"params\": object}], \"edges\": [[number, number]], \"summary\": string[], \"contractName\": string}. No markdown fences, no commentary.",
    "2. \"kind\" MUST be exactly one of the catalog kinds below. Never invent kinds.",
    "3. \"params\" keys MUST be valid fields for that kind (listed in the catalog). Values are short strings (max ~40 chars). Omit fields you have no value for — defaults apply.",
    "4. Max 14 blocks. The FIRST block MUST be a Contracts block (the base: erc20, erc721, erc1155, escrow, dao, staking, marketplace, or customContract).",
    "5. \"edges\" connect block indexes [from, to] in execution order (0-based, from < to, no duplicates, max 20). Chain the main flow top-to-bottom.",
    "6. Keep it beginner-sized: base + 2-6 supporting blocks (security / logic / chain). Prefer: Ownable or AccessControl for admin, ReentrancyGuard + CEI for money flows, Require for entry rules, Emit Event to announce.",
    "7. Use the user's words for names/messages (token name, announcement text). Leave addresses empty (\"\") unless the user gave one.",
    "8. summary: 2-5 short plain-English bullets saying what the plan builds. contractName: PascalCase, short.",
  ].join("\n");

  const user = [
    `Contract name hint: ${contractName}`,
    "",
    "BLOCK CATALOG (kind [toolbox] label: meaning + valid param fields):",
    catalog(),
    "",
    "USER DESCRIPTION:",
    prompt.slice(0, 1500),
    "",
    "Return the JSON now.",
  ].join("\n");

  return { system, user };
}

interface RawPlan {
  blocks?: { kind?: unknown; params?: unknown }[];
  edges?: unknown;
  summary?: unknown;
  contractName?: unknown;
}

export function sanitizePlan(raw: RawPlan, fallbackName: string): {
  blocks: { kind: BlockKind; params: Record<string, string> }[];
  edges: [number, number][];
  summary: string[];
  contractName: string;
} {
  const defs = new Map(BLOCKS.map((b) => [b.kind, b]));
  const blocks: { kind: BlockKind; params: Record<string, string> }[] = [];
  for (const rb of Array.isArray(raw.blocks) ? raw.blocks.slice(0, MAX_BLOCKS) : []) {
    if (typeof rb?.kind !== "string" || !defs.has(rb.kind as BlockKind)) continue;
    const def = defs.get(rb.kind as BlockKind)!;
    const allowed = new Set(def.fields.map((f) => f.key));
    const params: Record<string, string> = {};
    if (rb.params && typeof rb.params === "object") {
      for (const [k, v] of Object.entries(rb.params as Record<string, unknown>)) {
        if (allowed.has(k) && (typeof v === "string" || typeof v === "number")) {
          params[k] = String(v).slice(0, 200);
        }
      }
    }
    blocks.push({ kind: def.kind, params: { ...def.defaults, ...params } });
  }
  // guarantee a Contracts base first
  if (!blocks.some((b) => defs.get(b.kind)?.category === "Contracts")) {
    blocks.unshift({ kind: "customContract", params: { note: "Planned contract" } });
  }
  const n = blocks.length;
  const seen = new Set<string>();
  const edges: [number, number][] = [];
  if (Array.isArray(raw.edges)) {
    for (const e of raw.edges.slice(0, MAX_EDGES)) {
      if (!Array.isArray(e) || e.length < 2) continue;
      const [a, b] = [Number(e[0]), Number(e[1])];
      if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a >= n || b >= n || a === b) continue;
      const key = `${a}>${b}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push([a, b]);
    }
  }
  if (!edges.length && n > 1) {
    for (let i = 0; i < n - 1; i++) edges.push([i, i + 1]);
  }
  const summary = Array.isArray(raw.summary) ? raw.summary.map(String).slice(0, 8) : [];
  const cname =
    typeof raw.contractName === "string" && raw.contractName.trim()
      ? raw.contractName.replace(/[^A-Za-z0-9_]/g, "").slice(0, 32) || fallbackName
      : fallbackName;
  return { blocks, edges, summary, contractName: cname };
}

function extractJson(text: string): RawPlan {
  let t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  return JSON.parse(t) as RawPlan;
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = checkRateLimit(`plan:${ip}`, PLAN_LIMIT.limit, PLAN_LIMIT.windowMs);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many descriptions. Wait about ${rl.retryAfterSec}s and try again. (10/min)` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let body: { prompt?: unknown; contractName?: unknown; apiKey?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad JSON body." }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, 1500) : "";
  if (prompt.length < 8) {
    return NextResponse.json({ error: "Describe your contract in a sentence or two first." }, { status: 400 });
  }
  const fallbackName =
    (typeof body.contractName === "string" && body.contractName.replace(/[^A-Za-z0-9_]/g, "")) || "EZContract";
  const apiKey = (typeof body.apiKey === "string" ? body.apiKey.trim() : "") || process.env.GROQ_API_KEY || "";

  if (!apiKey) {
    return NextResponse.json(
      {
        error: "NO_GROQ_KEY",
        message: "No Groq API key yet. The app planned from keywords instead. Save a key in AI settings for full understanding.",
      },
      { status: 402 }
    );
  }

  const { system, user } = buildPrompt(prompt, fallbackName);

  try {
    const { content, model } = await callGroqChat(
      apiKey,
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { temperature: 0.3, maxTokens: 2500 }
    );
    const plan = sanitizePlan(extractJson(content), fallbackName);
    return NextResponse.json({ ...plan, engine: "groq", model }, { headers: { "X-RateLimit-Remaining": String(rl.remaining) } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Planning failed.";
    return NextResponse.json({ error: `${msg}` }, { status: 502 });
  }
}
