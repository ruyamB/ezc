import JSZip from "jszip";
import { buildDeployScript, type GenResult } from "./solidity";
import type { Engine } from "./ai";
import type { CompiledArtifact } from "./project";

// Builds the downloadable project folder (Contract.sol + ABI + deploy script).
export async function downloadProjectZip(gen: GenResult, compiled: CompiledArtifact | null, engine: Engine | null) {
  const zip = new JSZip();
  zip.file(`${gen.contractName}.sol`, gen.solidity);
  zip.file("abi.json", JSON.stringify(compiled?.abi ?? gen.abi, null, 2));
  zip.file("deploy.js", buildDeployScript(gen.contractName));
  if (compiled) zip.file("artifact.json", JSON.stringify({ abi: compiled.abi, bytecode: compiled.bytecode }, null, 2));
  zip.file(
    "README.md",
    `# ${gen.contractName} (EZContract by ETHShala)\n\nEngine: ${engine ?? "local"}\n\nFlow: ${gen.summary.join(" | ") || "empty"}\n\n## Files\n- ${gen.contractName}.sol (the contract, run output)\n- abi.json (call it from any app)\n- deploy.js (node deploy script, needs SEPOLIA_RPC + PRIVATE_KEY)\n\n## Verify on Etherscan\nhttps://sepolia.etherscan.io (paste the deployed address).\n`
  );
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${gen.contractName}-folder.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
