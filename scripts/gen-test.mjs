// Compile-test for the local fallback generator: every base + kitchen sink.
// Plain .mjs runner (kept out of tsconfig): copies the TS lib to a temp dir
// with an extension-fixed import, then loads it via Node type stripping.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const solc = require("solc");

const dir = join(tmpdir(), "ezc-gen-test");
mkdirSync(dir, { recursive: true });
const blocks = readFileSync(join(here, "..", "src", "lib", "blocks.ts"), "utf8");
let sol = readFileSync(join(here, "..", "src", "lib", "solidity.ts"), "utf8");
sol = sol.replace('from "./blocks"', 'from "./blocks.ts"');
writeFileSync(join(dir, "blocks.ts"), blocks);
writeFileSync(join(dir, "solidity.ts"), sol);
const { generateSolidity } = await import(pathToFileURL(join(dir, "solidity.ts")).href);

let idc = 0;
const N = (kind, params = {}) => ({ id: `n${++idc}`, type: "ez", position: { x: 0, y: 0 }, data: { kind, label: kind, params } });
const chainOf = (ns) => ns.slice(1).map((n, i) => ({ id: `e${i}`, source: ns[i].id, target: n.id }));

function compile(name, source) {
  const input = {
    language: "Solidity",
    sources: { [`${name}.sol`]: { content: source } },
    settings: { optimizer: { enabled: true, runs: 200 }, outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } } },
  };
  const out = JSON.parse(solc.compile(JSON.stringify(input)));
  const fatal = (out.errors ?? []).filter((e) => e.severity === "error");
  if (fatal.length) {
    console.log(`FAIL ${name}:\n` + fatal.map((e) => e.formattedMessage).join("\n").slice(0, 3000));
    return false;
  }
  return true;
}

const ADDR = "0x1111111111111111111111111111111111111111";
const cases = [
  ["T20", [N("erc20", {}), N("ownable"), N("emitChain", { text: "go" })]],
  ["T721", [N("erc721", {}), N("pausable")]],
  ["T1155", [N("erc1155", {}), N("accessControl", { role: "MINTER" })]],
  ["TEscrow", [N("escrow", { seller: ADDR, arbiter: ADDR }), N("reentrancyGuard"), N("cei")]],
  ["TDao", [N("dao", {})]],
  ["TStake", [N("staking", {}), N("deployConfig", { fundingEth: "0.5", note: "pool" })]],
  ["TMarket", [N("marketplace", {}), N("safeERC20")]],
  ["TCustom", [N("customContract", {}), N("stateVar", { varType: "uint256", varName: "score", initial: "1" }), N("mappingVar", { keyType: "address", valueType: "uint256", name: "xp" }), N("structDef", { structName: "Deal", fields: "address buyer;\nuint256 amount;" }), N("eventDef", { eventName: "Paid", params: "address indexed from, uint256 amount" }), N("modifierDef", { modName: "onlyMember", check: "xp[msg.sender] > 0", message: "no xp" }), N("functionDef", { funcName: "tick", payable: "no", body: "value += 1;" }), N("requireCheck", { condition: "msg.value >= 0.01 ether", message: "pay" }), N("ifElse", { condition: "value > 5", thenCode: "value = 5;", elseCode: "value += 1;" }), N("loop", { times: "3", body: "loopCount += 1;" }), N("transferEth", { to: "", amount: "0.01" }), N("callFunction", { target: "", signature: "ping()", valueEth: "0" }), N("approveToken", { token: ADDR, spender: ADDR, amount: "5" }), N("transferToken", { token: ADDR, to: "", amount: "1" }), N("emitChain", { text: "done" }), N("readState", { varName: "score" }), N("readState", { varName: "xp" }), N("readState", { varName: "nope" })]],
  ["TSecAll", [N("erc20", {}), N("ownable"), N("accessControl", { role: "BURNER" }), N("reentrancyGuard"), N("pausable"), N("safeERC20"), N("cei")]],
  ["TEmpty", []],
];

let pass = 0;
for (const [nm, ns] of cases) {
  const r = generateSolidity(ns, chainOf(ns), nm);
  const ok = compile(nm, r.solidity);
  console.log(`${ok ? "PASS" : "FAIL"} ${nm} (summary:${r.summary.length} fns:${r.functionList.length} funding:${r.deployValueWei})`);
  if (ok) pass++;
}
console.log(`\n${pass}/${cases.length} contracts compiled.`);
process.exit(pass === cases.length ? 0 : 1);
