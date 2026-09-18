// EZContract block catalog.
// 4 toolboxes: Contracts (what to build) + Logic (how it thinks) +
// Security (how it's protected) + Chain (how it talks to the blockchain).

export type BlockKind =
  // Contracts
  | "erc20"
  | "erc721"
  | "erc1155"
  | "escrow"
  | "dao"
  | "staking"
  | "marketplace"
  | "customContract"
  // Logic
  | "ifElse"
  | "requireCheck"
  | "mappingVar"
  | "structDef"
  | "loop"
  | "modifierDef"
  | "eventDef"
  | "functionDef"
  | "stateVar"
  // Security
  | "ownable"
  | "accessControl"
  | "reentrancyGuard"
  | "pausable"
  | "safeERC20"
  | "cei"
  // Chain
  | "deployConfig"
  | "callFunction"
  | "readState"
  | "emitChain"
  | "transferEth"
  | "approveToken"
  | "transferToken";

export type BlockCategory = "Contracts" | "Logic" | "Security" | "Chain";

export interface BlockField {
  key: string;
  label: string;
  hint: string;
  placeholder: string;
  multiline?: boolean;
}

export interface BlockDef {
  kind: BlockKind;
  label: string;
  plain: string; // plain-english for beginners
  category: BlockCategory;
  color: string;
  dot: string;
  defaults: Record<string, string>;
  fields: BlockField[];
}

export const CATEGORIES: { name: BlockCategory; hint: string }[] = [
  { name: "Contracts", hint: "what to build" },
  { name: "Logic", hint: "how it thinks" },
  { name: "Security", hint: "how it's protected" },
  { name: "Chain", hint: "blockchain actions" },
];

