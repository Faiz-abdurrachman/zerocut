<<<<<<< HEAD
# brief Protocol

> Trustless freelance escrow with AI dispute resolution, built on Monad

Freelancer kehilangan hingga 30% income karena platform fee dan dispute yang tidak adil. brief menggantikan middleman dengan smart contract di Monad dan AI sebagai hakim netral — bukan platform, bukan manusia yang bisa di-lobby.

---

## Problem yang Diselesaikan

| Problem | Solusi brief |
|---|---|
| Platform fee 20-30% | 0% fee — semua income langsung ke freelancer |
| Client kabur setelah DP | Dana dikunci di smart contract, bukan di platform |
| Freelancer tidak dibayar setelah kerja | Approval = release instan, 0.8s finality di Monad |
| Dispute tidak ada resolusi netral | AI evaluasi berdasarkan brief yang sudah disepakati |

---

## Demo

**Live App:** `[deploy ke Vercel dulu]`

**Contract:** [`0x852C1aC9C68Df4BBf0133dd859ec866b1E69BA90`](https://testnet.monadscan.com/address/0x852C1aC9C68Df4BBf0133dd859ec866b1E69BA90)

**Network:** Monad Testnet (Chain ID: 10143)

---

## Cara Kerja

### Happy Path
```
Client create job + lock MON
    ↓
Freelancer accept + submit work URL
    ↓
Client approve → dana release instan ke freelancer
```

### Dispute Path (Core Innovation)
```
Client diam setelah work disubmit
    ↓
Freelancer trigger dispute (setelah timeout)
    ↓
AI (Gemini) evaluasi: apakah work sesuai brief?
    ↓
Verdict (RELEASE / REFUND / SPLIT) disimpan on-chain
    ↓
Dana otomatis dieksekusi sesuai verdict
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Blockchain | Monad Testnet |
| Smart Contract | Solidity 0.8.28, Foundry |
| Frontend | Next.js 16, TypeScript, Tailwind CSS |
| Wallet | RainbowKit + wagmi v2 + viem |
| AI | Google Gemini 2.0 Flash |
| Deploy | Vercel |

---

## Kenapa Monad?

- **10,000 TPS** — banyak transaksi escrow bisa berjalan paralel tanpa bottleneck
- **0.8s finality** — user langsung lihat hasilnya, bukan nunggu menit-menitan
- **Gas ~Rp1-15** — feasible untuk micro job Rp10k-Rp100k, bukan cuma job besar
- **EVM compatible** — semua tooling Ethereum (Foundry, wagmi, viem) langsung jalan

---

## Smart Contract

### `briefEscrow.sol`

**Deployed:** `0x852C1aC9C68Df4BBf0133dd859ec866b1E69BA90`

**State Machine:**
```
OPEN → IN_PROGRESS → SUBMITTED → COMPLETED
                          │
                          └→ DISPUTED → RESOLVED
IN_PROGRESS (14 hari tanpa submit) → REFUNDED
```

**Functions:**

| Function | Siapa | Keterangan |
|---|---|---|
| `createJob(description)` | Client | Buat job + lock ETH dalam satu tx |
| `acceptJob(id)` | Freelancer | Ambil job yang open |
| `submitWork(id, url)` | Freelancer | Submit URL hasil kerja |
| `approveWork(id)` | Client | Approve → ETH release ke freelancer |
| `triggerDispute(id)` | Freelancer | Minta AI review (setelah timeout) |
| `resolveDispute(id, outcome, pct, hash, reasoning)` | Oracle | Eksekusi verdict AI on-chain |
| `claimRefund(id)` | Client | Refund jika freelancer tidak submit 14 hari |

**Security:**
- Checks-effects-interactions pattern (no re-entrancy)
- `onlyOracle` modifier untuk `resolveDispute()`
- State machine checks di setiap function
- Amount di-zero dulu sebelum transfer

---

## Project Structure

```
brief/
├── contracts/                  # Foundry project
│   ├── src/
│   │   └── briefEscrow.sol  # Core escrow contract
│   ├── test/
│   │   └── briefEscrow.t.sol  # 14 tests, all passing
│   └── script/
│       └── Deploy.s.sol
│
├── web/                        # Next.js app
│   ├── app/
│   │   ├── page.tsx            # Landing page
│   │   ├── create/page.tsx     # Post job + AI generator
│   │   ├── jobs/page.tsx       # Browse open jobs
│   │   ├── job/[id]/page.tsx   # Job detail + all actions
│   │   ├── dashboard/page.tsx  # User's job history
│   │   └── api/
│   │       ├── generate-job/   # AI job description generator
│   │       └── resolve-dispute/ # AI dispute resolver + oracle tx
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── JobStatusBadge.tsx
│   │   └── ClientRoot.tsx
│   ├── config/index.ts         # wagmi + RainbowKit config
│   ├── hooks/                  # contract interaction hooks
│   ├── lib/
│   │   ├── contract.ts         # ABI + address
│   │   └── ai.ts               # Gemini API helpers
│   └── providers.tsx
│
├── USER_FLOW.md                # Detailed user flow documentation
├── demo-flow.sh                # CLI script to test full flow
└── README.md
```

---

## Setup Lokal

### Prerequisites
- Node.js 18+
- pnpm
- Foundry (`curl -L https://foundry.paradigm.xyz | bash`)
- MetaMask dengan Monad Testnet

### 1. Clone & Install

```bash
git clone <repo>
cd brief/web
pnpm install
```

### 2. Environment Variables

Buat file `web/.env.local`:

```env
GEMINI_API_KEY=your_gemini_api_key
ORACLE_PRIVATE_KEY=0x_your_wallet_private_key
NEXT_PUBLIC_CONTRACT_ADDRESS=0x852C1aC9C68Df4BBf0133dd859ec866b1E69BA90
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

**Cara dapet key:**
- Gemini API Key: [aistudio.google.com/apikey](https://aistudio.google.com/apikey) (gratis)
- WalletConnect Project ID: [cloud.reown.com](https://cloud.reown.com) (gratis)

### 3. Run

```bash
pnpm dev
# → http://localhost:3000
```

### 4. Setup MetaMask — Monad Testnet

| Setting | Value |
|---|---|
| Network Name | Monad Testnet |
| RPC URL | `https://testnet-rpc.monad.xyz` |
| Chain ID | `10143` |
| Currency Symbol | `MON` |

**Faucet:** [testnet.monad.xyz](https://testnet.monad.xyz)

---

## Deploy Contract (Ulang / Network Lain)

```bash
cd contracts

# Deploy
ORACLE_ADDRESS=0xYourWallet \
DISPUTE_TIMEOUT=30 \
forge script script/Deploy.s.sol \
  --rpc-url https://testnet-rpc.monad.xyz \
  --private-key 0xYourPrivateKey \
  --broadcast

# Verifikasi (semua explorer sekaligus)
# Lihat contracts/script/Deploy.s.sol untuk instruksi lengkap
```

---

## Run Tests

```bash
cd contracts
forge test -v
# 14 tests, 0 failures
```

---

## AI Dispute Resolution — Cara Kerja

1. Freelancer trigger dispute setelah client diam
2. Frontend call `POST /api/resolve-dispute` dengan jobId
3. Backend baca job data dari contract (description + workUrl)
4. Gemini AI evaluasi: apakah workUrl sesuai description?
5. Verdict: `RELEASE` / `REFUND` / `SPLIT` + reasoning
6. `verdictHash = keccak256(reasoning)` — bukti permanen
7. Oracle wallet call `resolveDispute()` on-chain
8. ETH otomatis dieksekusi sesuai verdict

**Transparansi:** Full reasoning di-emit sebagai event on-chain. Hash-nya tersimpan di struct Job sebagai bukti tidak bisa dimanipulasi.

---

## Acknowledged Tradeoffs

| Tradeoff | Keterangan |
|---|---|
| Oracle centralized | Backend brief yang run Gemini + call resolveDispute(). Untuk MVP ini acceptable — roadmap: Chainlink Functions |
| AI tidak bisa akses URL | Gemini evaluate berdasarkan nama/format URL + job description. Works well untuk demo |
| getJobsByStatus iterasi semua job | O(n) — acceptable untuk MVP dengan jumlah job kecil. Roadmap: event indexing |
| disputeTimeout 30 detik | Hanya untuk testnet/demo. Production: 7 hari |

---

## Roadmap

- [ ] WalletConnect Project ID integration
- [ ] Reputation system (on-chain rating setelah job selesai)
- [ ] Decentralized oracle via Chainlink Functions
- [ ] Multi-token support (selain MON native)
- [ ] Job categories dan search/filter
- [ ] Notification system (email/push saat ada aksi dibutuhkan)

---

## License

MIT
=======
## Foundry

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

- **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
- **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
- **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
- **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://book.getfoundry.sh/

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy

```shell
$ forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
```

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```
>>>>>>> 816bb67 (add smart contract)
