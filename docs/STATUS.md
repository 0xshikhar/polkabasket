# TeleBasket Project Status

## Project Overview

**TeleBasket** is a cross-chain DeFi basket primitive for Polkadot Hub (PolkaVM). Users deposit DOT once and receive a basket token representing capital deployed across multiple parachain protocols (Hydration, Moonbeam, Acala).

**Last Updated:** March 19, 2026

---

## Implementation Status Summary

| Layer | Status | Notes |
|-------|--------|-------|
| Smart Contracts | 🟢 ~90% | Core logic done, tests passing |
| PVM Engine | 🟢 ~85% | Rust logic complete, PolkaVM build pending |
| Frontend | 🟢 ~85% | Core UI complete, components wired |
| XCM Integration | 🟡 ~50% | Message builders exist, testing needed |

---

### ✅ Completed

#### Smart Contracts (`contracts/`)

| Contract | Status | Description |
|----------|--------|-------------|
| `BasketToken.sol` | ✅ Complete | ERC-20 token with mint/burn by manager |
| `BasketManager.sol` | ✅ Complete | Core logic: createBasket, deposit, withdraw, rebalance |
| `IXCMPrecompile.sol` | ✅ Complete | XCM precompile interface |
| `IPVMEngine.sol` | ✅ Complete | PVM engine interface |
| `IBasketManager.sol` | ✅ Complete | Full interface definition |
| `MockDOT.sol` | ✅ Complete | Mock DOT for testing |
| `MockHydrationLP.sol` | ✅ Complete | Mock LP (1 DOT = 1000 LP) |
| `MockMoonbeamLending.sol` | ✅ Complete | Mock lending (5% APY) |

#### PVM Engine (`pvm-engine/`)

| Module | Status | Description |
|--------|--------|-------------|
| `allocation.rs` | ✅ Complete | Optimal allocation weights calculation |
| `rebalance.rs` | ✅ Complete | Drift detection and rebalancing |
| `risk.rs` | ✅ Complete | Risk-adjusted yield scoring |
| `lib.rs` | ✅ Complete | Entry points for PolkaVM |
| Tests | ✅ Complete | Unit tests for all modules |

#### Frontend (`src/`)

| Component | Status | Description |
|-----------|--------|-------------|
| `BasketPage.tsx` | ✅ Complete | Main basket page |
| `DepositForm.tsx` | ✅ Complete | Deposit DOT, mint tokens |
| `WithdrawForm.tsx` | ✅ Complete | Withdraw DOT, burn tokens |
| `AllocationChart.tsx` | ✅ Complete | Pie chart of allocations |
| `XCMStatus.tsx` | ✅ Complete | XCM message status |
| `BasketCard.tsx` | ✅ Complete | Basket summary card |
| `RebalancePanel.tsx` | ✅ Complete | Trigger rebalancing |
| `useBasketManager.ts` | ✅ Complete | Contract interaction hook |
| `useEVMWallet.ts` | ✅ Complete | EVM wallet connection |
| `WalletContext.tsx` | ✅ Complete | Multi-chain wallet context |
| `contracts.ts` | ✅ Complete | Config, ABIs, addresses |

#### Configuration

| File | Status | Description |
|------|--------|-------------|
| `hardhat.config.ts` | ✅ Complete | Hardhat config + deploy task |
| `package.json` | ✅ Complete | Dependencies and scripts |
| `vite.config.ts` | ✅ Complete | Vite build config |
| `tsconfig.json` | ✅ Complete | TypeScript config |
| `README.md` | ✅ Complete | Project documentation |

#### Scripts (`contracts/`)

| Script | Status | Description |
|--------|--------|-------------|
| `deploy.ts` | ✅ Complete | Deploy BasketManager |
| `test-deploy.ts` | ✅ Complete | Deploy with mocks |
| `fund-wallet.ts` | ✅ Complete | Fund test wallets |
| `tasks/deploy.ts` | ✅ Complete | Hardhat deploy task |

---

### ⏳ Pending / Not Implemented

#### Smart Contracts