export const BLOCKS: BlockDef[] = [
  // ---------------- CONTRACTS ----------------
  {
    kind: "erc20",
    label: "ERC-20 Token",
    plain: "Your own coin with balances, transfers and minting.",
    category: "Contracts",
    color: "bg-emerald-50 border-emerald-200 dark:bg-emerald-400/10 dark:border-emerald-300/25",
    dot: "bg-emerald-500",
    defaults: { name: "EZ Token", symbol: "EZT", supply: "1000000" },
    fields: [
      { key: "name", label: "Token name", hint: "Shown in wallets.", placeholder: "EZ Token" },
      { key: "symbol", label: "Symbol", hint: "Short ticker, e.g. EZT.", placeholder: "EZT" },
      { key: "supply", label: "Initial supply", hint: "Whole tokens minted to you at deploy.", placeholder: "1000000" },
    ],
  },
  {
    kind: "erc721",
    label: "ERC-721 NFT",
    plain: "Unique collectibles, one token ID at a time.",
    category: "Contracts",
    color: "bg-emerald-50 border-emerald-200 dark:bg-emerald-400/10 dark:border-emerald-300/25",
    dot: "bg-emerald-500",
    defaults: { name: "EZ Collectible", symbol: "EZC", baseURI: "ipfs://your-folder/" },
    fields: [
      { key: "name", label: "Collection name", hint: "Shown on marketplaces.", placeholder: "EZ Collectible" },
      { key: "symbol", label: "Symbol", hint: "Short ticker.", placeholder: "EZC" },
      { key: "baseURI", label: "Artwork folder (URI)", hint: "Token art lives at baseURI + token ID.", placeholder: "ipfs://your-folder/" },
    ],
  },
  {
    kind: "erc1155",
    label: "ERC-1155 Items",
    plain: "Many item types in one contract, like game items and editions.",
    category: "Contracts",
    color: "bg-emerald-50 border-emerald-200 dark:bg-emerald-400/10 dark:border-emerald-300/25",
    dot: "bg-emerald-500",
    defaults: { uri: "ipfs://your-folder/{id}.json" },
    fields: [
      { key: "uri", label: "Metadata URI", hint: "{id} is replaced per item type.", placeholder: "ipfs://your-folder/{id}.json" },
    ],
  },
  {
    kind: "escrow",
    label: "Escrow Deal",
    plain: "Hold a buyer's payment until the seller delivers.",
    category: "Contracts",
    color: "bg-emerald-50 border-emerald-200 dark:bg-emerald-400/10 dark:border-emerald-300/25",
    dot: "bg-emerald-500",
    defaults: { seller: "", arbiter: "" },
    fields: [
      { key: "seller", label: "Seller address", hint: "Who gets paid on release.", placeholder: "0x..." },
      { key: "arbiter", label: "Arbiter address", hint: "Neutral referee for disputes. Empty = buyer decides.", placeholder: "0x..." },
    ],
  },
  {
    kind: "dao",
    label: "DAO Voting",
    plain: "Proposals, votes and on-chain execution.",
    category: "Contracts",
    color: "bg-emerald-50 border-emerald-200 dark:bg-emerald-400/10 dark:border-emerald-300/25",
    dot: "bg-emerald-500",
    defaults: { votingDays: "3", quorum: "4" },
    fields: [
      { key: "votingDays", label: "Voting lasts (days)", hint: "How long each proposal stays open.", placeholder: "3" },
      { key: "quorum", label: "Quorum (% of members)", hint: "Share of yes-votes needed to pass.", placeholder: "4" },
    ],
  },
  {
    kind: "staking",
    label: "Staking Pool",
    plain: "Users lock ETH and earn rewards over time.",
    category: "Contracts",
    color: "bg-emerald-50 border-emerald-200 dark:bg-emerald-400/10 dark:border-emerald-300/25",
    dot: "bg-emerald-500",
    defaults: { rewardPct: "5", lockDays: "30" },
    fields: [
      { key: "rewardPct", label: "Reward (% of stake)", hint: "Paid on withdraw after the lock ends.", placeholder: "5" },
      { key: "lockDays", label: "Lock for (days)", hint: "Withdraw unlocks after this long.", placeholder: "30" },
    ],
  },
  {
    kind: "marketplace",
    label: "Marketplace",
    plain: "List NFTs at a price; buyers pay, you take a fee.",
    category: "Contracts",
    color: "bg-emerald-50 border-emerald-200 dark:bg-emerald-400/10 dark:border-emerald-300/25",
    dot: "bg-emerald-500",
    defaults: { feeBps: "250" },
    fields: [
      { key: "feeBps", label: "Your fee (basis points)", hint: "250 = 2.5% of every sale.", placeholder: "250" },
    ],
  },
  {
    kind: "customContract",
    label: "Custom Contract",
    plain: "Blank canvas where Logic and Chain blocks do the work.",
    category: "Contracts",
    color: "bg-emerald-50 border-emerald-200 dark:bg-emerald-400/10 dark:border-emerald-300/25",
    dot: "bg-emerald-500",
    defaults: { note: "My first contract" },
    fields: [
      { key: "note", label: "What is it for?", hint: "Saved on-chain as a welcome message.", placeholder: "My first contract" },
    ],
  },

  // ---------------- LOGIC ----------------
  {
    kind: "ifElse",
    label: "If / Else",
    plain: "Do one thing when true, another when false.",
    category: "Logic",
    color: "bg-sky-50 border-sky-200 dark:bg-sky-400/10 dark:border-sky-300/25",
    dot: "bg-sky-500",
    defaults: { condition: "msg.value >= 0.01 ether", thenCode: "value = 1;", elseCode: "value = 0;" },
    fields: [
      { key: "condition", label: "Condition", hint: "Solidity expression, e.g. msg.value >= 0.01 ether.", placeholder: "msg.value >= 0.01 ether" },
      { key: "thenCode", label: "If true, run", hint: "One or more statements.", placeholder: "value = 1;", multiline: true },
      { key: "elseCode", label: "Otherwise, run", hint: "Leave empty for no else-branch.", placeholder: "value = 0;", multiline: true },
    ],
  },
  {
    kind: "requireCheck",
    label: "Require",
    plain: "Stop and revert unless a rule holds.",
    category: "Logic",
    color: "bg-sky-50 border-sky-200 dark:bg-sky-400/10 dark:border-sky-300/25",
    dot: "bg-sky-500",
    defaults: { condition: "msg.value >= 0.01 ether", message: "Send more ETH" },
    fields: [
      { key: "condition", label: "Rule", hint: "Must be true or the call reverts.", placeholder: "msg.value >= 0.01 ether" },
      { key: "message", label: "Error message", hint: "Shown when the rule fails.", placeholder: "Send more ETH" },
    ],
  },
  {
    kind: "mappingVar",
    label: "Mapping",
    plain: "A lookup table, e.g. address → balance.",
    category: "Logic",
    color: "bg-sky-50 border-sky-200 dark:bg-sky-400/10 dark:border-sky-300/25",
    dot: "bg-sky-500",
    defaults: { keyType: "address", valueType: "uint256", name: "balances" },
    fields: [
      { key: "keyType", label: "Key type", hint: "e.g. address.", placeholder: "address" },
      { key: "valueType", label: "Value type", hint: "e.g. uint256.", placeholder: "uint256" },
      { key: "name", label: "Name", hint: "Letters, numbers and _ only.", placeholder: "balances" },
    ],
  },
  {
    kind: "structDef",
    label: "Struct",
    plain: "Bundle fields into one named record.",
    category: "Logic",
    color: "bg-sky-50 border-sky-200 dark:bg-sky-400/10 dark:border-sky-300/25",
    dot: "bg-sky-500",
    defaults: { structName: "Deal", fields: "address buyer;\nuint256 amount;" },
    fields: [
      { key: "structName", label: "Struct name", hint: "Capitalized, e.g. Deal.", placeholder: "Deal" },
      { key: "fields", label: "Fields (one per line)", hint: "e.g. address buyer;", placeholder: "address buyer;\nuint256 amount;", multiline: true },
    ],
  },
  {
    kind: "loop",
    label: "Loop",
    plain: "Repeat an action a fixed number of times.",
    category: "Logic",
    color: "bg-sky-50 border-sky-200 dark:bg-sky-400/10 dark:border-sky-300/25",
    dot: "bg-sky-500",
    defaults: { times: "10", body: "total += i;" },
    fields: [
      { key: "times", label: "Repeat up to", hint: "Kept small to save gas (max 100).", placeholder: "10" },
      { key: "body", label: "Repeat this", hint: "Use i as the counter.", placeholder: "total += i;", multiline: true },
    ],
  },
  {
    kind: "modifierDef",
    label: "Modifier",
    plain: "A reusable rule stamped onto functions.",
    category: "Logic",
    color: "bg-sky-50 border-sky-200 dark:bg-sky-400/10 dark:border-sky-300/25",
    dot: "bg-sky-500",
    defaults: { modName: "onlyMember", check: "members[msg.sender]", message: "Not a member" },
    fields: [
      { key: "modName", label: "Modifier name", hint: "e.g. onlyMember.", placeholder: "onlyMember" },
      { key: "check", label: "Must be true", hint: "e.g. members[msg.sender].", placeholder: "members[msg.sender]" },
      { key: "message", label: "Error message", hint: "Shown when it fails.", placeholder: "Not a member" },
    ],
  },
  {
    kind: "eventDef",
    label: "Event",
    plain: "Declare a public log apps can listen to.",
    category: "Logic",
    color: "bg-sky-50 border-sky-200 dark:bg-sky-400/10 dark:border-sky-300/25",
    dot: "bg-sky-500",
    defaults: { eventName: "Paid", params: "address indexed from, uint256 amount" },
    fields: [
      { key: "eventName", label: "Event name", hint: "Capitalized, e.g. Paid.", placeholder: "Paid" },
      { key: "params", label: "Parameters", hint: "e.g. address indexed from, uint256 amount.", placeholder: "address indexed from, uint256 amount" },
    ],
  },
  {
    kind: "functionDef",
    label: "Function",
    plain: "Write your own function, line by line.",
    category: "Logic",
    color: "bg-sky-50 border-sky-200 dark:bg-sky-400/10 dark:border-sky-300/25",
    dot: "bg-sky-500",
    defaults: { funcName: "myAction", payable: "no", body: "value += 1;\nemit Announced(\"tick\", msg.sender);" },
    fields: [
      { key: "funcName", label: "Function name", hint: "e.g. myAction.", placeholder: "myAction" },
      { key: "payable", label: "Accepts ETH? (yes/no)", hint: "yes = payable.", placeholder: "no" },
      { key: "body", label: "Function code", hint: "Statements run when called.", placeholder: "value += 1;", multiline: true },
    ],
  },
  {
    kind: "stateVar",
    label: "State Variable",
    plain: "A number, address or text stored on-chain.",
    category: "Logic",
    color: "bg-sky-50 border-sky-200 dark:bg-sky-400/10 dark:border-sky-300/25",
    dot: "bg-sky-500",
    defaults: { varType: "uint256", varName: "value", initial: "0" },
    fields: [
      { key: "varType", label: "Type", hint: "uint256, address, string, bool…", placeholder: "uint256" },
      { key: "varName", label: "Name", hint: "Letters, numbers and _ only.", placeholder: "value" },
      { key: "initial", label: "Starting value", hint: "Set once at deploy.", placeholder: "0" },
    ],
  },

  // ---------------- SECURITY ----------------
  {
    kind: "ownable",
    label: "Ownable",
    plain: "One owner with exclusive powers + handover.",
    category: "Security",
    color: "bg-amber-50 border-amber-200 dark:bg-amber-400/10 dark:border-amber-300/25",
    dot: "bg-amber-500",
    defaults: {},
    fields: [],
  },
  {
    kind: "accessControl",
    label: "AccessControl",
    plain: "Named roles (e.g. MINTER) granted per wallet.",
    category: "Security",
    color: "bg-amber-50 border-amber-200 dark:bg-amber-400/10 dark:border-amber-300/25",
    dot: "bg-amber-500",
    defaults: { role: "MINTER" },
    fields: [
      { key: "role", label: "Role name", hint: "UPPERCASE, e.g. MINTER.", placeholder: "MINTER" },
    ],
  },
  {
    kind: "reentrancyGuard",
    label: "ReentrancyGuard",
    plain: "Blocks re-entrant attacks on money functions.",
    category: "Security",
    color: "bg-amber-50 border-amber-200 dark:bg-amber-400/10 dark:border-amber-300/25",
    dot: "bg-amber-500",
    defaults: {},
    fields: [],
  },
  {
    kind: "pausable",
    label: "Pausable",
    plain: "Emergency stop switch for the whole contract.",
    category: "Security",
    color: "bg-amber-50 border-amber-200 dark:bg-amber-400/10 dark:border-amber-300/25",
    dot: "bg-amber-500",
    defaults: {},
    fields: [],
  },
  {
    kind: "safeERC20",
    label: "SafeERC20",
    plain: "Token transfers that can't silently fail.",
    category: "Security",
    color: "bg-amber-50 border-amber-200 dark:bg-amber-400/10 dark:border-amber-300/25",
    dot: "bg-amber-500",
    defaults: {},
    fields: [],
  },
  {
    kind: "cei",
    label: "Checks-Effects-Interactions",
    plain: "Enforces the safest ordering pattern in code.",
    category: "Security",
    color: "bg-amber-50 border-amber-200 dark:bg-amber-400/10 dark:border-amber-300/25",
    dot: "bg-amber-500",
    defaults: {},
    fields: [],
  },

  // ---------------- CHAIN ----------------
  {
    kind: "deployConfig",
    label: "Deploy Settings",
    plain: "Send ETH at deploy + leave a note on-chain.",
    category: "Chain",
    color: "bg-violet-50 border-violet-200 dark:bg-violet-400/10 dark:border-violet-300/25",
    dot: "bg-violet-500",
    defaults: { fundingEth: "0", note: "Deployed with EZContract" },
    fields: [
      { key: "fundingEth", label: "Fund with (ETH)", hint: "Sent along with the deploy transaction.", placeholder: "0" },
      { key: "note", label: "Deploy note", hint: "Stored on-chain.", placeholder: "Deployed with EZContract" },
    ],
  },
  {
    kind: "callFunction",
    label: "Call Function",
    plain: "Call any function on another contract.",
    category: "Chain",
    color: "bg-violet-50 border-violet-200 dark:bg-violet-400/10 dark:border-violet-300/25",
    dot: "bg-violet-500",
    defaults: { target: "", signature: "mint(address,uint256)", valueEth: "0" },
    fields: [
      { key: "target", label: "Contract address", hint: "Empty = call fails safely at runtime, not compile time.", placeholder: "0x..." },
      { key: "signature", label: "Function signature", hint: "e.g. mint(address,uint256).", placeholder: "mint(address,uint256)" },
      { key: "valueEth", label: "Send ETH with call", hint: "Usually 0.", placeholder: "0" },
    ],
  },
  {
    kind: "readState",
    label: "Read State",
    plain: "Add a free view-function for a stored value.",
    category: "Chain",
    color: "bg-violet-50 border-violet-200 dark:bg-violet-400/10 dark:border-violet-300/25",
    dot: "bg-violet-500",
    defaults: { varName: "value" },
    fields: [
      { key: "varName", label: "Variable to read", hint: "Must match a State Variable or Mapping block.", placeholder: "value" },
    ],
  },
  {
    kind: "emitChain",
    label: "Emit Event",
    plain: "Post a public update apps and explorers can read.",
    category: "Chain",
    color: "bg-violet-50 border-violet-200 dark:bg-violet-400/10 dark:border-violet-300/25",
    dot: "bg-violet-500",
    defaults: { text: "Something happened" },
    fields: [
      { key: "text", label: "Announcement", hint: "Shows up on Etherscan logs.", placeholder: "Something happened" },
    ],
  },
  {
    kind: "transferEth",
    label: "Transfer ETH",
    plain: "Send native currency to someone automatically.",
    category: "Chain",
    color: "bg-violet-50 border-violet-200 dark:bg-violet-400/10 dark:border-violet-300/25",
    dot: "bg-violet-500",
    defaults: { to: "", amount: "0.01" },
    fields: [
      { key: "to", label: "Send to (address)", hint: "Empty = send back to the caller.", placeholder: "0x..." },
      { key: "amount", label: "Amount (ETH)", hint: "e.g. 0.01.", placeholder: "0.01" },
    ],
  },
  {
    kind: "approveToken",
    label: "Approve Token",
    plain: "Let another app spend your tokens up to a limit.",
    category: "Chain",
    color: "bg-violet-50 border-violet-200 dark:bg-violet-400/10 dark:border-violet-300/25",
    dot: "bg-violet-500",
    defaults: { token: "", spender: "", amount: "100" },
    fields: [
      { key: "token", label: "Token contract", hint: "ERC-20 address.", placeholder: "0x..." },
      { key: "spender", label: "Spender address", hint: "Who may spend.", placeholder: "0x..." },
      { key: "amount", label: "Amount (whole tokens)", hint: "e.g. 100.", placeholder: "100" },
    ],
  },
  {
    kind: "transferToken",
    label: "Transfer Token",
    plain: "Move ERC-20 tokens held by this contract.",
    category: "Chain",
    color: "bg-violet-50 border-violet-200 dark:bg-violet-400/10 dark:border-violet-300/25",
    dot: "bg-violet-500",
    defaults: { token: "", to: "", amount: "10" },
    fields: [
      { key: "token", label: "Token contract", hint: "ERC-20 address.", placeholder: "0x..." },
      { key: "to", label: "Send to (address)", hint: "Recipient.", placeholder: "0x..." },
      { key: "amount", label: "Amount (whole tokens)", hint: "e.g. 10.", placeholder: "10" },
    ],
  },
];

export function findBlock(kind: string): BlockDef | undefined {
  return BLOCKS.find((b) => b.kind === kind);
}

export function getBlock(kind: BlockKind): BlockDef {
  const b = findBlock(kind);
  if (!b) throw new Error(`Unknown block: ${kind}`);
  return b;
}
