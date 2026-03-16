# tele-basket — Technical Architecture

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Component Details](#3-component-details)
   - 3.1 [Frontend (React + TypeScript)](#31-frontend-react--typescript)
   - 3.2 [Smart Contracts (Solidity/PolkaVM)](#32-smart-contracts-soliditypolkavm)
   - 3.3 [PVM Engine (Rust/PolkaVM)](#33-pvm-engine-rustpolkavm)
   - 3.4 [XCM Layer](#34-xcm-layer)
4. [Data Flow Diagrams](#4-data-flow-diagrams)
   - 4.1 [Deposit Flow](#41-deposit-flow)
   - 4.2 [Withdraw Flow](#42-withdraw-flow)
   - 4.3 [Rebalance Flow](#43-rebalance-flow)
5. [Contract Interactions](#5-contract-interactions)
6. [PVM Engine Integration](#6-pvm-engine-integration)
7. [Wallet Architecture](#7-wallet-architecture)
8. [Deployment Topology](#8-deployment-topology)
9. [Security Considerations](#9-security-considerations)
10. [Future Enhancements](#10-future-enhancements)

---

## 1. System Overview

**tele-basket** is a cross-chain DeFi basket protocol built on **Polkadot Hub** (PolkaVM). Users deposit DOT on the Hub and receive basket tokens representing diversified positions across multiple Polkadot parachains (Hydration, Moonbeam, Acala). The protocol automatically deploys capital via XCM and uses a Rust-based PVM engine for intelligent rebalancing.

### Key Features

- **Cross-Chain Capital Deployment**: DOT deployed across Hydration (LP), Moonbeam (Lending), and Acala (Staking)
- **PVM Rust Allocation Engine**: Compute-heavy allocation logic written in Rust, compiled to PolkaVM bytecode
- **Automatic Rebalancing**: Detects drift from target weights and rebalances capital automatically
- **XCM v4 Integration**: Native cross-chain messaging for deposit/withdraw operations

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    TELE-BASKET SYSTEM ARCHITECTURE                                 │
│                                         Westend Testnet                                            │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘

                                         USER INTERFACE
    ┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
    │                                            BROWSER                                             │
    │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │
    │  │   HomePage   │    │ BasketsPage │    │BasketPage  │    │PortfolioPage│    │  Navbar     │   │
    │  │  List baskets│    │ All baskets │    │   Details  │    │ User pos    │    │Wallet btn   │   │
    │  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘    └──────┬───────┘    └──────┬───────┘   │
    │         │                    │                   │                    │                   │           │
    │         └────────────────────┴─────────┬────────┴───────────────────┴───────────────────┘           │
    │                                          │                                                         │
    │                                    ┌─────┴──────┐                                                  │
    │                                    │ WalletContext│                                                 │
    │                                    │ (ReactCtx)  │                                                 │
    │                                    └─────┬───────┘                                                  │
    │                                          │                                                         │
    │                      ┌───────────────────┼───────────────────┐                                     │
    │                      │                   │                   │                                     │
    │                 ┌────┴────────┐    ┌─────┴────────┐   ┌─────┴────────┐                           │
    │                 │useEVMWallet │    │useSubWallet  │   │useBasketMgr  │                           │
    │                 │ (viem)      │    │ (PAPI)       │   │ (Contract)   │                           │
    │                 └──────┬───────┘    └──────────────┘   └──────┬────────┘                           │
    │                        │                                     │                                     │
    └────────────────────────┼─────────────────────────────────────┼─────────────────────────────────────┘
                             │                                     │
                             ▼                                     ▼
    ╔═══════════════════════════════════════════════════════════════════════════════════════════════════╗
    ║                              POLKADOT HUB TESTNET (Chain ID: 420420421)                            ║
    ║                                        PolkaVM Environment                                          ║
    ╚═══════════════════════════════════════════════════════════════════════════════════════════════════╝
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
         ┌─────────────────┐  ┌──────────────┐  ┌─────────────────┐
         │  BasketToken    │  │BasketManager │  │  XCM Precompile │
         │   (ERC-20)     │  │   (Core)     │  │    (0x0800)     │
         │                 │  │              │  │                 │
         │ mint()         │  │ deposit()    │  │ sendXCM()       │
         │ burn()         │  │ withdraw()   │  │ teleportAsset() │
         │ transfer()     │  │ rebalance()  │  │                 │
         └────────┬────────┘  └──────┬───────┘  └────────┬────────┘
                  │                  │                   │
                  │                  │                   │
                  │        ┌────────┴────────┐          │
                  │        │   PVM Engine    │          │
                  │        │  Precompile     │          │
                  │        │   (0x0900)     │          │
                  │        │                 │          │
                  │        │ optimize_allocation()      │
                  │        │ rebalance_basket()         │
                  │        │ risk_adjusted_yield()      │
                  │        └────────┬────────┘          │
                  │                 │                   │
                  │                 │ (staticcall)      │
                  │                 ▼                   │
                  │        ┌────────────────┐          │
                  │        │ PolkaVM Binary │          │
                  │        │ (Rust compiled)│          │
                  │        │  PVM bytecode  │          │
                  │        └────────────────┘          │
                  │                  │                   │
                  └──────────────────┼───────────────────┘
                                     │
                                     ▼
    ╔═══════════════════════════════════════════════════════════════════════════════════════════════════╗
    ║                                          XCM LAYER                                                ║
    ╚═══════════════════════════════════════════════════════════════════════════════════════════════════╝

                          ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
                          │   Hydration     │      │   Moonbeam      │      │    Acala       │
                          │  Parachain 2034 │      │  Parachain 2004│      │ Parachain 2000 │
                          └────────┬────────┘      └────────┬────────┘      └────────┬────────┘
                                   │                       │                       │
                          ┌────────┴────────┐      ┌──────┴───────┐      ┌────────┴────────┐
                          │  Sovereign      │      │ Sovereign    │      │ Sovereign      │
                          │  Account       │      │ Account      │      │ Account        │
                          │                 │      │              │      │                │
                          │ LP Position    │      │Lending Pos   │      │ Staking Pos    │
                          └─────────────────┘      └──────────────┘      └─────────────────┘

    ╔═══════════════════════════════════════════════════════════════════════════════════════════════════╗
    ║                                         OFF-CHAIN SERVICES                                         ║
    ╚═══════════════════════════════════════════════════════════════════════════════════════════════════╝

                          ┌─────────────────────────────────────────┐
                          │         PVM Engine Builder              │
                          │                                         │
                          │  cargo build --target riscv32em         │
                          │       ↓                                 │
                          │  polkatool link --output engine.polkavm │
                          │       ↓                                 │
                          │  Deploy as precompile (0x0900)          │
                          └─────────────────────────────────────────┘

```

---

## 3. Component Details

### 3.1 Frontend (React + TypeScript)

**Tech Stack**: React 18, Vite, TypeScript, viem, wagmi, react-router-dom

#### Directory Structure
```
src/
├── App.tsx                    # Root router with WalletProvider
├── main.tsx                   # Entry point
├── contexts/
│   └── WalletContext.tsx      # Global wallet state (EVM + Substrate)
├── components/
│   ├── Navbar.tsx             # Navigation + wallet connect button
│   ├── DepositForm.tsx        # Deposit DOT → receive basket tokens
│   ├── BasketCard.tsx         # Basket summary card
│   ├── AllocationChart.tsx   # Pie chart showing allocation weights
│   ├── XCMStatus.tsx         # Cross-chain message status display
│   └── Loading.tsx           # Loading spinner component
├── hooks/
│   ├── useEVMWallet.ts        # EVM wallet connection (MetaMask/SubWallet)
│   ├── useSubWallet.ts       # Substrate wallet connection (Polkadot.js)
│   └── useBasketManager.ts    # Contract interactions (deposit/withdraw/rebalance)
├── pages/
│   ├── HomePage.tsx          # Landing page with basket list
│   ├── BasketsPage.tsx       # All available baskets
│   ├── BasketPage.tsx        # Single basket detail + forms
│   └── PortfolioPage.tsx     # User's positions across baskets
├── config/
│   └── contracts.ts          # Contract addresses + ABIs + chain config
└── layouts/
    └── Layout.tsx            # Main layout wrapper
```

#### Key Frontend Components

**1. WalletContext.tsx**
```typescript
interface WalletContextValue {
  address: `0x${string}` | null;
  walletClient: WalletClient | null;
  isAvailable: boolean;
  error: string | null;
  loading: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnected: boolean;
}
```

**2. useEVMWallet.ts**
- Detects MetaMask or SubWallet injected providers
- Creates viem WalletClient for contract calls
- Listens for account/chain changes
- Supports Westend Asset Hub testnet (chain ID: 420420421)

**3. useBasketManager.ts**
```typescript
// Public client for read operations
const publicClient = createPublicClient({
  chain: polkadotHubTestnet,
  transport: http("https://westend-asset-hub-eth-rpc.polkadot.io"),
});

// Write operations via wallet client
deposit(walletClient, basketId, amountDOT) → BasketManager.deposit()
withdraw(walletClient, basketId, tokenAmount) → BasketManager.withdraw()
rebalance(walletClient, basketId) → BasketManager.rebalance()
```

**4. DepositForm.tsx**
- Input DOT amount
- Show allocation preview (e.g., 40% Hydration, 30% Moonbeam, 30% Acala)
- Call `deposit()` with native DOT value
- Mint basket tokens 1:1 with DOT deposited

**5. BasketPage.tsx** (Inline WithdrawForm)
- Located at lines 363-435
- Burn basket tokens to initiate withdrawal
- Initiates XCM withdraw to each target chain

---

### 3.2 Smart Contracts (Solidity/PolkaVM)

**Tech Stack**: Solidity 0.8.20, Hardhat, OpenZeppelin Contracts

#### Directory Structure
```
contracts/
├── contracts/
│   ├── BasketManager.sol      # Core protocol logic
│   ├── BasketToken.sol        # ERC-20 basket position token
│   ├── interfaces/
│   │   ├── IBasketManager.sol # BasketManager interface
│   │   ├── IXCMPrecompile.sol # XCM precompile interface
│   │   └── IPVMEngine.sol     # PVM engine interface
│   └── mocks/
│       ├── MockDOT.sol
│       ├── MockHydrationLP.sol
│       ├── MockMoonbeamLending.sol
│       └── MockXCMPrecompile.sol
├── test/
│   └── BasketManager.test.ts  # 10 passing tests
├── scripts/
│   ├── deploy.ts              # Deploy to Westend Asset Hub
│   └── fund-wallet.ts         # Fund deployer with testnet WND
├── hardhat.config.ts          # Network config (polkadotHub, chopsticks)
└── typechain-types/           # Generated TypeScript bindings
```

#### Contract Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BasketManager.sol                                │
│                        Address: 0x0000...0001 (placeholder)               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Data Structures:                                                          │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ struct AllocationConfig {                                           │  │
│  │     uint32  paraId;       // Target parachain ID (2034, 2004, 2000) │  │
│  │     address protocol;    // Protocol address on target chain        │  │
│  │     uint16  weightBps;   // Weight in basis points (must sum 10000)│  │
│  │     bytes   depositCall; // ABI-encoded deposit call                 │  │
│  │     bytes   withdrawCall;// ABI-encoded withdraw call                │  │
│  │ }                                                                     │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ struct Basket {                                                       │  │
│  │     uint256           id;                                            │  │
│  │     string            name;                                           │  │
│  │     address           token;          // BasketToken address          │  │
│  │     AllocationConfig[] allocations;                                  │  │
│  │     uint256           totalDeposited; // Total DOT deposited (wei)  │  │
│  │     bool              active;                                         │  │
│  │ }                                                                     │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Precompile Addresses:                                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ XCM_PRECOMPILE   = 0x0000000000000000000000000000000000000800        │  │
│  │ PVM_ENGINE      = 0x0000000000000000000000000000000000000900        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Key Functions:                                                            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ createBasket(name, symbol, allocations[]) → basketId                 │  │
│  │ deposit(basketId) → tokensMinted                                      │  │
│  │ withdraw(basketId, tokenAmount)                                       │  │
│  │ rebalance(basketId)                                                   │  │
│  │ getBasket(basketId) → Basket                                         │  │
│  │ getBasketNAV(basketId) → uint256                                     │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ creates
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BasketToken.sol                                     │
│                     (One per basket, ERC-20)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Only BasketManager can mint/burn:                                          │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ mint(address to, uint256 amount)  → onlyManager                       │  │
│  │ burn(address from, uint256 amount) → onlyManager                    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Standard ERC-20: name(), symbol(), decimals(), balanceOf(), transfer()   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### BasketManager.sol Key Functions

**1. createBasket()**
```solidity
function createBasket(
    string calldata name,
    string calldata symbol,
    AllocationConfig[] calldata allocations
) external onlyOwner returns (uint256 basketId)
```
- Validates allocations sum to 10000 bps
- Deploys new BasketToken for each basket
- Stores allocation config with paraIds, protocols, weights

**2. deposit()**
```solidity
function deposit(uint256 basketId) external payable returns (uint256 tokensMinted)
```
- Requires basket is active and msg.value > 0
- Mints basket tokens 1:1 with DOT deposited (simplified NAV)
- Triggers `_executeDeployment()` to dispatch XCM to all target chains
- Emits `Deposited` event with amount and tokens minted

**3. withdraw()**
```solidity
function withdraw(uint256 basketId, uint256 tokenAmount) external
```
- Burns basket tokens from user
- Calculates share of total deposits
- Dispatches XCM withdraw to each allocation target
- Emits `Withdrawn` event

**4. rebalance()**
```solidity
function rebalance(uint256 basketId) external
```
- Calls PVM engine via staticcall to get optimal weights
- Updates allocation weights if drift exceeds threshold (200 bps default)
- Emits `Rebalanced` event

**5. Internal: PVM Engine Call**
```solidity
function _callPVMEngine(bytes memory input) internal view returns (bytes memory) {
    (bool success, bytes memory result) = PVM_ENGINE.staticcall(input);
    require(success, "PVM engine call failed");
    return result;
}
```

---

### 3.3 PVM Engine (Rust/PolkaVM)

**Tech Stack**: Rust (no_std), PolkaVM RISC-V bytecode, polkatool

#### Directory Structure
```
pvm-engine/
├── src/
│   ├── lib.rs              # Entry points (C ABI)
│   ├── allocation.rs       # optimize_allocation()
│   ├── rebalance.rs        # rebalance_basket()
│   └── risk.rs             # risk_adjusted_yield()
├── Cargo.toml              # Dependencies (fixed, no std)
├── build.rs                # Build script
└── .cargo/
    └── config.toml         # PolkaVM target config
```

#### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PVM Engine Binary                               │
│                       Compiled to PolkaVM RISC-V bytecode                   │
│                         Deployed as precompile at 0x0900                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Three Exported Functions (C ABI):                                         │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ 1. optimize_allocation()                                              │  │
│  │    Input:  [num_protocols: u32][yields: [apy_bps: u32; N]]            │  │
│  │            [risk_tolerance: u16]                                       │  │
│  │    Output: [weights: [weight_bps: u16; N]]                           │  │
│  │                                                                     │  │
│  │    Logic:                                                             │  │
│  │    - Yield-weighted allocation with risk caps                        │  │
│  │    - MAX_WEIGHT_BPS = 5000 (50%)                                     │  │
│  │    - MIN_WEIGHT_BPS = 1000 (10%)                                     │  │
│  │    - Normalizes to exactly 10000 bps                                  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ 2. rebalance_basket()                                                 │  │
│  │    Input:  [num_protocols: u32]                                       │  │
│  │            [current_weights: [u16; N]]                                │  │
│  │            [target_weights: [u16; N]]                                │  │
│  │            [threshold_bps: u16]                                      │  │
│  │    Output: [needs_rebalance: u8][new_weights: [u16; N]]            │  │
│  │                                                                     │  │
│  │    Logic:                                                             │  │
│  │    - Checks if any weight drifted beyond threshold                  │  │
│  │    - Returns 1 (needs rebalance) or 0 (no action)                    │  │
│  │    - Returns corrected weights if rebalancing needed                │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ 3. risk_adjusted_yield()                                             │  │
│  │    Input:  [yields_bps: u32[]][volatilities_bps: u32[]]              │  │
│  │    Output: [scores: [protocol_index: u32, score_bps: u32]]          │  │
│  │                                                                     │  │
│  │    Logic:                                                             │  │
│  │    - Sharpe-like ratio: yield / (1 + volatility)                    │  │
│  │    - Returns risk-adjusted scores for each protocol                 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Why Rust + PolkaVM?

| Benefit | Description |
|---------|-------------|
| **Type Safety** | No integer overflow bugs in weight calculations - Rust's type system catches these at compile time |
| **Performance** | RISC-V execution is faster than interpreted EVM for computation-heavy allocation logic |
| **Expressiveness** | Complex financial math (fixed-point arithmetic, yield calculations) easier in Rust than Solidity |
| **First-Class PVM** | Demonstrates understanding of PolkaVM as a new primitive, not just an EVM clone |

#### Build Process

```bash
# Install polkatool
cargo install polkatool

# Build for PolkaVM target (requires nightly)
cargo build --release --target riscv32em-unknown-none-elf -Z build-std=core,alloc

# Package for PolkaVM
polkatool link --output polkabasket_engine.polkavm \
    target/riscv32em-unknown-none-elf/release/polkabasket_engine.so

# Verify bytecode
polkatool info polkabasket_engine.polkavm
```

#### Testing the Engine

```rust
// Unit tests (native, for development speed)
cargo test

// Example test
#[test]
fn test_optimize_allocation_basic() {
    let yields = [800u32, 1400, 600];
    let result = allocation::optimize(&[/* encoded input */]);
    let total: u32 = result.iter().map(|&w| w as u32).sum();
    assert_eq!(total, 10000, "weights must sum to 10000 bps");
    assert!(result[1] > result[0], "higher yield gets higher weight");
}
```

---

### 3.4 XCM Layer

**Tech Stack**: TypeScript, @polkadot/api, XCM v4

#### Directory Structure
```
xcm/
└── messages/
    └── index.ts         # XCM message builders
```

#### Cross-Chain Message Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          XCM Message Flow — Deposit                         │
└─────────────────────────────────────────────────────────────────────────────┘

    User deposits 100 DOT to BasketManager on Hub
                    │
                    ▼
    ┌───────────────────────────────────────────────────────────────────────┐
    │  BasketManager._executeDeployment(basketId, totalAmount)              │
    └───────────────────────────────────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│ XCM Message #1│       │ XCM Message #2│       │ XCM Message #3│
│  Hub→Hydration│       │ Hub→Moonbeam  │       │ Hub→Acala     │
│    40 DOT     │       │    30 DOT     │       │    30 DOT     │
└───────┬───────┘       └───────┬───────┘       └───────┬───────┘
        │                       │                       │
        └───────────────────────┴───────────────────────┘
                                │
                                ▼
                    ┌─────────────────────┐
                    │  XCM Precompile     │
                    │   (0x0800)          │
                    │ sendXCM(paraId,     │
                    │      xcmMessage)    │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
        ┌──────────┐     ┌───────────┐    ┌──────────┐
        │Hydration│     │ Moonbeam  │    │  Acala  │
        │   LP    │     │ Lending   │    │ Staking  │
        │ 2034    │     │  2004    │    │  2000    │
        └─────────┘     └───────────┘    └──────────┘
```

#### XCM Message Structure (V4)

**Deposit Message (Hub → Hydration)**
```typescript
{
  V4: [
    // Step 1: Withdraw DOT from Hub
    {
      WithdrawAsset: [
        {
          id: { parents: 1, interior: "Here" }, // DOT
          fun: { Fungible: amount },
        },
      ],
    },
    // Step 2: Buy execution on target chain
    {
      BuyExecution: {
        fees: {
          id: { parents: 1, interior: "Here" },
          fun: { Fungible: amount / 100n }, // ~1% for fees
        },
        weightLimit: "Unlimited",
      },
    },
    // Step 3: Execute protocol call (e.g., addLiquidity)
    {
      Transact: {
        originKind: "SovereignAccount",
        requireWeightAtMost: {
          refTime: 5_000_000_000n,
          proofSize: 262144n,
        },
        call: { encoded: lpCallData },
      },
    },
    // Step 4: Refund surplus fees
    { RefundSurplus: null },
    // Step 5: Deposit remaining to sovereign account
    {
      DepositAsset: {
        assets: { Wild: { AllCounted: 1 } },
        beneficiary: {
          parents: 0,
          interior: { X1: { AccountId32: { id: sovereignAccount, network: null } } },
        },
      },
    },
  ],
}
```

#### Parachain IDs (Westend Testnet)

| Chain | Parachain ID | Role |
|-------|--------------|------|
| **Polkadot Hub** | 1000 | Home chain - BasketManager lives here |
| **Hydration** | 2034 | Allocation target - LP |
| **Moonbeam** | 2004 | Allocation target - Lending |
| **Acala** | 2000 | Allocation target - Staking |

#### Sovereign Account Derivation

The BasketManager contract controls a sovereign account on each target parachain:

```
sovereign_account = blake2_256(
    "SiblingChain" || encode(1000) || "AccountKey20" || contractAddr
)[0..32]
```

> **Note**: PolkaVM contract addresses are 20-byte Ethereum-style addresses. The sovereign account derivation for EVM/PolkaVM contracts may differ from standard Substrate account derivation.

---

## 4. Data Flow Diagrams

### 4.1 Deposit Flow

```
┌─────────────┐      Frontend         Contracts           XCM              Target Chains
    User      │         │                │                  │                    │
   (Browser)  │         │                │                  │                    │
              │         │                │                  │                    │
    ┌─────────┴─────────┴─────────────────┴──────────────────┴─────────────────┐  │
    │                                                                          │  │
    │ 1. User enters DOT amount in DepositForm                               │  │
    │─────────────────────────────────────────────────────────────────────────►  │
    │                                                                          │  │
    │ 2. useBasketManager.deposit() called                                    │  │
    │    walletClient.writeContract({                                        │  │
    │      address: BASKET_MANAGER_ADDRESS,                                  │  │
    │      functionName: "deposit",                                          │  │
    │      args: [basketId],                                                 │  │
    │      value: parseEther(amount)                                         │  │
    │    })                                                                  │  │
    │─────────────────────────────────────────────────────────────────────────►  │
    │                                                                          │  │
    │ 3. BasketManager.deposit() executes:                                    │  │
    │    a. Validates basket is active                                       │  │
    │    b. Validates msg.value > 0                                          │  │
    │    c. Mints basket tokens 1:1: BasketToken.mint(user, msg.value)       │  │
    │    d. Updates b.totalDeposited += msg.value                           │  │
    │    e. Calls _executeDeployment(basketId, msg.value)                  │  │
    │       For each allocation:                                             │  │
    │       - calc amount = (totalAmount * weightBps) / 10000               │  │
    │       - call _dispatchXCMDeposit(alloc, amount)                      │  │
    │                                                                          │  │
    │    f. Emits Deposited(basketId, user, amount, tokensMinted)          │  │
    │─────────────────────────────────────────────────────────────────────────►  │
    │                                                                          │  │
    │ 4. _dispatchXCMDeposit() builds XCM v4 message                         │  │
    │    calls IXCMPrecompile(0x0800).sendXCM(paraId, xcmMessage)          │  │
    │─────────────────────────────────────────────────────────────────────────►  │
    │                                                                          │  │
    │ 5. XCM Message routed to target parachains:                           │  │
    │    - paraId 2034 (Hydration): 40% of amount                           │  │
    │    - paraId 2004 (Moonbeam): 30% of amount                            │  │
    │    - paraId 2000 (Acala): 30% of amount                              │  │
    │                                                                          │  │
    │                          ┌───────────────────┐                         │  │
    │                          │ XCM messages sent │                         │  │
    │                          │ via pallet-xcm    │                         │  │
    │                          └─────────┬─────────┘                         │  │
    │                                    │                                   │  │
    │              ┌─────────────────────┼─────────────────────┐           │  │
    │              ▼                     ▼                     ▼           │  │
    │       ┌────────────┐        ┌────────────┐        ┌──────────┐      │  │
    │       │ Hydration  │        │  Moonbeam  │        │  Acala   │      │  │
    │       │ Sovereign  │        │ Sovereign  │        │ Sovereign│      │  │
    │       │ Account    │        │ Account    │        │ Account  │      │  │
    │       └────────────┘        └────────────┘        └──────────┘      │  │
    │                                                                          │  │
    └──────────────────────────────────────────────────────────────────────────┘  │
              │                                                             │
              │ Transaction confirmed, tokens in wallet                     │
              ▼                                                             │
    ┌─────────────────┐                                                     │
    │  User sees:     │                                                     │
    │  - xDOT-LIQ     │                                                     │
    │    balance      │                                                     │
    │  - XCM status   │                                                     │
    │    shows        │                                                     │
    │    "confirmed"  │                                                     │
    └─────────────────┘                                                     │
```

### 4.2 Withdraw Flow

```
┌─────────────┐      Frontend         Contracts           XCM              Target Chains
    User      │         │                │                  │                    │
   (Browser)  │         │                │                  │                    │
              │         │                │                  │                    │
    ┌─────────┴─────────┴─────────────────┴──────────────────┴─────────────────┐  │
    │                                                                          │  │
    │ 1. User clicks "Withdraw" in WithdrawForm                              │  │
    │    enters token amount to burn                                          │  │
    │─────────────────────────────────────────────────────────────────────────►  │
    │                                                                          │  │
    │ 2. useBasketManager.withdraw() called                                   │  │
    │    walletClient.writeContract({                                       │  │
    │      functionName: "withdraw",                                         │  │
    │      args: [basketId, tokenAmount]                                      │  │
    │    })                                                                   │  │
    │─────────────────────────────────────────────────────────────────────────►  │
    │                                                                          │  │
    │ 3. BasketManager.withdraw() executes:                                   │  │
    │    a. Validates basket is active                                       │  │
    │    b. Burns tokens: BasketToken.burn(user, tokenAmount)               │  │
    │    c. Calculates share: (tokenAmount * 1e18) / totalSupply            │  │
    │    d. For each allocation:                                             │  │
    │       calc withdrawAmount = (totalDeposited * weightBps * share)     │  │
    │          / (10000 * 1e18)                                              │  │
    │       call _dispatchXCMWithdraw(alloc, amount, user)                │  │
    │    e. Updates b.totalDeposited -= tokenAmount                         │  │
    │    f. Emits Withdrawn(basketId, user, tokensBurned, amountOut)      │  │
    │                                                                          │  │
    │ 4. _dispatchXCMWithdraw() builds XCM v4:                             │  │
    │    - WithdrawAsset from protocol                                       │  │
    │    - Transact to call withdraw function                               │  │
    │    - InitiateReserveWithdraw to send DOT back to Hub                 │  │
    │─────────────────────────────────────────────────────────────────────────►  │
    │                                                                          │  │
    │ 5. XCM messages routed to target chains                               │  │
    │    Each chain executes withdraw, sends DOT back via reserve withdraw  │  │
    │                                                                          │  │
    │                          ┌───────────────────┐                         │  │
    │                          │ XCM messages sent │                         │  │
    │                          └─────────┬─────────┘                         │  │
    │                                    │                                    │  │
    │              ┌─────────────────────┼─────────────────────┐            │  │
    │              ▼                     ▼                     ▼            │  │
    │       ┌────────────┐        ┌────────────┐        ┌──────────┐      │  │
    │       │ Hydration  │        │  Moonbeam  │        │  Acala   │      │  │
    │       │ LP Tokens  │        │   Positions│        │ Staked   │      │  │
    │       │   Withdraw │        │   Withdraw │        │  Withdraw│      │  │
    │       └─────┬──────┘        └──────┬──────┘        └────┬─────┘      │  │
    │             │ DOT to Hub           │ DOT to Hub        │ DOT to Hub  │  │
    │             └───────────────────────┴───────────────────┘            │  │
    │                                                                          │  │
    └──────────────────────────────────────────────────────────────────────────┘  │
              │                                                             │
              │ DOT received (async via XCM)                                 │
              ▼                                                             │
    ┌─────────────────┐                                                     │
    │  User sees:     │                                                     │
    │  - Token balance│                                                     │
    │    reduced      │                                                     │
    │  - DOT balance  │                                                     │
    │    increased    │                                                     │
    └─────────────────┘                                                     │
```

### 4.3 Rebalance Flow

```
┌─────────────┐      Frontend         Contracts           PVM Engine         Target Chains
    User      │         │                │                  │                    │
   (Admin)    │         │                │                  │                    │
              │         │                │                  │                    │
    ┌─────────┴─────────┴─────────────────┴──────────────────┴─────────────────┐  │
    │                                                                          │  │
    │ 1. Admin clicks "Rebalance" button                                     │  │
    │─────────────────────────────────────────────────────────────────────────►  │
    │                                                                          │  │
    │ 2. useBasketManager.rebalance() called                                  │  │
    │    walletClient.writeContract({                                       │  │
    │      functionName: "rebalance",                                       │  │
    │      args: [basketId]                                                  │  │
    │    })                                                                   │  │
    │─────────────────────────────────────────────────────────────────────────►  │
    │                                                                          │  │
    │ 3. BasketManager.rebalance() executes:                                 │  │
    │    a. Validates basket is active                                       │  │
    │    b. Encodes current weights: _encodeRebalanceInput(b)              │  │
    │       Format: [n][weights[0]...weights[n-1]][totalDeposited]         │  │
    │    c. Calls PVM engine: _callPVMEngine(engineInput)                  │  │
    │                                                                          │  │
    │    d. Staticcall to PVM_ENGINE (0x0900):                              │  │
    │       (bool success, bytes result) = PVM_ENGINE.staticcall(input)   │  │
    │       require(success, "PVM engine call failed")                     │  │
    │                                                                          │  │
    │    e. Decodes new weights from engine output                          │  │
    │       uint16[] newWeights = abi.decode(result, (uint16[]))           │  │
    │                                                                          │  │
    │    f. Updates weights if drift > threshold:                           │  │
    │       for each allocation i:                                          │  │
    │         if (abs(alloc[i].weightBps - newWeights[i]) > thresholdBps) │  │
    │            alloc[i].weightBps = newWeights[i];                       │  │
    │                                                                          │  │
    │    g. Emits Rebalanced(basketId, block.timestamp)                    │  │
    │─────────────────────────────────────────────────────────────────────────►  │
    │                                                                          │  │
    │ 4. PVM Engine (Rust/PolkaVM) processes:                               │  │
    │                                                                          │  │
    │    Input format:                                                       │  │
    │    [num_protocols: u32][current_weights: u16[]...]                  │  │
    │                                                                          │  │
    │    rebalance_basket() logic:                                          │  │
    │    - Parse current and target weights                                 │  │
    │    - Check each weight against threshold (e.g., 200 bps = 2%)        │  │
    │    - If any weight drifted beyond threshold:                         │  │
    │        return needs_rebalance = 1                                     │  │
    │        return target_weights                                          │  │
    │    - Else:                                                             │  │
    │        return needs_rebalance = 0                                     │  │
    │        return current_weights                                         │  │
    │                                                                          │  │
    │    Output format:                                                     │  │
    │    [needs_rebalance: u8][weights: u16[]]                              │  │
    │                                                                          │  │
    │    ┌───────────────────────────────────────────────────────────────┐   │  │
    │    │  PolkaVM Binary (compiled from Rust)                          │   │  │
    │    │                                                               │   │  │
    │    │  ┌─────────────────────────────────────────────────────────┐ │   │  │
    │    │  │  Input: [4][4000,3000,3000][3000,4000,3000][200]        │ │   │  │
    │    │  │                    │                                      │ │   │  │
    │    │  │                    ▼                                      │ │   │  │
    │    │  │  ┌─────────────────────────────────────────────────────┐│ │   │  │
    │    │  │  │  Check drift:                                        ││ │   │  │
    │    │  │  │  - Protocol 0: |4000 - 3000| = 1000 > 200 ✓          ││ │   │  │
    │    │  │  │  - Protocol 1: |3000 - 4000| = 1000 > 200 ✓          ││ │   │  │
    │    │  │  │  - Protocol 2: |3000 - 3000| = 0 ≤ 200               ││ │   │  │
    │    │  │  └─────────────────────────────────────────────────────┘│ │   │  │
    │    │  │                    │                                      │ │   │  │
    │    │  │                    ▼                                      │ │   │  │
    │    │  │  ┌─────────────────────────────────────────────────────┐│ │   │  │
    │    │  │  │  Output: [1][3000,4000,3000]                        ││ │   │  │
    │    │  │  │                 │                                    ││ │   │  │
    │    │  │  │  needs_rebalance = 1 (true)                         ││ │   │  │
    │    │  │  │  new_weights = [3000, 4000, 3000]                   ││ │   │  │
    │    │  │  └─────────────────────────────────────────────────────┘│ │   │  │
    │    │  └─────────────────────────────────────────────────────────┘ │   │  │
    │    └───────────────────────────────────────────────────────────────┘   │  │
    │                                                                          │  │
    └──────────────────────────────────────────────────────────────────────────┘  │
              │                                                             │
              │ Updated weights now reflect optimal allocation               │
              ▼                                                             │
    ┌─────────────────┐                                                     │
    │  UI shows:      │                                                     │
    │  - Allocation   │                                                     │
    │    chart updated│                                                     │
    │  - "Rebalanced" │                                                     │
    │    event logged │                                                     │
    └─────────────────┘                                                     │
```

---

## 5. Contract Interactions

### Contract Dependency Graph

```
                         ┌─────────────────────┐
                         │    PVM Engine       │
                         │  Precompile 0x0900 │
                         │ (PolkaVM/Rust)      │
                         └──────────┬──────────┘
                                    │ staticcall
                         ┌──────────┴──────────┐
                         │                     │
                    ┌────┴────┐           ┌───┴─────┐
                    │optimize │           │rebalance│
                    │_alloc   │           │_basket  │
                    └─────────┘           └─────────┘


    ┌──────────────────────────────────────────────────────────────────┐
    │                     BasketManager (0x0000...0001)               │
    │  ┌────────────────────────────────────────────────────────────┐ │
    │  │ Core Functions:                                            │ │
    │  │  • createBasket() → deploys BasketToken                    │ │
    │  │  • deposit() → mint tokens + dispatch XCM                  │ │
    │  │  • withdraw() → burn tokens + dispatch XCM                 │ │
    │  │  • rebalance() → call PVM engine + update weights         │ │
    │  └────────────────────────────────────────────────────────────┘ │
    │          │                   │                    │              │
    │   mints  │              dispatches          calls              │
    │   tokens │              XCM via           staticcall           │
    │          ▼              precompile              ▼              │
    │  ┌────────────┐      ┌──────────────┐    ┌──────────┐         │
    │  │BasketToken │      │XCM Precompile│    │PVM Engine│         │
    │  │  (ERC-20)  │      │   0x0800     │    │  0x0900  │         │
    │  │            │      │              │    │          │         │
    │  │ • mint()   │      │ • sendXCM()  │    │ • optimize│         │
    │  │ • burn()   │      │ • teleport() │    │ • rebalance           │
    │  │ • transfer │      │              │    │          │         │
    │  └────────────┘      └──────────────┘    └──────────┘         │
    │       │                      │                   │             │
    └───────┼──────────────────────┼───────────────────┼─────────────┘
            │                      │                   │
            │              calls via               returns
            │              Polkadot                  weights
            │              Relay
            │                      │
            └──────────────────────┴──────────────────────────────┐
                                                                   │
                                    ┌──────────────────────────────┴──────────┐
                                    │                                         │
                               ┌────┴────┐    ┌───────────┐    ┌────────────┐ │
                               │Hydration│    │ Moonbeam  │    │   Acala    │ │
                               │  LP     │    │  Lending  │    │  Staking   │ │
                               │ 2034    │    │   2004    │    │   2000     │ │
                               └─────────┘    └───────────┘    └────────────┘ │
```

### Interface Contracts

**1. IPVMEngine.sol**
```solidity
interface IPVMEngine {
    function optimizeAllocation(bytes calldata input) external view returns (bytes memory);
    function rebalanceBasket(bytes calldata input) external view returns (bytes memory);
}
```

**2. IXCMPrecompile.sol**
```solidity
interface IXCMPrecompile {
    function sendXCM(uint32 destParaId, bytes calldata xcmMessage) external;
    function teleportAsset(uint32 destParaId, uint256 amount, address beneficiary) external;
}
```

---

## 6. PVM Engine Integration

### Integration Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PVM Engine Integration Flow                          │
└─────────────────────────────────────────────────────────────────────────────┘

    BasketManager Contract                  PVM Engine (Precompile)
           │                                        │
           │  1. Rebalance triggered               │
           │  ──────────────────────────────────►  │
           │                                        │
           │  2. Encode input:                    │
           │     [num_protocols: u32]              │
           │     [current_weights: u16[]]          │
           │     [target_weights: u16[]]           │
           │     [threshold: u16]                  │
           │                                        │
           │  3. staticcall to 0x0900             │
           │  ──────────────────────────────────►  │
           │                                        │
           │                                        │  ┌─────────────────────┐
           │                                        │  │ PolkaVM Runtime     │
           │                                        │  │                     │
           │                                        │  │ 1. Parse input      │
           │                                        │  │ 2. Execute          │
           │                                        │  │    rebalance_basket │
           │                                        │  │ 3. Return output    │
           │                                        │  │                     │
           │                                        │  └─────────────────────┘
           │  4. Output:                           │
           │     [needs_rebalance: u8] ◄──────────  │
           │     [new_weights: u16[]] ◄────────────  │
           │                                        │
           │  5. Decode and apply                  │
           │     if (needs_rebalance)              │
           │        update allocation weights      │
           │                                        │
           ▼                                        ▼
```

### ABI Encoding

**Input (rebalance_basket)**
```
Offset 0-3:    num_protocols (u32, LE)
Offset 4-...:  current_weights[0..n-1] (u16[], LE)
...            target_weights[0..n-1] (u16[], LE)
...            threshold_bps (u16, LE)
```

**Output (rebalance_basket)**
```
Offset 0:      needs_rebalance (u8: 0 or 1)
Offset 1-...:  new_weights[0..n-1] (u16[], LE)
```

---

## 7. Wallet Architecture

### Dual Wallet Support

The system supports two wallet types:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Wallet Architecture                                  │
└─────────────────────────────────────────────────────────────────────────────┘

                         ┌───────────────────┐
                         │   WalletContext   │  (React Context)
                         │   (Global State)  │
                         └─────────┬─────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
              ▼                    ▼                    ▼
    ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
    │  useEVMWallet   │   │  useSubWallet   │   │  useBasketMgr   │
    │  (viem)         │   │  (PAPI)         │   │  (Contract I/F) │
    └────────┬────────┘   └────────┬────────┘   └────────┬────────┘
             │                      │                    │
             │                      │                    │
    ┌────────┴────────┐   ┌────────┴────────┐   ┌────────┴────────┐
    │                │   │                │   │                │
    │ MetaMask /     │   │ Polkadot.js /  │   │  Read:         │
    │ SubWallet      │   │ Talisman       │   │  publicClient  │
    │ (EVM)          │   │ (Substrate)    │   │                │
    │                │   │                │   │  Write:        │
    │                │   │                │   │  walletClient  │
    └────────────────┘   └────────────────┘   └────────────────┘

    EVM Wallet for:                Substrate Wallet for:
    ─────────────────              ───────────────────────
    - Contract calls              - (Future) XCM signing
    - DOT deposits                - (Future) Cross-chain
    - Token transfers               operations
```

### useEVMWallet.ts Details

```typescript
// Detects injected EVM provider
function getEVMProvider(): EVMProvider | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & { 
    SubWallet?: EVMProvider & { isSubWallet?: boolean }; 
    ethereum?: EVMProvider 
  };
  if (w.SubWallet?.isSubWallet) return w.SubWallet;
  if (w.ethereum) return w.ethereum;
  return null;
}

// Creates viem WalletClient
const client = createWalletClient({
  account: accountAddress,
  chain: polkadotHubTestnet,  // Westend Asset Hub (420420421)
  transport: custom(provider),
});
```

### Wallet Connection Flow

```
    User clicks "Connect Wallet"
            │
            ▼
    ┌───────────────────┐
    │  useEVMWallet     │
    │  .connect()       │
    └────────┬──────────┘
             │
             ▼
    ┌───────────────────────────────────┐
    │  provider.request({              │
    │    method: "eth_requestAccounts",│
    │    params: []                    │
    │  })                              │
    └──────────────┬───────────────────┘
                   │
                   ▼ (returns [address])
    ┌───────────────────────────────────┐
    │  createWalletClient({            │
    │    account: address,             │
    │    chain: polkadotHubTestnet,    │
    │    transport: custom(provider)   │
    │  })                              │
    └──────────────┬───────────────────┘
                   │
                   ▼
    ┌───────────────────────────────────┐
    │  WalletContext updated:           │
    │  - address: 0x1234...            │
    │  - walletClient: <Client>         │
    │  - isConnected: true              │
    └───────────────────────────────────┘
```

---

## 8. Deployment Topology

### Network Configuration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Deployment Topology — Westend Testnet                   │
└─────────────────────────────────────────────────────────────────────────────┘

    Development/Testing
    ┌───────────────────────────────────────────────────────────────────────┐
    │                                                                        │
    │   Local Hardhat Node (optional)                                        │
    │   ┌──────────────────────────────────────────────────────────────────┐ │
    │   │ http://localhost:8545                                           │ │
    │   │ Chain ID: 420420421 (simulated)                                 │ │
    │   └──────────────────────────────────────────────────────────────────┘ │
    │                                    OR                                  │
    │   Chopsticks Fork                                                     │
    │   ┌──────────────────────────────────────────────────────────────────┐ │
    │   │ npx chopsticks xcm --config hub.yml --config hydration.yml      │ │
    │   │ ws://localhost:8000 (Hub), ws://localhost:8001 (Hydration)      │ │
    │   └──────────────────────────────────────────────────────────────────┘ │
    │                                                                        │
    └───────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
    ┌───────────────────────────────────────────────────────────────────────┐
    │  Westend Asset Hub Testnet                                           │
    │                                                                        │
    │  RPC: https://westend-asset-hub-eth-rpc.polkadot.io                   │
    │  Chain ID: 420420421                                                  │
    │  Explorer: https://assethub-westend.subscan.io                        │
    │                                                                        │
    │  ┌──────────────────────────────────────────────────────────────────┐ │
    │  │ Deployed Contracts:                                             │ │
    │  │   • BasketManager:     0x____________________________ (TBD)     │ │
    │  │   • BasketToken(s):   0x____________________________ (per basket)│ │
    │  │   • PVM Engine:       0x0000000000000000000000000000000000000900│ │
    │  │   • XCM Precompile:   0x0000000000000000000000000000000000000800│ │
    │  └──────────────────────────────────────────────────────────────────┘ │
    │                                                                        │
    │  Testnet Tokens:                                                       │
    │  • WND (Westend DOT) from faucet: https://faucet.polkadot.io/westend │
    │                                                                        │
    └───────────────────────────────────────────────────────────────────────┘
```

### Deployment Steps

```bash
# 1. Fund deployer wallet with testnet WND
#    https://faucet.polkadot.io/westend

# 2. Set private key
export PRIVATE_KEY=your_hex_key_here

# 3. Deploy contracts
cd tele-basket/contracts
npx hardhat run scripts/deploy.ts --network polkadotHub

# 4. Update frontend config
#    Copy deployed BasketManager address to src/config/contracts.ts
#    Update BASKET_MANAGER_ADDRESS = "0x..."

# 5. Start frontend
cd tele-basket
npm run dev
```

---

## 9. Security Considerations

### Smart Contract Security

| Concern | Mitigation |
|---------|------------|
| **Reentrancy** | Use OpenZeppelin's `ReentrancyGuard` on state-modifying functions |
| **Access Control** | `onlyOwner` modifier on privileged functions (createBasket) |
| **Integer Overflow** | Solidity 0.8.20 built-in overflow checks |
| **Input Validation** | Validate allocations sum to 10000 bps |
| **XCM Failures** | Implement retry mechanism, monitor message status |

### PVM Engine Security

| Concern | Mitigation |
|---------|------------|
| **Deterministic Execution** | Same input always produces same output |
| **No External Calls** | Pure computation, no storage access |
| **Bounded Execution** | Limited input size prevents infinite loops |
| **Type Safety** | Rust's type system prevents many bugs at compile time |

### Wallet Security

| Concern | Mitigation |
|---------|------------|
| **Private Key Handling** | Never store keys in frontend; use injected wallet |
| **Phishing** | Display clear wallet address, verify on chain |
| **Network Selection** | Warn if connected to wrong chain (420420421) |

---

## 10. Future Enhancements

### Phase 2 Features

1. **Dynamic Yield Oracle**
   - Fetch real-time APY from each protocol
   - Feed yields to PVM engine for optimal allocation

2. **ZK Rebalancing Proof**
   - Generate ZK proof of valid rebalance computation
   - Verify on-chain for trustless rebalancing

3. **Additional Baskets**
   - Stablecoin basket (USDC/USDT)
   - Liquid staking basket (vDOT)
   - Multi-asset basket (DOT + USDT)

4. **Governance**
   - Token holder voting on basket parameters
   - Propose new allocation strategies

5. **Cross-Chain Withdrawal**
   - Withdraw to any connected parachain
   - Unified user experience

### Integration Opportunities

- **Bifrost**: vDOT liquid staking integration
- **Zenlink**: Cross-chain DEX routing
- **Interlay**: BTC bridge for wrapped Bitcoin baskets

---

## Appendix: File Reference

### Key Source Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Root router + WalletProvider wrapper |
| `src/contexts/WalletContext.tsx` | Global wallet state |
| `src/hooks/useEVMWallet.ts` | EVM wallet connection |
| `src/hooks/useBasketManager.ts` | Contract interaction hooks |
| `src/components/DepositForm.tsx` | Deposit UI component |
| `src/config/contracts.ts` | Contract addresses + ABIs |
| `contracts/BasketManager.sol` | Core protocol contract |
| `contracts/BasketToken.sol` | ERC-20 token per basket |
| `pvm-engine/src/lib.rs` | PVM entry points |
| `pvm-engine/src/allocation.rs` | Yield optimization |
| `pvm-engine/src/rebalance.rs` | Drift detection |
| `xcm/messages/index.ts` | XCM message builders |

### Test Coverage

```
contracts/test/BasketManager.test.ts
├── createBasket
│   ├── ✔ should create a new basket with correct parameters
│   ├── ✔ should reject invalid allocations (not summing to 10000)
│   └── ✔ should increment basket IDs correctly
├── deposit
│   ├── ✔ should accept deposits and mint tokens 1:1
│   ├── ✔ should reject zero deposits
│   └── ✔ should reject deposits to inactive baskets
├── getBasketNAV
│   ├── ✔ should return correct NAV after deposit
│   └── ✔ should return 0 for non-existent baskets
└── owner
    ├── ✔ should set correct owner
    └── ✔ should only allow owner to create baskets

10 passing (356ms)
```

---

*Document Version: 1.0*  
*Last Updated: March 2026*  
*Project: tele-basket - Cross-Chain DeFi Basket Protocol*