| Item | Priority | Status | Description |
|------|----------|--------|-------------|
| Unit Tests | 🔴 High | ✅ Done | All 10 tests passing |
| Integration Tests | 🔴 High | ⏳ Pending | Cross-chain XCM tests |
| Mock XCM Precompile | 🟡 Medium | ✅ Done | `MockXCMPrecompile.sol` exists |
| Mock PVM Engine | 🟡 Medium | ✅ Done | `MockPVMEngine.sol` created |

#### PVM Engine

| Item | Priority | Status | Description |
|------|----------|--------|-------------|
| PolkaVM Build | 🔴 High | ❌ Not Done | Compile to RISC-V bytecode |
| Deployment to Testnet | 🔴 High | ❌ Not Done | Deploy as precompile |
| Cargo Workspace | 🟡 Medium | ❌ Missing | No workspace config |

#### Frontend

| Item | Priority | Status | Description |
|------|----------|--------|-------------|
| Wallet Connection | 🔴 High | 🟡 Partial | `useEVMWallet.ts`, `useSubWallet.ts` exist but incomplete |
| Withdraw Form | 🔴 High | ❌ Missing | No withdraw UI component |
| Rebalance Panel | 🟡 Medium | ❌ Missing | No rebalance UI |
| Live XCM Status | 🟡 Medium | 🟡 Partial | Component exists but not wired |
| Real-time Data | 🟡 Medium | ❌ Missing | No WebSocket for updates |

#### XCM Integration

| Item | Priority | Status | Description |
|------|----------|--------|-------------|
| XCM Message Builders | ✅ Complete | ✅ Done | Structure in `xcm/messages/` |
| Sovereign Account Utils | 🔴 High | ❌ Not Implemented | No derivation functions |
| Chopsticks Setup | 🔴 High | ❌ Not Done | No local fork testing |
| Integration Tests | 🔴 High | ❌ Not Implemented | End-to-end XCM flow |

#### Documentation

| Item | Priority | Status | Description |
|------|----------|--------|-------------|
| README.md | 🔴 High | ❌ Missing | No project README |
| Demo Video | 🔴 High | ❌ Not Recorded | 5-min demo needed |
| API Documentation | 🟡 Medium | ❌ Missing | Contract API docs |

---

## Quick Start

### Frontend Development

```bash
cd tele-basket
npm install
npm run dev
```

### Contract Development

```bash
cd tele-basket/contracts
npm install
npx hardhat compile
npx hardhat test
npx hardhat run scripts/deploy.ts
```

### PVM Engine Development

```bash
cd tele-basket/pvm-engine
cargo test
# Build for PolkaVM (requires nightly):
cargo build --release --target riscv32em-unknown-none-elf -Z build-std=core,alloc
```

---

## Architecture

```
User
  │  deposit(DOT)
  ▼
┌──────────────────────────────┐
│   BasketManager.sol          │  ← Polkadot Hub (PolkaVM)
│   - createBasket()           │
│   - deposit()                │
│   - withdraw()               │
│   - rebalance()              │
└────────────┬─────────────────┘
             │ staticcall
             ▼
┌──────────────────────────────┐
│   PVM Precompile (Rust)     │
│   - optimize_allocation()    │
│   - rebalance_basket()      │
│   - risk_adjusted_yield()   │
└────────────┬─────────────────┘
             │ returns weights
             ▼
┌──────────────────────────────┐
│   XCM Executor              │
│   - teleport DOT            │
│   - execute remote calls    │
└──────┬──────────┬────────────┘
        │          │
        ▼          ▼
   Hydration    Moonbeam
   LP deposit   Lending deposit
```

---

## Testnet Configuration

| Chain | Parachain ID | RPC |
|-------|--------------|-----|
| Polkadot Hub | 1000 | `https://westend-asset-hub-eth-rpc.polkadot.io` |
| Hydration | 2034 | TBD |
| Moonbeam | 2004 | TBD |
| Acala | 2000 | TBD |

---

## Next Steps (Priority Order)

### Immediate (This Week)

1. **Run contract tests**
   ```bash
   cd tele-basket/contracts
   npm install
   npx hardhat test
   ```

2. **Set up wallet connection in frontend**
   - Add EVM wallet connection
   - Connect to testnet

