# Track 2: PVM Smart Contracts — TeleBasket Roadmap

**Hackathon track:** Unlock the speed and power of Polkadot Virtual Machine  
**Prize pool:** $15,000 (1st x2: $3,000 | 2nd x2: $2,000 | 3rd x2: $1,000 | Honorable x6: $500)

**Track categories:**
1. **PVM-experiments** — Call Rust or C++ libraries from Solidity  
2. **Applications using Polkadot native Assets**  
3. **Accessing Polkadot native functionality** — Build with precompiles  

---

## Where You Are Now

### Done

| Area | What's in place |
|------|------------------|
| **UI** | Landing page, Baskets list, Portfolio, Basket detail, “How it works” section, thin footer, rebrand (silver/white, no logo, no network selector) |
| **Wallet** | SubWallet (Substrate) in navbar: connect via `injectedWeb3['subwallet-js']`, show address, disconnect, “Install SubWallet” link if missing |
| **Contracts** | `BasketManager.sol`, `BasketToken.sol`, interfaces (IXCMPrecompile, IPVMEngine), mocks — see `docs/CONTRACTS.md` |
| **PVM engine** | Rust allocation/rebalance/risk in `pvm-engine/` — see `docs/PVM_ENGINE.md` |
| **Frontend wiring** | `useBasketManager`, config/ABIs, BasketCard, DepositForm, AllocationChart, XCMStatus (structure exists) |

### Not done (high level)

- **Wallet → contracts:** UI still uses mock data; SubWallet (Substrate) is not yet wired to the **EVM** side of the app (contract calls). You will need either an EVM-compatible flow (e.g. SubWallet EVM provider) or to connect contract calls to the same chain via a different path.
- **Contracts on chain:** Not deployed to a live/testnet PolkaVM environment.
- **PVM precompile:** Rust engine not compiled to PolkaVM bytecode and not deployed as a precompile.
- **XCM:** Message builders exist; no sovereign account derivation, Chopsticks, or end-to-end XCM tests.
- **Withdraw / Rebalance:** Forms or flows not fully wired to contracts.

---

## How TeleBasket Fits Track 2

| Category | How you use it |
|----------|----------------|
| **PVM-experiments (Rust/C++ from Solidity)** | `BasketManager.sol` calls a **PVM precompile** that runs your **Rust** allocation engine (`pvm-engine/`). Solidity does `staticcall` to the precompile; the precompile runs RISC-V bytecode produced from Rust. This is the main “Rust from Solidity” story. |
| **Polkadot native Assets** | Basket positions are backed by **DOT** and DOT-denominated positions on parachains (Hydration LP, Moonbeam lending, etc.). You use native DOT and cross-chain assets via XCM. |
| **Native functionality / precompiles** | You rely on **XCM precompile** (and possibly others) to send DOT and execute calls on other chains. Your **custom precompile** is the PVM Rust engine. Both “precompiles” and “native functionality” are central. |

**Demo pitch:** “One deposit, one basket token. Allocation math runs in a PVM Rust precompile; XCM precompile moves DOT across chains.”

---

## Further Steps (in order)

### 1. Align wallet and contract layer

- **SubWallet** is Substrate-first. Your contracts are EVM (PolkaVM/Solidity).
  - Option A: Use **SubWallet’s EVM provider** (`window.SubWallet`) on a chain where your contracts run, and connect the same account (or a derived EVM address) for contract calls. See SubWallet’s “Integrate SubWallet with EVM DApp” doc.
  - Option B: Keep SubWallet for “identity”/account display and add a separate EVM wallet (e.g. MetaMask / Injected) for signing contract txs. Less clean but faster to wire.
- **In the UI:** Replace mock basket data and mock “Connect” with:
  - Reading baskets from `BasketManager` (or your backend indexer).
  - Using the chosen wallet (EVM) for `deposit`, `withdraw`, `rebalance` in `useBasketManager` (see `hooks/useBasketManager.ts` and `components/DepositForm.tsx`).

**Docs to use:** `docs/CONTRACTS.md`, `docs/XCM_AND_FRONTEND.md`, SubWallet EVM integration.

---

### 2. Get contracts running locally / on testnet

- **Hardhat + PolkaVM:** Use your existing `contracts/` and `hardhat.config.ts`. Target a PolkaVM-compatible chain (e.g. a Hub testnet or local node).
- **Compile and test:**
  ```bash
  cd contracts && npm install && npx hardhat compile && npx hardhat test
  ```
- **Deploy:** Run `scripts/deploy.ts` (or your deploy script) against a testnet RPC. Update frontend `config/contracts.ts` (or equivalent) with deployed addresses.

**Docs:** `docs/CONTRACTS.md`, `docs/STATUS.md` (contract table).

