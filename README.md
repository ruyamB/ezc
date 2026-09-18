# EZContract by ETHShala

Smart contracts without the scary parts. Describe an idea in plain English or drag
blocks onto a canvas, and EZContract turns it into tested Solidity, then deploys it
to Ethereum Sepolia. Built for people who don't know web3 yet.

Live flow: **landing → `/config` (wallet + AI setup) → `/dashboard` (visual
workspace) → `/export` (code + ABI + .zip) → `/deploy` (Sepolia + Etherscan proof).**

## Features

- **Describe-to-build** — type what you want ("an ERC-20 for my running club");
  Groq AI plans the block graph and writes the contract. Keyword templates + a
  local engine cover you with no key at all.
- **Visual workspace** — 30 blocks across Contracts, Logic, Security and Chain
  toolboxes. Landscape canvas, fullscreen focus mode, collapsible tool dock,
  floating inspector, auto-Run after planning.
- **Built-in wallets** — create an EZ wallet in seconds or import one (private key
  or phrase). Keys are AES-256-GCM encrypted with your password and never leave
  the device. MetaMask works too. EZ wallets **auto-sign** deployments, no popups.
- **One-click deploy** — compiles with solc + optimizer, deploys via your wallet
  (deploy funding supported), returns the ABI plus Etherscan address/tx links.
- **Day/night mode** — full dark theme with system-preference default, persisted.
- **Guardrails** — per-IP rate limits on every AI endpoint, server-side plan
  sanitizing, Groq model fallback list so retired model IDs don't break the app.

## Stack

Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · `@xyflow/react` ·
`ethers` v6 · `solc` · `jszip` · `motion` · `@phosphor-icons/react` · Groq API

## Quickstart

```bash
npm install
npm run dev        # http://localhost:3000
```

Optional AI setup (both work, dashboard key wins for the browser session):

```bash
cp .env.example .env.local
# GROQ_API_KEY=gsk_...        # get one at https://console.groq.com
# GROQ_MODEL=...              # comma-separated override, tried in order
```

```bash
npm run build      # production build
npm start          # serve it
node scripts/gen-test.mjs   # compile-test every generator template with solc
```

## Routes

| Route      | What it does                                                        |
| ---------- | ------------------------------------------------------------------- |
| `/`        | Landing: hero, why-it-exists, how-it-works, templates, footer       |
| `/config`  | Wallet setup/import/faucet, Groq key, system-check gate to studio   |
| `/dashboard` | Fullscreen canvas + dock, describe bar, Run, Export/Deploy buttons |
| `/export`  | Contract.sol / ABI / folder tabs, copy ABI, download `.zip`         |
| `/deploy`  | Compile, auto-sign + send, Etherscan address + transaction links    |
| `/api/generate` | blocks → Solidity (Groq, 10/min/IP)                           |
| `/api/plan`     | text → block graph (Groq, 10/min/IP)                          |
| `/api/validate-key` | zero-cost Groq key check (10/min/IP)                      |
| `/api/compile`  | solc compile → ABI + bytecode (30/min/IP)                     |

## Security model

- Embedded keys: PBKDF2-SHA256 (210k rounds) → AES-256-GCM, ciphertext only in
  `localStorage`. Plaintext lives in memory and is wiped on lock/refresh.
- API keys travel over TLS to our endpoints and are forwarded to Groq, never
  logged or stored. `/api/validate-key` uses the zero-cost models endpoint.
- No mainnet anywhere: Sepolia testnet only, hardcoded explorer links.
- Smart-contract output is beginner-audited template code, not a substitute for
  a professional audit before real value is involved.

## Project layout

```
src/app/                  landing + (studio) route group + api routes
src/components/landing/   nav, hero, about, how-it-works, footer
src/components/dashboard/ wallet bar, AI settings, canvas builder
src/lib/                  blocks catalog, solidity generator, groq client,
                          embedded-wallet crypto, wallet provider, project
                          store, rate limiter, text planner, zip export
scripts/gen-test.mjs      solc compile tests for all generator templates
```

## Deploy

Vercel is the reference target: import the repo, keep all build defaults, set
`GROQ_API_KEY` (optional, enables AI without a per-user key) and deploy.
No other environment variables are required.

## License

MIT. Built with care by ETHShala for the next million onchain builders.