3. **Add withdraw functionality**
   - Implement withdraw form
   - Test withdraw flow

### Short-term (2-3 weeks)

4. **XCM Integration**
   - Set up Chopsticks local fork
   - Test actual XCM messages

5. **Deploy to testnet**
   - Deploy contracts to Westend Asset Hub
   - Create basket on testnet

6. **Demo preparation**
   - Record demo video
   - Write README

### Long-term

7. **Production**
   - Deploy to Polkadot mainnet
   - Add real protocol integrations
   - Implement oracle for yields

---

## Implementation Priority List

### 🔴 CRITICAL (Must Complete This Week)

| # | Task | Status | Files/Components |
|---|------|--------|------------------|
| 1 | **Run contract tests** | ✅ Done | `contracts/test/BasketManager.test.ts` - 10 tests passing |
| 2 | **Fix wallet connection** | ✅ Done | `useEVMWallet.ts`, `WalletContext.tsx` |
| 3 | **Create WithdrawForm component** | ✅ Done | `src/components/WithdrawForm.tsx` |
| 4 | **Wire deposit flow end-to-end** | ✅ Done | Connect DepositForm → useBasketManager → contract |
| 5 | **Deploy contracts to testnet** | ✅ Done | `npx hardhat deploy` task + scripts |

### 🟡 HIGH (Next 1-2 Weeks)

| # | Task | Estimated Effort | Files/Components |
|---|------|------------------|------------------|
| 6 | **Add MockPVMEngine** | 2 hrs | Create `contracts/contracts/mocks/MockPVMEngine.sol` |
| 7 | **Build RebalancePanel UI** | 3 hrs | `src/components/RebalancePanel.tsx` (missing) |
| 8 | **Wire XCM status display** | 3 hrs | `src/components/XCMStatus.tsx` → actual XCM tracking |
| 9 | **Set up Chopsticks fork** | 4 hrs | Local XCM testing environment |
| 10 | **Test XCM deposit flow** | 6 hrs | Hub → Hydration → Moonbeam actual messages |

### 🟢 MEDIUM (Hackathon Deadline)

| # | Task | Estimated Effort | Files/Components |
|---|------|------------------|------------------|
| 11 | **Compile PVM Engine to RISC-V** | 4 hrs | `pvm-engine/` → PolkaVM bytecode |
| 12 | **Write README** | 2 hrs | Project setup + architecture |
| 13 | **Record demo video** | 3 hrs | 5-min walkthrough |
| 14 | **Create landing page** | 2 hrs | `src/pages/HomePage.tsx` |

### ⚪ LOW (Post-Hackathon)

| # | Task | Estimated Effort |
|---|------|------------------|
| 15 | Implement oracle for yields | 1 week |
| 16 | Deploy PVM precompile on-chain | 2 days |
| 17 | Add Acala integration | 3 days |
| 18 | Real-time WebSocket updates | 2 days |

---

## Gap Analysis: What Was Planned vs What's Done

### Smart Contracts
- ✅ BasketManager.sol - Core logic implemented
- ✅ BasketToken.sol - ERC-20 with mint/burn
- ✅ IXCMPrecompile.sol - Interface defined
- ✅ IPVMEngine.sol - Interface defined
- ✅ IBasketManager.sol - Full interface
- ✅ MockDOT.sol, MockHydrationLP.sol, MockMoonbeamLending.sol - Done
- ✅ MockXCMPrecompile.sol - Created for testing
- ✅ BasketManager.test.ts - **All 10 tests passing**
- ✅ MockPVMEngine.sol - **CREATED** for local testing

### PVM Engine (Rust)
- ✅ allocation.rs - Weight calculation
- ✅ rebalance.rs - Drift detection
- ✅ risk.rs - Risk-adjusted yield
- ✅ lib.rs - Entry points
- ✅ Tests in each module
- ❌ PolkaVM build (riscv32em-unknown-none-elf)
- ❌ Deployment as precompile

