// Local fallback generator: turns the block graph into guaranteed-compilable
// Solidity 0.8.20 (self-contained, no imports). The Groq AI path
// (/api/generate) produces richer code; this is the offline safety net.

import type { Edge, Node } from "@xyflow/react";
import { findBlock } from "./blocks";

export interface GenResult {
  solidity: string;
  abi: unknown[];
  contractName: string;
  summary: string[];
  functionList: string[];
  deployValueWei?: string;
}

type Params = Record<string, string>;
function P(n: Node): Params {
  return ((n.data as unknown as { params?: Params })?.params ?? {}) as Params;
}
function kindOf(n: Node): string {
  return (n.data as unknown as { kind?: string })?.kind ?? "";
}

function ident(v: string | undefined, fallback: string): string {
  const s = (v ?? "").trim();
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(s) ? s : fallback;
}
function constIdent(v: string | undefined, fallback: string): string {
  const s = (v ?? "").trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_").replace(/^_+/, "");
  return /^[A-Z_][A-Z0-9_]*$/.test(s) && s.length > 0 ? s : fallback;
}
function posNum(v: string | undefined, fallback: string): string {
  const n = Number(v);
  if (!isFinite(n) || n < 0) return fallback;
  return String(n);
}
function posInt(v: string | undefined, fallback: number, max = Number.MAX_SAFE_INTEGER): number {
  const n = Math.floor(Number(v));
  if (!isFinite(n) || n <= 0) return fallback;
  return Math.min(n, max);
}
function str(v: string | undefined, fallback = ""): string {
  const s = ((v ?? "").trim() || fallback).slice(0, 120);
  return s.replace(/\\/g, "\\\\").replace(/"/g, "");
}
const ADDR = /^0x[a-fA-F0-9]{40}$/;
function ethToWeiStr(eth: string): string {
  const n = Number(eth);
  if (!isFinite(n) || n <= 0) return "0";
  try {
    return (BigInt(Math.round(n * 1e6)) * BigInt(10) ** BigInt(12)).toString();
  } catch {
    return "0";
  }
}

function topoOrder(nodes: Node[], edges: Edge[]): Node[] {
  const indeg = new Map<string, number>();
  const adj = new Map<string, string[]>();
  nodes.forEach((n) => {
    indeg.set(n.id, 0);
    adj.set(n.id, []);
  });
  edges.forEach((e) => {
    if (!indeg.has(e.source) || !indeg.has(e.target)) return;
    adj.get(e.source)!.push(e.target);
    indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
  });
  const q: string[] = [];
  indeg.forEach((v, k) => {
    if (v === 0) q.push(k);
  });
  const order: string[] = [];
  while (q.length) {
    const cur = q.shift()!;
    order.push(cur);
    for (const nxt of adj.get(cur) ?? []) {
      indeg.set(nxt, indeg.get(nxt)! - 1);
      if (indeg.get(nxt) === 0) q.push(nxt);
    }
  }
  nodes.forEach((n) => {
    if (!order.includes(n.id)) order.push(n.id);
  });
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return order.map((id) => byId.get(id)!).filter(Boolean);
}

const labelOf = (n: Node): string => findBlock(kindOf(n))?.label ?? kindOf(n);

export function generateSolidity(nodes: Node[], edges: Edge[], name = "EZContract"): GenResult {
  const contractName = (name || "EZContract").replace(/[^A-Za-z0-9_]/g, "") || "EZContract";
  const ordered = topoOrder(nodes, edges);
  const kinds = ordered.map(kindOf);
  const has = (k: string) => kinds.includes(k);
  const first = (k: string): Params => {
    const n = ordered.find((x) => kindOf(x) === k);
    return n ? P(n) : {};
  };
  const all = (k: string): Params[] => ordered.filter((x) => kindOf(x) === k).map(P);

  // ---- base contract ----
  const baseNode = ordered.find((n) => findBlock(kindOf(n))?.category === "Contracts");
  const base = baseNode ? kindOf(baseNode) : "customContract";
  const bp: Params = baseNode ? P(baseNode) : {};

  // ---- security flags ----
  const reentrancy = has("reentrancyGuard");
  const pausable = has("pausable");
  const safeErc20 = has("safeERC20");
  const cei = has("cei");
  const roles = [...new Set(all("accessControl").map((p) => constIdent(p.role, "MINTER") + "_ROLE"))];
  const GUARD = reentrancy ? " nonReentrant" : "";
  const PAUSE = pausable ? " whenNotPaused" : "";

  // ---- deploy config ----
  const dc = first("deployConfig");
  const fundingEth = posNum(dc.fundingEth ?? "0", "0");
  const deployNote = str(dc.note ?? (bp.note as string) ?? "Built with EZContract");

  const summary: string[] = [];
  const state: string[] = [];
  const ctor: string[] = [];
  const funcs: string[] = [];
  const abi: unknown[] = [
    { type: "constructor", inputs: [], stateMutability: "payable" },
    { type: "receive", stateMutability: "payable" },
  ];
  const functionList: string[] = [];

  const pushFn = (abiEntry: unknown, sig: string) => {
    abi.push(abiEntry);
    functionList.push(sig);
  };

  // ================= CORE (always) =================
  state.push(
    "    address public owner;",
    "    string public welcome;",
    "    uint256 public value;",
    "    uint256 public totalReceived;"
  );
  ctor.push('        owner = msg.sender;', `        welcome = "${deployNote}";`);
  summary.push(`Base: ${findBlock(base)?.label ?? "Custom Contract"}`);

  // ================= BASE TEMPLATES =================
  if (base === "erc20") {
    const tName = str(bp.name, "EZ Token");
    const tSym = str(bp.symbol, "EZT").toUpperCase().slice(0, 12) || "EZT";
    const supply = posNum(bp.supply, "1000000");
    summary.push(`ERC-20 ${tName} (${tSym}), supply ${supply} to you`);
    state.push(
      "    uint8 public constant decimals = 18;",
      "    uint256 public totalSupply;",
      "    mapping(address => uint256) public balanceOf;",
      "    mapping(address => mapping(address => uint256)) public allowance;",
      "    event Transfer(address indexed from, address indexed to, uint256 value);",
      "    event Approval(address indexed owner_, address indexed spender, uint256 value);"
    );
    ctor.push(
      `        totalSupply = ${supply} * 1e18;`,
      "        balanceOf[msg.sender] = totalSupply;",
      "        emit Transfer(address(0), msg.sender, totalSupply);"
    );
    funcs.push(
      `    function transfer(address to, uint256 amount) public${PAUSE}${GUARD} returns (bool) {`,
      '        require(to != address(0), "Zero address");',
      '        require(balanceOf[msg.sender] >= amount, "Too low");',
      "        balanceOf[msg.sender] -= amount;",
      "        balanceOf[to] += amount;",
      "        emit Transfer(msg.sender, to, amount);",
      "        return true;",
      "    }",
      `    function approve(address spender, uint256 amount) public${PAUSE} returns (bool) {`,
      "        allowance[msg.sender][spender] = amount;",
      "        emit Approval(msg.sender, spender, amount);",
      "        return true;",
      "    }",
      `    function transferFrom(address from, address to, uint256 amount) public${PAUSE}${GUARD} returns (bool) {`,
      '        require(allowance[from][msg.sender] >= amount, "No allowance");',
      '        require(balanceOf[from] >= amount, "Too low");',
      "        allowance[from][msg.sender] -= amount;",
      "        balanceOf[from] -= amount;",
      "        balanceOf[to] += amount;",
      "        emit Transfer(from, to, amount);",
      "        return true;",
      "    }",
      `    function mint(address to, uint256 amount) public onlyOwner${PAUSE} {`,
      '        require(to != address(0), "Zero address");',
      "        totalSupply += amount;",
      "        balanceOf[to] += amount;",
      "        emit Transfer(address(0), to, amount);",
      "    }"
    );
    pushFn({ type: "function", name: "transfer", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "nonpayable" }, "transfer(address,uint256)");
    pushFn({ type: "function", name: "mint", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [], stateMutability: "nonpayable" }, "mint(address,uint256)");
  } else if (base === "erc721") {
    const cName = str(bp.name, "EZ Collectible");
    const cSym = str(bp.symbol, "EZC").toUpperCase().slice(0, 12) || "EZC";
    const uri = str(bp.baseURI, "ipfs://your-folder/");
    summary.push(`ERC-721 ${cName} (${cSym})`);
    state.push(
      "    uint256 public nextId = 1;",
      `    string public baseURI = "${uri}";`,
      "    mapping(uint256 => address) public ownerOf;",
      "    mapping(address => uint256) public balanceOf;",
      "    event Transfer(address indexed from, address indexed to, uint256 indexed id);"
    );
    funcs.push(
      "    function _toString(uint256 v) internal pure returns (string memory) {",
      '        if (v == 0) return "0";',
      "        uint256 len = 0;",
      "        uint256 x = v;",
      "        while (x > 0) { len++; x /= 10; }",
      "        bytes memory b = new bytes(len);",
      "        while (v > 0) { len--; b[len] = bytes1(uint8(48 + (v % 10))); v /= 10; }",
      "        return string(b);",
      "    }",
      "    function tokenURI(uint256 id) public view returns (string memory) {",
      '        require(ownerOf[id] != address(0), "No token");',
      "        return string(abi.encodePacked(baseURI, _toString(id)));",
      "    }",
      `    function mint(address to) public onlyOwner${PAUSE} returns (uint256) {`,
      '        require(to != address(0), "Zero address");',
      "        uint256 id = nextId++;",
      "        ownerOf[id] = to;",
      "        balanceOf[to] += 1;",
      "        emit Transfer(address(0), to, id);",
      "        return id;",
      "    }",
      `    function transferFrom(address from, address to, uint256 id) public${PAUSE}${GUARD} {`,
      '        require(ownerOf[id] == from, "Not owner");',
      '        require(msg.sender == from || msg.sender == owner, "Not allowed");',
      '        require(to != address(0), "Zero address");',
      "        ownerOf[id] = to;",
      "        balanceOf[from] -= 1;",
      "        balanceOf[to] += 1;",
      "        emit Transfer(from, to, id);",
      "    }"
    );
    pushFn({ type: "function", name: "mint", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "nonpayable" }, "mint(address)");
  } else if (base === "erc1155") {
    const uri = str(bp.uri, "ipfs://your-folder/{id}.json");
    summary.push("ERC-1155 multi-item contract");
    state.push(
      `    string public metadataURI = "${uri}";`,
      "    mapping(uint256 => mapping(address => uint256)) public balanceOf;",
      "    event TransferSingle(address indexed op, address indexed from, address indexed to, uint256 id, uint256 amount);"
    );
    funcs.push(
      `    function mint(address to, uint256 id, uint256 amount) public onlyOwner${PAUSE} {`,
      '        require(to != address(0), "Zero address");',
      "        balanceOf[id][to] += amount;",
      "        emit TransferSingle(msg.sender, address(0), to, id, amount);",
      "    }",
      `    function transfer(address to, uint256 id, uint256 amount) public${PAUSE}${GUARD} {`,
      '        require(balanceOf[id][msg.sender] >= amount, "Too low");',
      '        require(to != address(0), "Zero address");',
      "        balanceOf[id][msg.sender] -= amount;",
      "        balanceOf[id][to] += amount;",
      "        emit TransferSingle(msg.sender, msg.sender, to, id, amount);",
      "    }"
    );
    pushFn({ type: "function", name: "mint", inputs: [{ type: "address" }, { type: "uint256" }, { type: "uint256" }], outputs: [], stateMutability: "nonpayable" }, "mint(address,uint256,uint256)");
  } else if (base === "escrow") {
    const sellerRaw = (bp.seller ?? "").trim();
    const arbiterRaw = (bp.arbiter ?? "").trim();
    const seller = ADDR.test(sellerRaw) ? sellerRaw : "address(0)";
    const arbiter = ADDR.test(arbiterRaw) ? arbiterRaw : "address(0)";
    if (!ADDR.test(sellerRaw)) summary.push("Warning: seller address empty. Fund and set parties before release");
    else summary.push(`Escrow: seller ${sellerRaw.slice(0, 10)}…`);
    if (ADDR.test(arbiterRaw)) summary.push(`Arbiter ${arbiterRaw.slice(0, 10)}… can settle disputes`);
    state.push(
      "    address public buyer;",
      "    address public seller;",
      "    address public arbiter;",
      "    uint256 public price;",
      "    bool public funded;",
      "    bool public settled;",
      "    event Funded(address indexed buyer, uint256 amount);",
      "    event Released(address indexed to, uint256 amount);"
    );
    ctor.push(`        seller = ${seller};`, `        arbiter = ${arbiter};`);
    funcs.push(
      `    function fund() public payable${PAUSE}${GUARD} {`,
      '        require(!funded, "Already funded");',
      '        require(msg.value > 0, "Send ETH");',
      "        buyer = msg.sender;",
      "        price = msg.value;",
      "        funded = true;",
      "        emit Funded(msg.sender, msg.value);",
      "    }",
      `    function release() public${GUARD} {`,
      '        require(funded && !settled, "Bad state");',
      '        require(msg.sender == buyer || msg.sender == arbiter || msg.sender == owner, "Not allowed");',
      '        require(seller != address(0), "No seller");',
      "        settled = true;",
      "        (bool ok, ) = payable(seller).call{value: price}(\"\");",
      '        require(ok, "Payout failed");',
      "        emit Released(seller, price);",
      "    }",
      `    function refund() public${GUARD} {`,
      '        require(funded && !settled, "Bad state");',
      '        require(msg.sender == seller || msg.sender == arbiter || msg.sender == owner, "Not allowed");',
      "        settled = true;",
      "        (bool ok, ) = payable(buyer).call{value: price}(\"\");",
      '        require(ok, "Refund failed");',
      "        emit Released(buyer, price);",
      "    }"
    );
    pushFn({ type: "function", name: "fund", inputs: [], outputs: [], stateMutability: "payable" }, "fund()");
    pushFn({ type: "function", name: "release", inputs: [], outputs: [], stateMutability: "nonpayable" }, "release()");
    pushFn({ type: "function", name: "refund", inputs: [], outputs: [], stateMutability: "nonpayable" }, "refund()");
  } else if (base === "dao") {
    const days = posNum(bp.votingDays, "3");
    const quorum = posInt(bp.quorum, 4, 100);
    summary.push(`DAO: ${days}-day votes, ${quorum}% yes-quorum`);
    state.push(
      "    struct Proposal { string desc; uint256 yes; uint256 no; uint256 deadline; bool done; }",
      "    uint256 public proposalCount;",
      "    mapping(uint256 => Proposal) public proposals;",
      "    mapping(uint256 => mapping(address => bool)) public voted;",
      `    uint256 public quorumPct = ${quorum};`,
      "    address[] public members;",
      "    mapping(address => bool) public isMember;",
      "    event Proposed(uint256 indexed id, string desc);",
      "    event Voted(uint256 indexed id, address indexed voter, bool support);"
    );
    ctor.push("        members.push(msg.sender);", "        isMember[msg.sender] = true;");
    funcs.push(
      "    function memberCount() public view returns (uint256) { return members.length; }",
      `    function join() public${PAUSE} {`,
      '        require(!isMember[msg.sender], "Already member");',
      "        isMember[msg.sender] = true;",
      "        members.push(msg.sender);",
      "    }",
      `    function propose(string memory desc) public${PAUSE} returns (uint256) {`,
      '        require(isMember[msg.sender], "Members only");',
      '        require(bytes(desc).length > 0, "Empty");',
      "        proposalCount += 1;",
      `        proposals[proposalCount] = Proposal(desc, 0, 0, block.timestamp + (${days} * 1 days), false);`,
      "        emit Proposed(proposalCount, desc);",
      "        return proposalCount;",
      "    }",
      `    function vote(uint256 id, bool support) public${PAUSE} {`,
      '        require(isMember[msg.sender], "Members only");',
      "        Proposal storage p = proposals[id];",
      '        require(p.deadline > 0 && block.timestamp < p.deadline, "Closed");',
      '        require(!voted[id][msg.sender], "Voted");',
      "        voted[id][msg.sender] = true;",
      "        if (support) { p.yes += 1; } else { p.no += 1; }",
      "        emit Voted(id, msg.sender, support);",
      "    }",
      `    function passed(uint256 id) public view returns (bool) {`,
      "        Proposal storage p = proposals[id];",
      "        if (p.deadline == 0 || block.timestamp < p.deadline) return false;",
      "        return p.yes * 100 >= quorumPct * members.length && p.yes > p.no;",
      "    }"
    );
    pushFn({ type: "function", name: "propose", inputs: [{ type: "string" }], outputs: [{ type: "uint256" }], stateMutability: "nonpayable" }, "propose(string)");
    pushFn({ type: "function", name: "vote", inputs: [{ type: "uint256" }, { type: "bool" }], outputs: [], stateMutability: "nonpayable" }, "vote(uint256,bool)");
  } else if (base === "staking") {
    const pct = posInt(bp.rewardPct, 5, 100);
    const lock = posNum(bp.lockDays, "30");
    summary.push(`Staking: ${pct}% reward after ${lock} days (fund the pool first)`);
    state.push(
      "    mapping(address => uint256) public staked;",
      "    mapping(address => uint256) public stakedAt;",
      `    uint256 public rewardPct = ${pct};`,
      `    uint256 public lockSecs = ${lock} * 1 days;`,
      "    event Staked(address indexed user, uint256 amount);",
      "    event Unstaked(address indexed user, uint256 amount, uint256 reward);"
    );
    funcs.push(
      "    function fundPool() public payable { }",
      `    function stake() public payable${PAUSE}${GUARD} {`,
      '        require(msg.value > 0, "Send ETH");',
      '        require(staked[msg.sender] == 0, "Already staking");',
      "        staked[msg.sender] = msg.value;",
      "        stakedAt[msg.sender] = block.timestamp;",
      "        emit Staked(msg.sender, msg.value);",
      "    }",
      `    function withdraw() public${GUARD} {`,
      "        uint256 amt = staked[msg.sender];",
      '        require(amt > 0, "Nothing staked");',
      '        require(block.timestamp >= stakedAt[msg.sender] + lockSecs, "Still locked");',
      "        uint256 reward = (amt * rewardPct) / 100;",
      "        staked[msg.sender] = 0;",
      '        require(address(this).balance >= amt + reward, "Pool empty");',
      "        (bool ok, ) = payable(msg.sender).call{value: amt + reward}(\"\");",
      '        require(ok, "Payout failed");',
      "        emit Unstaked(msg.sender, amt, reward);",
      "    }"
    );
    pushFn({ type: "function", name: "stake", inputs: [], outputs: [], stateMutability: "payable" }, "stake()");
    pushFn({ type: "function", name: "withdraw", inputs: [], outputs: [], stateMutability: "nonpayable" }, "withdraw()");
  } else if (base === "marketplace") {
    const fee = posInt(bp.feeBps, 250, 10000);
    summary.push(`Marketplace: ${fee / 100}% fee on each sale (sellers approve first)`);
    state.push(
      "    struct Listing { address seller; address nft; uint256 tokenId; uint256 price; bool active; }",
      "    uint256 public listingCount;",
      "    mapping(uint256 => Listing) public listings;",
      `    uint256 public feeBps = ${fee};`,
      "    event Listed(uint256 indexed id, address indexed seller, uint256 price);",
      "    event Sold(uint256 indexed id, address indexed buyer, uint256 price);"
    );
    funcs.push(
      `    function list(address nft, uint256 tokenId, uint256 price) public${PAUSE} returns (uint256) {`,
      '        require(price > 0, "Bad price");',
      "        listingCount += 1;",
      "        listings[listingCount] = Listing(msg.sender, nft, tokenId, price, true);",
      "        emit Listed(listingCount, msg.sender, price);",
      "        return listingCount;",
      "    }",
      `    function buy(uint256 id) public payable${PAUSE}${GUARD} {`,
      "        Listing storage l = listings[id];",
      '        require(l.active, "Not for sale");',
      '        require(msg.value >= l.price, "Too little");',
      "        l.active = false;",
      "        uint256 fee = (l.price * feeBps) / 10000;",
      "        IEZNFTWrap(l.nft).transferFrom(l.seller, msg.sender, l.tokenId);",
      "        (bool a, ) = payable(l.seller).call{value: l.price - fee}(\"\");",
      '        require(a, "Seller payout failed");',
      "        (bool b, ) = payable(owner).call{value: fee}(\"\");",
      '        require(b, "Fee payout failed");',
      "        if (msg.value > l.price) {",
      "            (bool c, ) = payable(msg.sender).call{value: msg.value - l.price}(\"\");",
      '            require(c, "Refund failed");',
      "        }",
      "        emit Sold(id, msg.sender, l.price);",
      "    }",
      `    function cancel(uint256 id) public {`,
      "        Listing storage l = listings[id];",
      '        require(l.active, "Not active");',
      '        require(msg.sender == l.seller || msg.sender == owner, "Not allowed");',
      "        l.active = false;",
      "    }"
    );
    pushFn({ type: "function", name: "list", inputs: [{ type: "address" }, { type: "uint256" }, { type: "uint256" }], outputs: [{ type: "uint256" }], stateMutability: "nonpayable" }, "list(address,uint256,uint256)");
    pushFn({ type: "function", name: "buy", inputs: [{ type: "uint256" }], outputs: [], stateMutability: "payable" }, "buy(uint256)");
  } else {
    summary.push(`Custom: "${deployNote}"`);
  }

  // ================= SECURITY CORE =================
  const secLines: string[] = [
    "    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);",
    "    modifier onlyOwner() {",
    '        require(msg.sender == owner, "Not owner");',
    "        _;",
    "    }",
    "    function transferOwnership(address n) public onlyOwner {",
    '        require(n != address(0), "Zero address");',
    "        emit OwnershipTransferred(owner, n);",
    "        owner = n;",
    "    }",
  ];
  pushFn({ type: "function", name: "transferOwnership", inputs: [{ type: "address" }], outputs: [], stateMutability: "nonpayable" }, "transferOwnership(address)");

  if (has("ownable")) {
    summary.push("Ownable: full ownership pattern on");
    secLines.push(
      "    function renounceOwnership() public onlyOwner {",
      "        emit OwnershipTransferred(owner, address(0));",
      "        owner = address(0);",
      "    }"
    );
  } else {
    summary.push("Owner admin (built-in)");
  }

  if (roles.length) {
    summary.push(`AccessControl: role${roles.length > 1 ? "s" : ""} ${roles.join(", ")}`);
    secLines.push(
      "    bytes32 public constant DEFAULT_ADMIN_ROLE = bytes32(0);",
      ...roles.map((r) => `    bytes32 public constant ${r} = keccak256("${r}");`),
      "    mapping(bytes32 => mapping(address => bool)) private _roles;",
      "    event RoleGranted(bytes32 indexed role, address indexed to);",
      "    event RoleRevoked(bytes32 indexed role, address indexed from);",
      "    modifier onlyRole(bytes32 role) {",
      '        require(_roles[role][msg.sender], "Missing role");',
      "        _;",
      "    }",
      "    function grantRole(bytes32 role, address to) public onlyOwner {",
      "        _roles[role][to] = true;",
      "        emit RoleGranted(role, to);",
      "    }",
      "    function revokeRole(bytes32 role, address from) public onlyOwner {",
      "        _roles[role][from] = false;",
      "        emit RoleRevoked(role, from);",
      "    }"
    );
    ctor.push("        _roles[DEFAULT_ADMIN_ROLE][msg.sender] = true;");
    pushFn({ type: "function", name: "grantRole", inputs: [{ type: "bytes32" }, { type: "address" }], outputs: [], stateMutability: "nonpayable" }, "grantRole(bytes32,address)");
  }

  if (reentrancy) {
    summary.push("ReentrancyGuard: money functions locked");
    secLines.push(
      "    uint256 private _locked = 1;",
      "    modifier nonReentrant() {",
      '        require(_locked == 1, "Reentrant");',
      "        _locked = 2;",
      "        _;",
      "        _locked = 1;",
      "    }"
    );
  }

  if (pausable) {
    summary.push("Pausable: emergency stop on");
    secLines.push(
      "    bool public paused;",
      "    event Paused(address indexed by);",
      "    event Unpaused(address indexed by);",
      "    modifier whenNotPaused() {",
      '        require(!paused, "Paused");',
      "        _;",
      "    }",
      "    function pause() public onlyOwner {",
      "        paused = true;",
      "        emit Paused(msg.sender);",
      "    }",
      "    function unpause() public onlyOwner {",
      "        paused = false;",
      "        emit Unpaused(msg.sender);",
      "    }"
    );
    pushFn({ type: "function", name: "pause", inputs: [], outputs: [], stateMutability: "nonpayable" }, "pause()");
  }

  let tokenHelper = "";
  if (safeErc20) {
    summary.push("SafeERC20: token calls verified");
    tokenHelper = [
      "    function _safeTokenTransfer(address token, address to, uint256 amount) internal {",
      '        (bool ok, bytes memory ret) = token.call(abi.encodeWithSignature("transfer(address,uint256)", to, amount));',
      '        require(ok && (ret.length == 0 || abi.decode(ret, (bool))), "Token transfer failed");',
      "    }",
      "    function _safeTokenApprove(address token, address spender, uint256 amount) internal {",
      '        (bool ok, bytes memory ret) = token.call(abi.encodeWithSignature("approve(address,uint256)", spender, amount));',
      '        require(ok && (ret.length == 0 || abi.decode(ret, (bool))), "Approve failed");',
      "    }",
    ].join("\n");
  }
  const needTokenIface =
    (has("approveToken") || has("transferToken")) && !safeErc20;
  const tokenIface = needTokenIface
    ? "    interface IEZToken { function transfer(address,uint256) external returns (bool); function approve(address,uint256) external returns (bool); }"
    : "";

  // ================= LOGIC DECLARATIONS =================
  const declaredVars = new Map<string, { type: string; isMapping: boolean; keyType?: string }>();
  declaredVars.set("value", { type: "uint256", isMapping: false });

  for (const n of ordered) {
    const k = kindOf(n);
    const p = P(n);
    if (k === "stateVar") {
      const t = (p.varType || "uint256").trim() || "uint256";
      const v = ident(p.varName, "");
      if (!v) {
        summary.push("Skipped a State Variable with no name");
        continue;
      }
      state.push(`    ${t} public ${v};`);
      const init = (p.initial ?? "").trim();
      if (init) ctor.push(`        ${v} = ${init};`);
      declaredVars.set(v, { type: t, isMapping: false });
      summary.push(`Store: ${t} ${v}`);
    } else if (k === "mappingVar") {
      const kt = (p.keyType || "address").trim() || "address";
      const vt = (p.valueType || "uint256").trim() || "uint256";
      const v = ident(p.name, "");
      if (!v) {
        summary.push("Skipped a Mapping with no name");
        continue;
      }
      state.push(`    mapping(${kt} => ${vt}) public ${v};`);
      declaredVars.set(v, { type: vt, isMapping: true, keyType: kt });
      summary.push(`Lookup: ${kt} → ${vt} (${v})`);
    } else if (k === "structDef") {
      const s = ident(p.structName, "");
      const fields = (p.fields ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
      if (!s || !fields.length) {
        summary.push("Skipped an empty Struct");
        continue;
      }
      state.push(`    struct ${s} {`, ...fields.map((f) => `        ${f}`), "    }");
      summary.push(`Record: ${s} (${fields.length} fields)`);
    } else if (k === "eventDef") {
      const e = ident(p.eventName, "");
      const params = (p.params ?? "").trim();
      if (!e) {
        summary.push("Skipped an Event with no name");
        continue;
      }
      state.push(`    event ${e}(${params});`);
      summary.push(`Log: ${e}`);
    } else if (k === "modifierDef") {
      const m = ident(p.modName, "");
      const check = (p.check ?? "").trim() || "true";
      if (!m) {
        summary.push("Skipped a Modifier with no name");
        continue;
      }
      state.push(
        `    modifier ${m}() {`,
        `        require(${check}, "${str(p.message, "Blocked")}");`,
        "        _;",
        "    }"
      );
      summary.push(`Rule stamp: ${m}`);
    } else if (k === "loop") {
      if (!state.some((l) => l.includes("loopCount"))) state.push("    uint256 public loopCount;");
    }
  }

  // custom functions (verbatim bodies = author's responsibility)
  for (const n of ordered) {
    if (kindOf(n) !== "functionDef") continue;
    const p = P(n);
    const f = ident(p.funcName, "");
    if (!f) {
      summary.push("Skipped a Function with no name");
      continue;
    }
    const pay = (p.payable ?? "no").trim().toLowerCase().startsWith("y") ? " payable" : "";
    const body = (p.body ?? "").split("\n").map((l) => `        ${l}`).join("\n");
    funcs.push(`    function ${f}() public${pay}${PAUSE} {`, body, "    }");
    pushFn(
      { type: "function", name: f, inputs: [], outputs: [], stateMutability: pay ? "payable" : "nonpayable" },
      `${f}()`
    );
    summary.push(`Function: ${f}()${pay ? " (payable)" : ""}`);
  }

  // read-state getters (only when the variable exists — keeps output compilable)
  const seenGetters = new Set<string>();
  for (const n of ordered) {
    if (kindOf(n) !== "readState") continue;
    const v = ident(P(n).varName, "");
    if (!v || seenGetters.has(v)) continue;
    const decl = declaredVars.get(v);
    if (!decl) {
      summary.push(`Skipped Read of "${P(n).varName}" (no matching variable)`);
      continue;
    }
    seenGetters.add(v);
    if (decl.isMapping) {
      funcs.push(
        `    function get_${v}(${decl.keyType} k) public view returns (${decl.type}) {`,
        `        return ${v}[k];`,
        "    }"
      );
      pushFn({ type: "function", name: `get_${v}`, inputs: [{ type: decl.keyType }], outputs: [{ type: decl.type }], stateMutability: "view" }, `get_${v}()`);
    } else {
      funcs.push(
        `    function get_${v}() public view returns (${decl.type}) {`,
        `        return ${v};`,
        "    }"
      );
      pushFn({ type: "function", name: `get_${v}`, inputs: [], outputs: [{ type: decl.type }], stateMutability: "view" }, `get_${v}()`);
    }
    summary.push(`Reader: get_${v}()`);
  }

  // ================= RUNFLOW (ordered action statements) =================
  // chunks keep canvas order; CEI mode re-sorts into checks → mains → externals → emits
  const chunks: { part: "check" | "main" | "external" | "emit"; lines: string[] }[] = [];
  let flowCount = 0;

  for (const n of ordered) {
    const k = kindOf(n);
    const p = P(n);
    if (k === "requireCheck") {
      const cond = (p.condition ?? "").trim() || "true";
      chunks.push({ part: "check", lines: [`        require(${cond}, "${str(p.message, "Blocked")}");`] });
      flowCount++;
      summary.push(`Require: ${cond.slice(0, 48)}`);
    } else if (k === "ifElse") {
      const cond = (p.condition ?? "").trim() || "true";
      const t = (p.thenCode ?? "").split("\n").map((l) => `            ${l}`).join("\n");
      const e = (p.elseCode ?? "").trim();
      chunks.push({
        part: "main",
        lines: [`        if (${cond}) {`, t, e ? "        } else {" : "        }", ...(e ? [...e.split("\n").map((l) => `            ${l}`), "        }"] : [])],
      });
      flowCount++;
      summary.push(`Branch: if ${cond.slice(0, 40)}…`);
    } else if (k === "loop") {
      const times = posInt(p.times, 10, 100);
      const body = (p.body ?? "loopCount += 1;").split("\n").map((l) => `            ${l}`).join("\n");
      chunks.push({ part: "main", lines: [`        for (uint256 i = 0; i < ${times}; i++) {`, body, "        }"] });
      flowCount++;
      summary.push(`Loop ×${times}`);
    } else if (k === "transferEth") {
      const amt = posNum(p.amount, "0.01");
      const toRaw = (p.to ?? "").trim();
      const to = ADDR.test(toRaw) ? `payable(${toRaw})` : "payable(msg.sender)";
      if (!ADDR.test(toRaw)) summary.push(`Send ${amt} ETH to caller (set an address to change)`);
      else summary.push(`Send ${amt} ETH to ${toRaw.slice(0, 10)}…`);
      chunks.push({
        part: "external",
        lines: [`        (bool _sent, ) = ${to}.call{value: ${amt} ether}("");`, '        require(_sent, "ETH transfer failed");'],
      });
      flowCount++;
    } else if (k === "callFunction") {
      const sig = (p.signature ?? "").trim() || "mint(address,uint256)";
      const v = posNum(p.valueEth, "0");
      const val = v === "0" ? "0" : `${v} ether`;
      const tgtRaw = (p.target ?? "").trim();
      const tgt = ADDR.test(tgtRaw) ? tgtRaw : "address(0)";
      if (!ADDR.test(tgtRaw)) summary.push(`Call "${sig}". Set a target address first`);
      else summary.push(`Call ${sig.slice(0, 40)} on ${tgtRaw.slice(0, 10)}…`);
      chunks.push({
        part: "external",
        lines: [
          `        (bool _ok, ) = ${tgt}.call{value: ${val}}(abi.encodeWithSignature("${sig.replace(/"/g, "")}"));`,
          '        require(_ok, "External call failed");',
        ],
      });
      flowCount++;
    } else if (k === "approveToken") {
      const tokRaw = (p.token ?? "").trim();
      const spRaw = (p.spender ?? "").trim();
      const tok = ADDR.test(tokRaw) ? tokRaw : "address(0)";
      const sp = ADDR.test(spRaw) ? spRaw : "msg.sender";
      const amt = posNum(p.amount, "100");
      if (!ADDR.test(tokRaw) || !ADDR.test(spRaw)) summary.push("Approve: fill token + spender addresses");
      else summary.push(`Approve ${amt} tokens for ${spRaw.slice(0, 10)}…`);
      chunks.push({
        part: "external",
        lines: [
          safeErc20
            ? `        _safeTokenApprove(${tok}, ${sp}, ${amt} * 1e18);`
            : `        require(IEZToken(${tok}).approve(${sp}, ${amt} * 1e18), "Approve failed");`,
        ],
      });
      flowCount++;
    } else if (k === "transferToken") {
      const tokRaw = (p.token ?? "").trim();
      const toRaw = (p.to ?? "").trim();
      const tok = ADDR.test(tokRaw) ? tokRaw : "address(0)";
      const to = ADDR.test(toRaw) ? toRaw : "msg.sender";
      const amt = posNum(p.amount, "10");
      if (!ADDR.test(tokRaw)) summary.push("Token transfer: set the token address");
      else summary.push(`Move ${amt} tokens to ${to === "msg.sender" ? "caller" : to.slice(0, 10) + "…"}`);
      chunks.push({
        part: "external",
        lines: [
          safeErc20
            ? `        _safeTokenTransfer(${tok}, ${to}, ${amt} * 1e18);`
            : `        require(IEZToken(${tok}).transfer(${to}, ${amt} * 1e18), "Token transfer failed");`,
        ],
      });
      flowCount++;
    } else if (k === "emitChain") {
      const t = str(p.text, "Something happened");
      chunks.push({ part: "emit", lines: [`        emit Announced("${t}", msg.sender);`] });
      flowCount++;
      summary.push(`Announce: "${t.slice(0, 40)}"`);
    }
  }

  const orderOf = { check: 0, main: 1, external: 2, emit: 3 } as const;
  const flowBody = (cei ? [...chunks].sort((a, b) => orderOf[a.part] - orderOf[b.part]) : chunks).flatMap((c) => c.lines);

  if (cei && flowCount) summary.push("Ordering: checks → effects → interactions");
  if (has("deployConfig") && fundingEth !== "0") summary.push(`Deploy funds: ${fundingEth} ETH sent at deploy`);

  const flowLines = [
    `    /// @notice Runs your Logic + Chain blocks${cei ? " (checks-effects-interactions order)" : " in canvas order"}.`,
    `    function runFlow() public payable${GUARD}${PAUSE} {`,
    "        if (msg.value > 0) { totalReceived += msg.value; }",
    ...(flowBody.length ? flowBody : ['        emit Announced("ready", msg.sender);']),
    "    }",
  ];
  pushFn({ type: "function", name: "runFlow", inputs: [], outputs: [], stateMutability: "payable" }, "runFlow()");

  // Core sweep (renamed when the base already owns `withdraw`, e.g. staking).
  const sweepName = base === "staking" ? "sweep" : "withdraw";

  // ================= ASSEMBLE =================
  const fileLevel: string[] = [];
  if (tokenIface) fileLevel.push(tokenIface);
  if (base === "marketplace") fileLevel.push("interface IEZNFTWrap { function transferFrom(address, address, uint256) external; }");
  const flowLabel = ordered.map(labelOf).join(" -> ") || "Empty canvas";
  const solidity = `// SPDX-License-Identifier: MIT
// Generated by EZContract (ETHShala) — local template engine.
// Flow: ${flowLabel}
pragma solidity ^0.8.20;

${fileLevel.length ? fileLevel.join("\n") + "\n\n" : ""}contract ${contractName} {
${state.join("\n")}
${secLines.join("\n")}
${tokenHelper ? tokenHelper + "\n" : ""}
    event Announced(string message, address indexed by);

    constructor() payable {
${ctor.join("\n")}
    }

    receive() external payable {
        totalReceived += msg.value;
    }

${flowLines.join("\n")}
${funcs.length ? "\n" + funcs.join("\n") : ""}
    /// @notice Take out plain ETH (owner only).
    function ${sweepName}() public onlyOwner${GUARD} {
        (bool ok, ) = payable(owner).call{value: address(this).balance}("");
        require(ok, "Withdraw failed");
    }

    function version() public pure returns (string memory) {
        return "EZContract/1.0 ETHShala";
    }
}
`;

  // Core sweep helpers.
  pushFn({ type: "function", name: sweepName, inputs: [], outputs: [], stateMutability: "nonpayable" }, `${sweepName}()`);
  pushFn({ type: "function", name: "owner", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" }, "owner()");

  return {
    solidity,
    abi,
    contractName,
    summary,
    functionList,
    deployValueWei: ethToWeiStr(fundingEth),
  };
}

export function buildDeployScript(contractName: string): string {
  return `// Run: node deploy.js  (needs ethers + a Sepolia RPC + private key in .env)
// npm i ethers dotenv
require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");

async function main() {
  const artifact = JSON.parse(fs.readFileSync("./artifact.json", "utf8"));
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  console.log("Deploying ${contractName} from", wallet.address);
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const c = await factory.deploy();
  await c.waitForDeployment();
  const addr = await c.getAddress();
  console.log("Deployed at:", addr);
  console.log("Etherscan: https://sepolia.etherscan.io/address/" + addr);
}
main().catch((e) => { console.error(e); process.exit(1); });
`;
}