---

### 3. PVM Rust engine → precompile (Track 2 core)

- **Build for PolkaVM:** Compile the Rust crate in `pvm-engine/` to RISC-V bytecode (e.g. `riscv32em-unknown-none-elf`) with the toolchain recommended by the PolkaVM team (e.g. `polkatool` / docs).
- **Register as precompile:** Follow Polkadot Hub / PolkaVM docs to register your bytecode as a precompile and get a contract address.
- **Call from Solidity:** In `BasketManager.sol`, replace any mock or stub with a `staticcall` to that precompile address and pass the inputs your Rust engine expects (e.g. allocation params). Map the return data to your structs (e.g. allocation weights).
- **Document for judges:** Short section in README or a separate “PVM” doc: “We call a Rust library from Solidity via a PVM precompile” and point to `pvm-engine/` and the precompile registration.

**Docs:** `docs/PVM_ENGINE.md`, PolkaVM / Polkadot Hub precompile and build docs.

---

### 4. XCM: sovereign accounts and real messages

- **Sovereign account derivation:** Implement (or reuse) the derivation rules so that your BasketManager contract (or its treasury) is the sovereign account on Hydration, Moonbeam, etc. Your `xcm/` message builders should use these accounts and correct chain IDs.
- **Chopsticks (or similar):** Set up a local fork so you can test XCM without mainnet. Run a “deposit to Hydration” (or mock) flow end-to-end.
- **Integration test:** One test that: deploy → deposit DOT → trigger XCM → assert state change on destination (or mock). Document in `docs/XCM_AND_FRONTEND.md`.

**Docs:** `docs/XCM_AND_FRONTEND.md`, `xcm/messages/`, `docs/POLKABASKET_IMPLEMENTATION_PLAN.md` (XCM section).

---

### 5. Frontend → live contracts and flows

- **Baskets page:** Load basket list and TVL from `BasketManager` (or indexer) instead of `MOCK_BASKETS`.
- **Basket detail:** Load allocations, NAV, and user position from contracts (and PVM precompile if exposed).
- **Deposit:** Already structured in `DepositForm`; connect to `useBasketManager.deposit` with the real EVM wallet and contract addresses.
- **Withdraw:** Implement withdraw flow (burn basket tokens, withdraw DOT) and add a withdraw form or tab that calls the same contract.
- **Rebalance:** If rebalance is callable by users or keepers, add a “Rebalance” button that triggers the contract (and thus the PVM precompile path).

**Docs:** `docs/STATUS.md` (Frontend table), `docs/XCM_AND_FRONTEND.md`.

---

### 6. Polish for judging and demo

- **README:** One-page setup: clone, install, run frontend, run contracts tests, (optional) run local chain + deploy. Call out Track 2 and the three categories (PVM-experiments, native assets, precompiles).
- **Demo video (5 min):** (1) Problem: fragmented DOT across chains. (2) Solution: one deposit, one token, allocation by PVM Rust. (3) Quick UI: connect SubWallet, pick basket, deposit. (4) Show contract + precompile in code. (5) XCM: “DOT goes to Hydration/Moonbeam via XCM.”
- **Judging alignment:** In the submission, explicitly say: “We use a **PVM precompile** (Rust) called from **Solidity**; we use **Polkadot native assets** (DOT) and **XCM precompile** for cross-chain execution.”

---

## Checklist (copy and tick)

- [ ] Wallet: SubWallet (or EVM provider) used for contract txs; address shown in navbar.
- [ ] Contracts: Compile + test pass; deploy to testnet; addresses in frontend config.
- [ ] PVM engine: Build to RISC-V; register precompile; BasketManager calls it.
- [ ] XCM: Sovereign accounts; at least one E2E or Chopsticks test.
- [ ] Frontend: Baskets from contract; deposit/withdraw/rebalance wired.
- [ ] README: Setup + Track 2 alignment.
- [ ] Demo: 5-min video covering problem, solution, UI, and PVM/XCM.

---

## References in this repo

| Doc | Use for |
|-----|--------|
| `docs/STATUS.md` | Current status, quick start, next steps |
| `docs/CONTRACTS.md` | Contract specs, PolkaVM notes, interfaces |
| `docs/PVM_ENGINE.md` | Rust engine design, entry points, build |
| `docs/POLKABASKET_IMPLEMENTATION_PLAN.md` | Full architecture, sprints, XCM |
| `docs/XCM_AND_FRONTEND.md` | XCM + frontend integration |
| `docs/TRACK2_ROADMAP.md` | This file — Track 2 alignment and further steps |

---

*Last updated: with basic UI and SubWallet integration complete; contract and PVM work pending.*