### Frontend
- ✅ BasketPage.tsx - Main page
- ✅ DepositForm.tsx - Deposit UI
- ✅ WithdrawForm.tsx - **CREATED**
- ✅ AllocationChart.tsx - Pie chart
- ✅ XCMStatus.tsx - XCM display component
- ✅ BasketCard.tsx - Summary card
- ✅ RebalancePanel.tsx - **CREATED**
- ✅ useBasketManager.ts - Contract hook
- ✅ useEVMWallet.ts - Wallet connection complete
- ✅ WalletContext.tsx - Multi-chain context
- ✅ contracts.ts - Config/ABIs

### XCM
- 🟡 Message builder structures - **EXIST** but not tested
- ❌ Sovereign account utils - **NOT IMPLEMENTED**
- ❌ Chopsticks setup - **NOT DONE**
- ❌ Integration tests - **NOT IMPLEMENTED**

---

## Known Issues / Risks

| Issue | Severity | Mitigation |
|-------|----------|-------------|
| PVM precompile interface not finalized | Medium | Use fallback to off-chain engine |
| XCM sovereign account derivation | High | Test with Chopsticks first |
| Testnet RPC availability | Medium | Use local fork |
| Frontend wallet connection | Medium | Use dot-connect |

---

## File Structure

```
tele-basket/
├── docs/                          # Documentation
│   ├── CONTRACTS.md
│   ├── PVM_ENGINE.md
│   ├── XCM_AND_FRONTEND.md
│   ├── POLKABASKET_IMPLEMENTATION_PLAN.md
│   └── STATUS.md                  # This file
├── contracts/                     # Solidity contracts
│   ├── contracts/
│   │   ├── BasketManager.sol
│   │   ├── BasketToken.sol
│   │   ├── interfaces/
│   │   │   ├── IBasketManager.sol
│   │   │   ├── IXCMPrecompile.sol
│   │   │   └── IPVMEngine.sol
│   │   └── mocks/
│   │       ├── MockDOT.sol
│   │       ├── MockHydrationLP.sol
│   │       ├── MockMoonbeamLending.sol
│   │       ├── MockXCMPrecompile.sol
│   │       └── MockPVMEngine.sol
│   ├── test/
│   │   └── BasketManager.test.ts
│   ├── scripts/
│   │   ├── deploy.ts
│   │   ├── test-deploy.ts
│   │   ├── check-balance.ts
│   │   └── fund-wallet.ts
│   ├── tasks/
│   │   └── deploy.ts              # Hardhat deploy task
│   ├── hardhat.config.ts
│   └── package.json
├── pvm-engine/                    # Rust allocation engine
│   ├── Cargo.toml
│   ├── build.rs
│   └── src/
│       ├── lib.rs
│       ├── allocation.rs
│       ├── rebalance.rs
│       └── risk.rs
├── xcm/                           # XCM utilities
│   └── messages/
│       └── index.ts
├── src/                           # Frontend (React)
│   ├── App.tsx
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── BasketsPage.tsx
│   │   ├── BasketPage.tsx
│   │   └── PortfolioPage.tsx
│   ├── components/
│   │   ├── DepositForm.tsx
│   │   ├── WithdrawForm.tsx
│   │   ├── AllocationChart.tsx
│   │   ├── XCMStatus.tsx
│   │   ├── BasketCard.tsx
│   │   ├── RebalancePanel.tsx
│   │   ├── Navbar.tsx
│   │   ├── AccountList.tsx
│   │   ├── ChainSwitch.tsx
│   │   └── Loading.tsx
│   ├── hooks/
│   │   ├── useBasketManager.ts
│   │   ├── useBasketToken.ts
│   │   ├── usePVMEngine.ts
│   │   ├── useXCMStatus.ts
│   │   ├── useEVMWallet.ts
│   │   └── useSubWallet.ts
│   ├── contexts/
│   │   └── WalletContext.tsx
│   ├── layouts/
│   │   └── Layout.tsx
│   └── config/
│       └── contracts.ts
├── README.md
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## Contact / Resources

- Hackathon Discord: https://discord.gg/BZWkdy5w5b
- PolkaVM Docs: https://docs.polkadot.com/develop/smart-contracts/
- XCM Docs: https://docs.polkadot.com/develop/interoperability/xcm/
- polkatool: https://openguild.wtf/blog/polkadot/polkadot-introduction-to-polkatool

---

*Last updated: March 19, 2026*
