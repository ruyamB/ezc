import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, clientIp, COMPILE_LIMIT } from "@/lib/ratelimit";

// solc has no bundled TS types for compile input; keep it loose
// eslint-disable-next-line @typescript-eslint/no-require-imports
const solc = require("solc");

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(`compile:${clientIp(req)}`, COMPILE_LIMIT.limit, COMPILE_LIMIT.windowMs);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many compiles. Wait about ${rl.retryAfterSec}s. (30/min)` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }
  try {
    const { source, contractName } = await req.json();
    if (!source || typeof source !== "string") {
      return NextResponse.json({ error: "Missing Solidity source." }, { status: 400 });
    }
    const name = (contractName || "EZContract").replace(/[^A-Za-z0-9_]/g, "") || "EZContract";

    const input = {
      language: "Solidity",
      sources: { [`${name}.sol`]: { content: source } },
      settings: {
        optimizer: { enabled: true, runs: 200 },
        outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
      },
    };

    const output = JSON.parse(solc.compile(JSON.stringify(input)));
    if (output.errors) {
      const fatal = output.errors.filter((e: { severity: string }) => e.severity === "error");
      if (fatal.length) {
        return NextResponse.json(
          { error: fatal.map((e: { formattedMessage: string }) => e.formattedMessage).join("\n").slice(0, 4000) },
          { status: 400 }
        );
      }
    }
    const fileKey = `${name}.sol`;
    const contracts = output.contracts?.[fileKey];
    if (!contracts) {
      return NextResponse.json({ error: "Compilation produced no contracts." }, { status: 400 });
    }
    const first = contracts[name] ?? Object.values(contracts)[0] as { abi: unknown; evm: { bytecode: { object: string } } };
    const abi = (first as { abi: unknown }).abi;
    const bytecodeRaw = (first as { evm: { bytecode: { object: string } } }).evm?.bytecode?.object ?? "";
    if (!bytecodeRaw) {
      return NextResponse.json({ error: "No bytecode produced." }, { status: 400 });
    }
    const bytecode = bytecodeRaw.startsWith("0x") ? bytecodeRaw : `0x${bytecodeRaw}`;
    return NextResponse.json({ abi, bytecode, contractName: name });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Compile failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
