# PolkaBasket — Implementation Plan
### Cross-Chain Asset Baskets for Polkadot Hub
**Hackathon:** Polkadot Solidity Hackathon 2026 (Feb 15 – Mar 20, 2026)
**Track:** Track 2 — PVM / Cross-Chain
**Pitch:** *"The first cross-chain DeFi index primitive for Polkadot, powered by PolkaVM and XCM."*

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Overview](#2-architecture-overview)
3. [Repository Structure](#3-repository-structure)
4. [Sprint Plan (4 Weeks)](#4-sprint-plan-4-weeks)
5. [Smart Contract Layer](#5-smart-contract-layer)
6. [PVM Rust Allocation Engine](#6-pvm-rust-allocation-engine)
7. [XCM Execution Layer](#7-xcm-execution-layer)
8. [Basket Token Design](#8-basket-token-design)
9. [Frontend](#9-frontend)
10. [Demo Flow](#10-demo-flow)
11. [Judging Alignment](#11-judging-alignment)
12. [Risk Register](#12-risk-register)

---

## 1. Project Overview

PolkaBasket lets users mint a single **basket token** that represents capital deployed across multiple parachain DeFi protocols simultaneously. Instead of manually bridging DOT to Hydration, Acala, and Moonbeam, a user deposits once and receives a composable basket token representing all positions.

### MVP Scope (Hackathon)

| Chain | Protocol | Allocation |
|---|---|---|
| Polkadot Hub | Basket Manager Contract | — |
| Hydration | LP deposit | 40% |
| Moonbeam | Lending deposit | 30% |
| Acala (stretch) | stDOT staking | 30% |

Start with **Hub + Hydration + Moonbeam**. Acala is a stretch goal.

### Core Token

```
xDOT-LIQ  — backed by DOT positions across Hydration + Moonbeam
```

---

## 2. Architecture Overview

```
User
  │  deposit(DOT)
  ▼
┌──────────────────────────────┐
│   BasketManager.sol          │  ← Polkadot Hub (PolkaVM / Solidity)
│   - createBasket()           │
│   - deposit()                │
│   - withdraw()               │
│   - rebalance()              │
│   - mintBasketToken()        │
└────────────┬─────────────────┘
             │ calls precompile
             ▼
┌──────────────────────────────┐
│   PVM Precompile             │  ← Rust library compiled to PolkaVM bytecode
│   optimize_allocation()      │
│   rebalance_basket()         │
│   risk_adjusted_yield()      │
└────────────┬─────────────────┘
             │ returns allocation weights
             ▼
┌──────────────────────────────┐
│   XCM Executor               │  ← pallet-xcm / XCM v4
│   - teleport DOT             │
│   - execute remote calls     │
│   - receive yield/return     │
└──────┬──────────┬────────────┘
       │          │
       ▼          ▼
  Hydration    Moonbeam
  LP deposit   Lending deposit
```

---

## 3. Repository Structure

```
polkabasket/
├── contracts/                  # Solidity smart contracts
│   ├── BasketManager.sol
│   ├── BasketToken.sol         # ERC-20 basket token
│   ├── interfaces/
│   │   ├── IBasketManager.sol
│   │   ├── IXCMPrecompile.sol
│   │   └── IPVMEngine.sol
│   └── mocks/
│       ├── MockHydrationLP.sol
│       └── MockMoonbeamLending.sol
├── pvm-engine/                 # Rust allocation engine
│   ├── Cargo.toml
│   ├── src/
│   │   ├── lib.rs
│   │   ├── allocation.rs       # optimize_allocation()
│   │   ├── rebalance.rs        # rebalance_basket()
│   │   └── risk.rs             # risk_adjusted_yield()
│   └── build.rs
├── xcm/                        # XCM configuration & scripts
│   ├── messages/
│   │   ├── deposit_hydration.ts
│   │   └── deposit_moonbeam.ts
│   └── utils/
│       └── xcm_builder.ts
├── frontend/                   # React + PAPI (create-dot-app template)
│   ├── src/
│   │   ├── components/
│   │   │   ├── BasketCard.tsx
│   │   │   ├── DepositForm.tsx
│   │   │   ├── AllocationChart.tsx
│   │   │   └── XCMStatus.tsx
│   │   ├── hooks/
│   │   │   ├── useBasket.ts
│   │   │   └── useXCM.ts
│   │   └── App.tsx
├── scripts/
│   ├── deploy.ts               # Hardhat deploy
│   ├── demo_deposit.ts         # Demo script
│   └── demo_rebalance.ts
├── test/
│   ├── BasketManager.test.ts
│   └── AllocationEngine.test.rs
├── hardhat.config.ts
├── Cargo.toml                  # Workspace root
└── README.md
```

---

## 4. Sprint Plan (4 Weeks)

> Hacking period: **March 1 – March 20, 2026**
> Submission deadline: **March 20, 2026**

### Week 1 (Mar 1–7): Foundation

**Goal:** Core contracts compile and deploy on Polkadot Hub testnet.

| Day | Task | Owner |
|---|---|---|
| 1 | Set up monorepo, Hardhat config for PolkaVM, connect create-dot-app frontend template | All |
| 1 | Confirm PolkaVM testnet RPC endpoint, get test DOT from faucet | All |
| 2 | Scaffold `BasketToken.sol` (ERC-20 with mint/burn) | Smart contract dev |
| 2 | Scaffold `BasketManager.sol` with stub functions | Smart contract dev |
| 3 | Implement `deposit()` and `mintBasketToken()` with unit tests | Smart contract dev |
| 3 | Start Rust `pvm-engine` crate — basic allocation struct | Rust dev |
| 4 | Implement `createBasket()` with hardcoded allocation config | Smart contract dev |
| 4 | Implement `optimize_allocation()` in Rust (fixed weights, no oracle yet) | Rust dev |
| 5 | Wire PVM precompile call from Solidity into mock | Smart contract + Rust dev |
| 6 | Deploy contracts to Westend/Hub testnet | All |
| 7 | Buffer / debugging | All |

**Deliverable:** BasketManager + BasketToken deployed on testnet. Deposit mints tokens.

---

### Week 2 (Mar 8–14): XCM Integration

**Goal:** DOT teleports from Hub to Hydration and Moonbeam.

| Day | Task | Owner |
|---|---|---|
| 8 | Research XCM v4 message format for Hub → Hydration asset transfer | XCM dev |
| 8 | Set up XCM test environment (zombienet or Chopsticks for local fork) | XCM dev |
| 9 | Build `deposit_hydration.ts` XCM message (teleport + LP call) | XCM dev |
| 9 | Build `deposit_moonbeam.ts` XCM message (teleport + lending call) | XCM dev |
| 10 | Integrate XCM dispatch into `BasketManager.executeDeployment()` | Smart contract dev |
| 11 | Implement mock Hydration LP and Moonbeam Lending contracts for testnet | Smart contract dev |
| 12 | Test end-to-end: deposit → XCM message → mock protocol deposit | All |
| 13 | Implement `withdraw()` — XCM reverse flow | Smart contract dev |
| 14 | Buffer / fix XCM edge cases | All |

**Deliverable:** Full deposit flow working cross-chain on testnet (even with mocks on remote chains).

---

### Week 3 (Mar 15–18): PVM Engine + Rebalancing

**Goal:** Rust engine live, rebalancing demo works.

| Day | Task | Owner |
|---|---|---|
| 15 | Implement `rebalance_basket()` in Rust — detect drift from target weights | Rust dev |
| 15 | Implement `risk_adjusted_yield()` — simple yield scoring with hardcoded APYs | Rust dev |
| 16 | Compile Rust to PolkaVM bytecode via polkatool | Rust dev |
| 16 | Wire `rebalance()` in `BasketManager.sol` to call Rust precompile output | Smart contract dev |
| 17 | Build `AllocationChart` frontend component (pie chart of live allocations) | Frontend dev |
| 17 | Build `XCMStatus` component (show pending XCM messages with status) | Frontend dev |
| 18 | End-to-end demo rehearsal: deposit → deploy → display allocation → rebalance | All |

**Deliverable:** Rebalance flow demo-ready. Frontend shows basket composition.

---

### Week 4 (Mar 19–20): Polish + Submission

**Goal:** Demo video, README, clean submission.

| Day | Task |
|---|---|
| 19 | Fix all outstanding bugs, improve error handling |
| 19 | Record demo video (5 min max — see Demo Flow section) |
| 19 | Write README with architecture diagram, setup instructions, judging highlights |
| 20 | Final deployment to testnet, verify all transactions on explorer |
| 20 | Submit on DoraHacks before deadline |

---

## 5. Smart Contract Layer

See `contracts/CONTRACTS.md` for full technical spec.

### BasketManager.sol — Key Functions

```solidity
// Create a new basket configuration
function createBasket(
    string calldata name,
    AllocationConfig[] calldata allocations
) external returns (uint256 basketId);

// User deposits DOT, receives basket tokens
function deposit(
    uint256 basketId,
    uint256 amount
) external payable returns (uint256 tokensMinted);

// Burn basket tokens, return DOT across chains
function withdraw(
    uint256 basketId,
    uint256 tokenAmount
) external;

// Trigger rebalance — calls PVM engine
function rebalance(uint256 basketId) external;

// Internal: dispatch XCM to deploy capital
function _executeDeployment(
    uint256 basketId,
    AllocationConfig[] memory allocations,
    uint256 totalAmount
) internal;
```

### AllocationConfig Struct

```solidity
struct AllocationConfig {
    uint32  paraId;        // Target parachain ID
    address protocol;      // Protocol address on target chain
    uint16  weightBps;     // Weight in basis points (10000 = 100%)
    bytes   callData;      // Encoded call to protocol on target chain
}
```

### BasketToken.sol

Standard ERC-20 with:
- `mint(address to, uint256 amount)` — only callable by BasketManager
- `burn(address from, uint256 amount)` — only callable by BasketManager
- Metadata: name = "xDOT-LIQ", symbol = "xDOT-LIQ", decimals = 18

---

## 6. PVM Rust Allocation Engine

See `pvm-engine/PVM_ENGINE.md` for full technical spec.

### What It Does

The Rust engine is compiled to PolkaVM bytecode and called via a precompile address from Solidity. For the hackathon, it implements three functions.

### Core Functions

```rust
/// Given current APYs and target weights, return optimal allocation weights
pub fn optimize_allocation(
    yields: &[YieldData],
    risk_params: &RiskParams,
) -> AllocationResult

/// Detect drift and compute rebalance deltas
pub fn rebalance_basket(
    current_positions: &[Position],
    target_weights: &[u16],
    threshold_bps: u16,
) -> RebalanceAction

/// Score each protocol by risk-adjusted yield (Sharpe-like ratio)
pub fn risk_adjusted_yield(
    yields: &[YieldData],
    volatilities: &[f64],
) -> Vec<f64>
```

### Integration with Solidity

Solidity calls the PVM engine via a precompile:

```solidity
// Precompile address for PVM engine (assigned at deployment)
address constant PVM_ENGINE = 0x0000000000000000000000000000000000000900;

function _callPVMEngine(bytes memory input)
    internal view returns (bytes memory) {
    (bool success, bytes memory result) = PVM_ENGINE.staticcall(input);
    require(success, "PVM engine call failed");
    return result;
}
```

### Hackathon Shortcut

For MVP, hardcode APY data inside the Rust engine (no oracle needed):

```rust
const MOCK_YIELDS: &[YieldData] = &[
    YieldData { chain: "Hydration",  protocol: "LP",      apy_bps: 800  },
    YieldData { chain: "Acala",      protocol: "Staking",  apy_bps: 1400 },
    YieldData { chain: "Moonbeam",   protocol: "Lending",  apy_bps: 600  },
];
```

This is sufficient for demo. Label it clearly in README as "oracle-ready design, hardcoded for testnet."

---

## 7. XCM Execution Layer

See `xcm/XCM_SPEC.md` for full technical spec.

### XCM Message Pattern (Hub → Hydration)

```typescript
// Pseudocode — actual API depends on XCM v4 format
const depositToHydration = {
    V4: [
        { WithdrawAsset: [{ id: DOT_ASSET_ID, fun: { Fungible: amount } }] },
        { BuyExecution: { fees: { id: DOT_ASSET_ID, fun: { Fungible: fee } }, weightLimit: 'Unlimited' } },
        { DepositAsset: { assets: { Wild: 'All' }, beneficiary: HYDRATION_LP_ADDRESS } },
        { Transact: {
            originKind: 'SovereignAccount',
            call: encodedAddLiquidityCall,
        }},
    ]
};
```

### Sovereign Account Model

The BasketManager contract controls a **sovereign account** on each target parachain. Capital flows to and from this account via XCM.

```
Hub BasketManager Contract
  └── Sovereign Account on Hydration (auto-derived from Hub paraId + contract address)
  └── Sovereign Account on Moonbeam  (auto-derived from Hub paraId + contract address)
```

### Key Consideration

PolkaVM contracts have different sovereign account derivation than regular Substrate accounts. Verify with Polkadot Hub testnet before finalizing. Use Chopsticks to fork and test locally.

---

## 8. Basket Token Design

### Token Types for MVP

| Token | Backing | Chains |
|---|---|---|
| `xDOT-LIQ` | DOT LP + DOT Lending | Hydration + Moonbeam |

Stretch goal:
| `xDOT-STABLE` | stDOT + DOT Lending | Acala + Moonbeam |

### Value Accounting

Basket token price = (sum of all underlying position values) / (total token supply)

For MVP, this is calculated off-chain and displayed in the frontend. A price oracle hook is designed but not fully implemented in the contract.

```solidity
// Returns basket NAV in DOT (for display only in MVP)
function getBasketNAV(uint256 basketId) external view returns (uint256 navInDOT);
```

---

## 9. Frontend

The frontend uses the existing **create-dot-app** React + PAPI template as a base.

### Key Components

**DepositForm.tsx**
- Input: DOT amount
- Shows breakdown of where capital will go (40/30/30)
- Connect wallet button (Polkadot.js extension)
- "Mint Basket Token" CTA

**AllocationChart.tsx**
- Pie chart showing live allocation weights
- Labels: Hydration LP 40%, Moonbeam Lending 30%, Acala 30%
- Updates after each transaction

**XCMStatus.tsx**
- Lists pending and confirmed XCM messages
- Shows per-chain status: Hub ✓ → Hydration ✓ → Moonbeam ⏳
- Links to block explorer

**BasketCard.tsx**
- Shows basket name, token symbol, total TVL
- Current yield estimate (from hardcoded Rust engine output)
- User's position value

### Libraries to Add

```bash
npm install recharts viem wagmi @polkadot/extension-dapp
```

### Wallet Connection

Use PAPI (already in template) for Substrate + Polkadot.js extension.
Use viem for EVM calls to BasketManager.sol on Hub.

---

## 10. Demo Flow

**Duration: ~5 minutes**

```
[00:00] Show PolkaBasket UI — explain concept in 30s
[00:30] Connect Polkadot wallet (show testnet DOT balance)
[01:00] Select "xDOT-LIQ Basket" — explain 40/30 split on screen
[01:30] Enter 100 DOT → click "Mint Basket Token"
[02:00] Show transaction confirmed on Hub testnet explorer
[02:30] Show XCM messages dispatched: Hub → Hydration, Hub → Moonbeam
[03:00] Show Hydration testnet explorer — LP deposit confirmed
[03:30] Show Moonbeam testnet explorer — lending deposit confirmed
[04:00] Show user now holds 100 xDOT-LIQ tokens
[04:15] Trigger "Rebalance" — show Rust engine output (yield scores)
[04:30] Show allocation updated
[05:00] End — show architecture slide
```

**Key talking point for judges:** *"This primitive didn't exist on Polkadot before. One deposit, capital across multiple chains, one unified token — powered by PolkaVM Rust and XCM."*

---

## 11. Judging Alignment

| Judging Category | PolkaBasket Score | Evidence |
|---|---|---|
| **Native Asset Usage** | ✅ Strong | DOT is the base asset. All positions are DOT-denominated. ERC-20 basket token uses Hub's native asset infrastructure. |
| **XCM Messaging** | ✅ Strong | Every deposit triggers 2 XCM teleport + transact messages. Withdraw does reverse. Rebalance moves liquidity between chains via XCM. |
| **PVM / Rust Libraries** | ✅ Strong | Rust allocation engine compiled to PolkaVM bytecode, called via Solidity precompile. This is the "PVM experiment" judges want to see. |
| **Innovation** | ✅ Strong | New primitive — no existing basket token system exists on Polkadot. Not just another bridge. |
| **Technical Execution** | ✅ Good | Full stack: Solidity + Rust + XCM + React. Testnet demo with real cross-chain transactions. |

---

## 12. Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| PVM precompile interface not finalized | Medium | Use polkatool + check OpenGuild hackathon resources weekly. Fall back to Rust library called off-chain if needed. |
| XCM sovereign account issues for PolkaVM contracts | High | Use Chopsticks to fork testnet locally and test early (Week 2, Day 8). Ask in Discord. |
| Hydration/Moonbeam testnet not accepting XCM from Hub | Medium | Use mock contracts deployed on those chains as placeholder protocols. Demo still shows full XCM flow. |
| Testnet DOT faucet rate limits | Low | Request early, store in multiple accounts. |
| PolkaVM missing EVM opcodes | Medium | Review the "PolkaVM Missing Opcodes" article from hackathon resources before writing contracts. |
| Time overrun on Rust engine | Low | Rust engine is self-contained. Hardcode values for MVP and iterate. |

---

## Additional Resources

- Hackathon Builder Playbook: https://github.com/polkadot-developers/hackathon-guide/blob/master/polkadot-hub-devs.md
- Hackathon Resources: https://build.openguild.wtf/hackathon-resources
- PolkaVM Missing Opcodes: https://openguild.wtf/blog/polkadot/polkavm-missing-opcodes-and-workarounds
- create-dot-app template: https://github.com/preschian/create-dot-app
- XCM v4 docs: https://docs.polkadot.com/develop/interoperability/xcm/
- polkatool: https://openguild.wtf/blog/polkadot/polkadot-introduction-to-polkatool
- Discord support: https://discord.gg/BZWkdy5w5b

---

*See companion files: `CONTRACTS.md`, `PVM_ENGINE.md`, `XCM_SPEC.md`, `FRONTEND.md`*
