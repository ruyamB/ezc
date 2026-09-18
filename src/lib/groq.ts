// Shared Groq chat client for the AI routes (/api/generate, /api/plan).
// Groq retires model IDs regularly (e.g. llama-3.3-70b-versatile went
// Enterprise-only and 404s on regular keys), so we try a list of currently
// served production models in order and only fail when all of them refuse.
// Override with GROQ_MODEL (comma-separated accepted) in the environment.

export const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// Verified live on Groq production, Sept 2026. Ordered strongest-first,
// cheapest-fastest last. All support response_format json_object.
export const DEFAULT_GROQ_MODELS = [
  "openai/gpt-oss-120b",
  "moonshotai/kimi-k2-instruct-0905",
  "qwen/qwen3-32b",
  "openai/gpt-oss-20b",
];

export function resolveGroqModels(): string[] {
  const env = (process.env.GROQ_MODEL || "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  if (env.length) return env;
  return DEFAULT_GROQ_MODELS;
}

interface GroqMessage {
  role: "system" | "user";
  content: string;
}

interface GroqErrorBody {
  error?: { message?: string; code?: string; type?: string };
}

function cleanGroqError(status: number, raw: string): { message: string; code: string } {
  try {
    const body = JSON.parse(raw) as GroqErrorBody;
    return {
      message: typeof body.error?.message === "string" ? body.error.message : `Groq error ${status}.`,
      code: typeof body.error?.code === "string" ? body.error.code : "",
    };
  } catch {
    return { message: `Groq error ${status}.`, code: "" };
  }
}

export async function callGroqChat(
  apiKey: string,
  messages: GroqMessage[],
  opts: { temperature: number; maxTokens: number; timeoutMs?: number }
): Promise<{ content: string; model: string }> {
  const models = resolveGroqModels();
  let lastError = "Groq did not answer.";
  for (const model of models) {
    let res: Response;
    try {
      res = await fetch(GROQ_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          temperature: opts.temperature,
          max_tokens: opts.maxTokens,
          response_format: { type: "json_object" },
          messages,
        }),
        signal: AbortSignal.timeout(opts.timeoutMs ?? 45_000),
      });
    } catch (e: unknown) {
      lastError = e instanceof Error ? e.message : "Network error reaching Groq.";
      continue; // transport failure: try next model (likely same outcome, cheap)
    }
    if (res.ok) {
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      return { content: data.choices?.[0]?.message?.content ?? "", model };
    }
    if (res.status === 401) {
      throw new Error("Groq rejected the API key (401). Check it in Dashboard → AI settings.");
    }
    if (res.status === 429) {
      throw new Error("Groq is rate-limiting us. Wait a minute and try again.");
    }
    const txt = await res.text().catch(() => "");
    const { message, code } = cleanGroqError(res.status, txt);
    if (res.status === 404 || code === "model_not_found") {
      lastError = `Model ${model} is not available (${message}).`;
      continue; // retired/renamed model: fall through to the next one
    }
    throw new Error(message);
  }
  throw new Error(`${lastError} Tried: ${models.join(", ")}.`);
}
