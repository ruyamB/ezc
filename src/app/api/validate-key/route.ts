import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, clientIp, VALIDATE_LIMIT } from "@/lib/ratelimit";

// POST /api/validate-key — checks a Groq API key without spending anything.
// Body: { apiKey }. Returns { valid: true } or { valid: false, error }.
// The key is only forwarded to Groq, never stored or logged.

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(`validate:${clientIp(req)}`, VALIDATE_LIMIT.limit, VALIDATE_LIMIT.windowMs);
  if (!rl.allowed) {
    return NextResponse.json(
      { valid: false, error: `Too many checks. Wait about ${rl.retryAfterSec}s. (10/min)` },
      { status: 429 }
    );
  }

  let apiKey = "";
  try {
    const body = await req.json();
    apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  } catch {
    return NextResponse.json({ valid: false, error: "Bad JSON body." }, { status: 400 });
  }
  if (!apiKey) {
    return NextResponse.json({ valid: false, error: "Paste a key first." }, { status: 400 });
  }

  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(20_000),
    });
    if (res.ok) return NextResponse.json({ valid: true });
    if (res.status === 401) {
      return NextResponse.json({ valid: false, error: "Groq rejected this key (401). Check for typos." });
    }
    return NextResponse.json({ valid: false, error: `Groq answered ${res.status}. Try again in a bit.` });
  } catch {
    return NextResponse.json({ valid: false, error: "Could not reach Groq. Check your connection." });
  }
}
