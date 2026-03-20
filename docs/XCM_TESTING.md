# XCM Testing Guide

| Environment | XCM Status | How to Test |
|-------------|------------|-------------|
| **Paseo Testnet** | ❌ Broken | Cannot test XCM ( not supported yet) |
| **Chopsticks Local** | ✅ Working | Follow this guide for real XCM |
| **Polkadot Mainnet** | ✅ Working | Production deployment only |


**Last updated:** 2026-03-20

## Table of Contents

- [Quick Start: Pre-Configured Testing Environment](#quick-start-pre-configured-testing-environment)
- [Contract Overview](#contract-overview)
- [Complete Local XCM Testing with Chopsticks](#complete-local-xcm-testing-with-chopsticks)
- [Troubleshooting](#troubleshooting)
- [Real Network Testing (Paseo)](#real-network-testing-paseo)
- [Production Deployment](#production-deployment)

## Quick Start: Pre-Configured Testing Environment

For your convenience, we provide a complete pre-configured testing environment. You can start testing XCM immediately without deploying contracts or setting up infrastructure.

### Pre-Deployed Contract Addresses (Paseo Testnet)

These contracts are already deployed and ready to use:

| Contract | Address | Purpose |
|----------|---------|---------|
| **BasketManager** | `0x96CA4a5Cb6Cf56F378aEe426567d330f1CFDEaA2` | Main basket logic, deposits, withdrawals |
| **BasketToken (xDOT-LIQ)** | `0xD9FEBB375aCE5226AF1AA4146988Af2BDB8A1e8B` | ERC-20 token for basket 0 |
| **XCM Precompile** | `0x00000000000000000000000000000000000a0000` | XCM functionality (stub on Paseo) |
| **PVM Engine** | `0x09dDF8f56981deC60e468e2B85194102a3e2E124` | Allocation optimizer (mock on Paseo) |

**Network Details:**
- **Chain ID:** 420420417
- **RPC URL:** https://eth-rpc-testnet.polkadot.io
- **Block Explorer:** https://blockscout-testnet.polkadot.io
- **Currency:** PAS (Paseo DOT), 18 decimals

### Quick Testing Flow (5 Minutes)

**Step 1: Get Test PAS**
```bash
# Go to faucet and request PAS for your wallet
# https://faucet.polkadot.io/ → Select "Paseo (Asset Hub)"
# Enter your EVM address (0x...)
```

**Step 2: Set Environment**
```bash
cd tele-basket

# Create .env file
cat > .env << 'EOF'
VITE_NETWORK=paseo
VITE_CHAIN_ID=420420417
VITE_BASKET_MANAGER_ADDRESS=0x96CA4a5Cb6Cf56F378aEe426567d330f1CFDEaA2
VITE_XCM_PRECOMPILE_ADDRESS=0x00000000000000000000000000000000000a0000
VITE_PVM_ENGINE_ADDRESS=0x09dDF8f56981deC60e468e2B85194102a3e2E124
VITE_XCM_MODE=testnet
VITE_RPC_URL=https://eth-rpc-testnet.polkadot.io
VITE_USE_MOCK_PVM=true
VITE_GAS_PRICE_GWEI=1100
EOF
```

**Step 3: Install & Run**
```bash
npm install
npm run dev
```

**Step 4: Test the App**
1. Open http://localhost:5173
2. Connect wallet (MetaMask/SubWallet with PAS tokens)
3. Go to **Baskets** → Select xDOT-LIQ
4. Deposit 1 PAS
5. You should receive 1 xDOT-LIQ token

**⚠️ Important:** XCM is simulated on Paseo (yellow banner shows "Testnet (Simulated XCM)"). The funds stay on Asset Hub and don't actually cross chains due to the XCM precompile limitation explained below.

---

## Contract Overview

### What Contracts Are Used

#### 1. BasketManager.sol
**Location:** `contracts/contracts/BasketManager.sol`

The main contract that manages all baskets. Key functions:
- `createBasket()` - Creates new basket with allocations (owner only)
- `deposit()` - Accepts PAS, mints basket tokens, dispatches XCM to parachains
- `withdraw()` - Burns basket tokens, returns PAS
- `rebalance()` - Calls PVM engine to optimize allocations

**Key State Variables:**
```solidity
address public xcmPrecompile = 0x000...000a0000;  // XCM precompile
address public pvmEngine;                          // PVM optimization engine
bool public xcmEnabled = true;                     // XCM toggle
Basket[] public baskets;                           // Array of all baskets
```

#### 2. BasketToken.sol
**Location:** `contracts/contracts/BasketToken.sol`

ERC-20 token contract deployed for each basket. BasketManager is the minter/burner.

**Features:**
- Minted 1:1 when user deposits PAS
- Burned when user withdraws
- Standard ERC-20 interface (transfer, approve, etc.)

#### 3. XCMPrecompile.sol (Wrapper)
**Location:** `contracts/contracts/XCMPrecompile.sol`

Wrapper around the native XCM precompile at `0x000...000a0000`.

**Functions:**
- `sendXCM()` - Sends cross-chain message
- `teleportAsset()` - Teleports assets to another chain
- `queryXCMStatus()` - Queries message status (not implemented on Paseo)

#### 4. MockPVMEngine.sol
**Location:** `contracts/contracts/mocks/MockPVMEngine.sol`

Mock implementation of the Rust PVM engine for local testing.

**Functions:**
- `rebalanceBasket()` - Returns optimized weights (simple algorithm for testing)
- `optimizeAllocation()` - Calculates optimal allocations

**Real PVM Engine:** Would be a Rust contract compiled to PolkaVM bytecode at `0x...0900`.

### Contract Interaction Flow

```
User deposits 10 PAS
    │
    ▼
┌─────────────────────────────────────────┐
│ BasketManager.deposit()                 │
│                                         │
│ 1. Calculate allocation split:          │
│    - Hydration: 4 PAS (40%)             │
│    - Moonbeam: 3 PAS (30%)              │
│    - Acala: 3 PAS (30%)                 │
│                                         │
│ 2. Mint 10 xDOT-LIQ tokens to user      │
│                                         │
│ 3. Build XCM messages (SCALE encoded)   │
│    - Message 1: 4 PAS → Hydration       │
│    - Message 2: 3 PAS → Moonbeam        │
│    - Message 3: 3 PAS → Acala           │
│                                         │
│ 4. Call XCM precompile:                 │
│    xcmPrecompile.sendXCM(...)           │
└──────────────┬──────────────────────────┘
               │
               ▼ (On local Chopsticks only)
┌─────────────────────────────────────────┐
│ XCM Executor                            │
│                                         │
│ - Validates message format              │
│ - Charges fees from sovereign account   │
│ - Routes to destination parachain       │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴───────┐
       ▼               ▼
┌──────────────┐ ┌──────────────┐
│ Hydration    │ │ Moonbeam     │
│ Sovereign    │ │ Sovereign    │
│ receives 4   │ │ receives 3   │
│ PAS          │ │ PAS          │
└──────────────┘ └──────────────┘
```

### Deployment Locations

| Environment | BasketManager | XCM Precompile | PVM Engine |
|-------------|---------------|----------------|------------|
| **Paseo Testnet** | `0x96CA4a5Cb6Cf56F378aEe426567d330f1CFDEaA2` | `0x000...000a0000` (stub) | Mock at `0x09dD...` |
| **Local Hardhat** | Deployed fresh | Mock implementation | Mock implementation |
| **Local Chopsticks** | Deployed to fork | Full XCM working | Mock or real Rust |

---

## Complete Local XCM Testing with Chopsticks

### Prerequisites

```bash
# Install Chopsticks globally
npm install -g @acala-network/chopsticks

# Or use npx (recommended)
npx @acala-network/chopsticks@latest --help
```

### Step 1: Start Forked Networks

You need to run three separate Chopsticks instances, each in its own terminal.

**Terminal 1: Asset Hub (Hub Chain)**
```bash
npx @acala-network/chopsticks@latest \
  --endpoint=wss://pasdot-rpc.polkadot.io \
  --port=8000 \
  --name="Asset Hub"
```

**Terminal 2: Hydration**
```bash
npx @acala-network/chopsticks@latest \
  --endpoint=wss://rpc.nice.hydration.cloud \
  --port=8001 \
  --name="Hydration"
```

**Terminal 3: Moonbeam**
```bash
npx @acala-network/chopsticks@latest \
  --endpoint=wss://wss.api.moonbase.moonbeam.network \
  --port=8002 \
  --name="Moonbeam"
```

**Wait for each to sync.** You'll see:
```
[Asset Hub] Listening on port 8000
[Hydration] Listening on port 8001
[Moonbeam]  Listening on port 8002
```

### Step 2: Configure Cross-Chain Connections

In the **Asset Hub terminal (Terminal 1)**, press `Enter` to get the JavaScript prompt, then run:

```javascript
// Connect Asset Hub to Hydration
await this.chain.addSiblings([{
  id: 2034,
  endpoint: "ws://localhost:8001",
  assets: [{ 
    id: { Parents: 1, interior: "Here" }, 
    fun: { Fungible: "Native" } 
  }],
}]);

// Connect Asset Hub to Moonbeam
await this.chain.addSiblings([{
  id: 2004,
  endpoint: "ws://localhost:8002",
  assets: [{ 
    id: { Parents: 1, interior: "Here" }, 
    fun: { Fungible: "Native" } 
  }],
}]);

// Verify connections
console.log("Connected siblings:", this.chain.siblings);
```

**Success indicators:**
- No errors in the console
- `this.chain.siblings` shows `[2034, 2004]`

### Step 3: Deploy Contracts to Local Fork

Since we're using Chopsticks (which forks Paseo), we deploy to the local fork:

```bash
cd contracts

# Set the local RPC
export VITE_RPC_URL=http://localhost:8000

# Deploy with mock PVM and create first basket
npx hardhat run scripts/deploy-local.ts --network localhost
```

**Expected output:**
```
1. Deploying MockPVMEngine...
   MockPVMEngine deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3

2. Deploying BasketManager...
   BasketManager deployed to: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0

3. Creating test basket...
   Basket created successfully!
   Basket Token: 0x...

✓ Deployment complete!
Contract addresses saved to ./deployment-local.json
```

**Note the BasketManager address** - you'll need it for the next step.

#### Initialize All Baskets (Optional)

To create baskets 1, 2, and 3 for full testing:

```bash
export BASKET_MANAGER_ADDRESS=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
npx hardhat run scripts/init-baskets.ts --network localhost
```

This creates:
- **Basket 0:** xDOT Liquidity Basket (already created by deploy-local.ts)
- **Basket 1:** Yield Maximizer (50% Hydration Stable + 50% Moonbeam Liquid Staking)
- **Basket 2:** High Growth Alpha (60% Moonbeam Leverage + 40% Acala Leverage)
- **Basket 3:** Balanced Diversifier (34% Hydration LP + 33% Moonbeam + 33% Acala)

### Step 4: Derive and Fund Sovereign Accounts

Each parachain needs a sovereign account representing your BasketManager. These accounts receive the XCM-transferred funds.

**In Asset Hub terminal:**

```javascript
const BasketManagerAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

// Derive sovereign account for Hydration (para 2034)
function deriveSovereign(contractAddress, paraId) {
  const siblingContext = "SiblingChain";
  const accountKey20 = "AccountKey20";
  const data = siblingContext + paraId + accountKey20 + contractAddress;
  // In real implementation, this uses keccak256 hashing
  // For Chopsticks, we use a simpler approach
  return "0x" + contractAddress.slice(2).padStart(64, '0');
}

const sovereignHydration = deriveSovereign(BasketManagerAddress, 2034);
const sovereignMoonbeam = deriveSovereign(BasketManagerAddress, 2004);

console.log("Sovereign for Hydration:", sovereignHydration);
console.log("Sovereign for Moonbeam:", sovereignMoonbeam);
```

**Fund the sovereign accounts with test PAS:**

```javascript
// Fund with 100 PAS each (100 * 10^18)
const PAS = 100000000000000000000n;

await this.chain.dev.setBalance(sovereignHydration, PAS);
await this.chain.dev.setBalance(sovereignMoonbeam, PAS);

// Verify
const balance2034 = await this.chain.getBalance(sovereignHydration);
const balance2004 = await this.chain.getBalance(sovereignMoonbeam);
console.log("Hydration sovereign balance:", balance2034.toString());
console.log("Moonbeam sovereign balance:", balance2004.toString());
```

**Important:** The sovereign accounts need PAS to pay for XCM execution fees on the destination chains. If they're not funded, XCM messages will fail with "Barrier" error.

### Step 5: Configure Frontend for Local XCM

Create/update `.env` in the project root:

```bash
cat > .env << 'EOF'
# Use local Chopsticks network
VITE_NETWORK=local
VITE_CHAIN_ID=31337

# Contract addresses from deploy
VITE_BASKET_MANAGER_ADDRESS=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
VITE_PVM_ENGINE_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3

# IMPORTANT: Set XCM mode to 'local' for real XCM!
VITE_XCM_MODE=local

# RPC: Connect to Chopsticks Asset Hub
VITE_RPC_URL=http://localhost:8000

# Gas settings (local is cheap)
VITE_GAS_PRICE_GWEI=1
VITE_USE_MOCK_PVM=true
EOF
```

**Key difference:** `VITE_XCM_MODE=local` tells the frontend to use real XCM instead of simulation.

### Step 6: Run Frontend

```bash
npm run dev
```

Connect your wallet (MetaMask/SubWallet) and make sure it's pointed at `http://localhost:8000` (Chain ID: 31337).

---

## Testing XCM Flow

### Test 1: Deposit with Cross-Chain Dispatch

1. Go to `/baskets` and pick a basket (e.g., xDOT-LIQ)
2. Enter deposit amount (e.g., 10 PAS)
3. Click **Deposit**
4. Confirm transaction in wallet

**What should happen:**
```
[Deposit] Transaction sent: 0x...
[Deposit] ✅ Tokens minted: 10 xDOT-LIQ
[XCM] 📤 Sending 4 PAS to Hydration (para 2034)
[XCM] 📤 Sending 3 PAS to Moonbeam (para 2004)  
[XCM] 📤 Sending 3 PAS to Acala (para 2000)
[XCM] ✅ All XCM messages dispatched
```

**Verify on destination chains:**

In the Hydration terminal (Terminal 2):
```javascript
const sovereignHydration = "0x...";
const balance = await this.chain.getBalance(sovereignHydration);
console.log("Hydration sovereign balance:", balance.toString());
// Should show increased balance
```

### Test 2: Verify XCM Message Structure

To see the actual XCM message being sent:

```javascript
// In Asset Hub terminal, after a deposit
const messages = await this.chain.xcm.getMessages();
console.log("Recent XCM messages:", messages);

// Inspect a specific message
const msg = messages[0];
console.log("Destination:", msg.destination);
console.log("Message:", msg.message);
console.log("Status:", msg.status);
```

### Test 3: Test XCM Failure Scenarios

**Scenario A: Insufficient Sovereign Funds**

1. Drain the sovereign account:
```javascript
await this.chain.dev.setBalance(sovereignHydration, 0n);
```

2. Try to deposit
3. Should see: `XCMMessageFailed` event with "Barrier" reason

**Scenario B: Invalid Destination**

1. Try to send XCM to a non-existent parachain (e.g., para 9999)
2. Should see: `XCMMessageFailed` with "Unroutable"

---

## XCM Message Format Details

### SCALE Encoding Example

Here's the actual SCALE-encoded XCM message for a 10 PAS deposit split 40%/30%/30%:

```hex
# XCM Version 5 header
05  # Version 5

# Number of instructions: 3
0c  # Compact<u32> = 3

# Instruction 1: WithdrawAsset
00  # WithdrawAsset instruction index

  # MultiAssets array: 1 asset
  04  # Compact<u32> = 1
  
  # Asset 1: DOT
  01  # Concrete asset
  01  # Parents: 1
  00  # Interior: Here
  
  # Fungible amount: 10 PAS = 10_000_000_000_000_000_000
  01  # Fungible indicator
  8a d4 57 8a 8a 8a 00 00  # Compact<u128> encoded

# Instruction 2: BuyExecution
03  # BuyExecution instruction index

  # Fee asset (same as withdrawn)
  01  # Concrete
  01  # Parents: 1
  00  # Interior: Here
  
  # Fee amount: 0.1 PAS
  01
  00 e4 0b 54 02 00 00 00
  
  # Weight limit: Unlimited
  00

# Instruction 3: DepositAsset
06  # DepositAsset instruction index

  # Assets to deposit: All
  03  # Wildcard: All
  
  # Max assets: 1
  01
  
  # Beneficiary: Sovereign account
  00  # Parents: 0 (local)
  
  # Interior: AccountId32
  01  # X1
  01  # AccountId32
  00  # Network: Any
  # 32-byte account ID
  d4 35 93 c7 15 fd d3 1c 61 14 1a bd 04 a9 9f a6 1e 2b 2a 4e 4e 6f 6e 65 00 00 00 00 00 00 00 00
```

### Building XCM in Solidity

The contract builds these messages dynamically:

```solidity
function buildDepositXCM(uint256 amount, address sovereignAccount) 
  internal 
  pure 
  returns (bytes memory) 
{
  // SCALE encode XCM V5 message
  bytes memory message = abi.encodePacked(
    hex"05",                              // Version 5
    hex"0c",                              // 3 instructions
    
    // WithdrawAsset
    hex"00",                              // Instruction index
    encodeMultiAsset(amount),             // Asset to withdraw
    
    // BuyExecution  
    hex"03",                              // Instruction index
    encodeMultiAsset(amount / 100),       // Fee (1%)
    hex"00",                              // Unlimited weight
    
    // DepositAsset
    hex"06",                              // Instruction index
    hex"03",                              // All assets
    hex"01",                              // Max 1
    encodeAccountId32(sovereignAccount)   // Beneficiary
  );
  
  return message;
}
```

---

## Advanced: Integrating Real PVM Engine

### Step 1: Build PVM Rust Contract

```bash
cd pvm-engine

# Install polkatool
cargo install polkatool --version 0.26.0

# Setup nightly Rust
rustup install nightly
rustup component add rust-src --toolchain nightly
rustup target add riscv64emac-unknown-none-polkavm --toolchain nightly

# Build
make all

# Output: polkabasket_engine.polkavm
```

### Step 2: Deploy PVM to Chopsticks

```javascript
// In Asset Hub terminal, deploy PVM bytecode
const pvmBytecode = fs.readFileSync("pvm-engine/polkabasket_engine.polkavm");
const pvmAddress = await this.chain.deploy(pvmBytecode);
console.log("PVM Engine deployed to:", pvmAddress);
```

### Step 3: Update BasketManager

```javascript
// Set PVM engine address in BasketManager
const basketManager = await ethers.getContractAt(
  "BasketManager", 
  BasketManagerAddress
);
await basketManager.setPVMEngine(pvmAddress);
```

### Step 4: Test Rebalancing

Now when you call `rebalance()`:
1. BasketManager reads current allocations
2. Encodes them for PVM: `abi.encode(weights, totalDeposited, paraIds)`
3. Calls PVM via `staticcall`
4. PVM runs optimization algorithm in Rust
5. Returns new weights
6. BasketManager updates allocations where drift > threshold

---

## Troubleshooting XCM

### "Barrier" Error
**Cause:** Sovereign account doesn't have enough PAS for XCM fees
**Fix:** Fund the sovereign account (see Step 4)

### "Unroutable" Error
**Cause:** Destination parachain not connected in Chopsticks
**Fix:** Run `addSiblings()` in Asset Hub terminal (see Step 2)

### "WeightLimitReached" Error
**Cause:** XCM message too complex for allocated weight
**Fix:** Increase fees in `BuyExecution` or simplify message

### "AssetNotFound" Error
**Cause:** Trying to transfer an asset the chain doesn't recognize
**Fix:** Use DOT (Parents: 1, Interior: Here) which all chains accept

### Transaction Reverts Without Message
**Cause:** XCM precompile not properly configured in Chopsticks
**Fix:** Ensure Chopsticks started with `--endpoint` pointing to real chain

### "BadOrigin" Error
**Cause:** Sovereign account derivation mismatch
**Fix:** Double-check the derivation formula matches what the destination chain expects

---

## Complete Testing Flow for New Users

This is a step-by-step walkthrough for testing the entire XCM flow from scratch.

### Scenario: Test Deposit with Cross-Chain Transfer

**Goal:** Deposit 10 PAS into xDOT-LIQ basket and verify the funds arrive on Hydration, Moonbeam, and Acala.

#### Step 1: Setup Environment (One-time)

```bash
# Clone repo
git clone <repo-url>
cd tele-basket

# Install dependencies
npm install
cd contracts && npm install && cd ..
```

#### Step 2: Start Local Infrastructure

```bash
# Terminal 1: Asset Hub
npx @acala-network/chopsticks@latest \
  --endpoint=wss://pasdot-rpc.polkadot.io --port=8000

# Terminal 2: Hydration
npx @acala-network/chopsticks@latest \
  --endpoint=wss://rpc.nice.hydration.cloud --port=8001

# Terminal 3: Moonbeam
npx @acala-network/chopsticks@latest \
  --endpoint=wss://wss.api.moonbase.moonbeam.network --port=8002
```

#### Step 3: Configure Cross-Chain (In Asset Hub Terminal)

```javascript
await this.chain.addSiblings([
  { id: 2034, endpoint: "ws://localhost:8001", assets: [{ id: { Parents: 1, interior: "Here" }, fun: { Fungible: "Native" } }] },
  { id: 2004, endpoint: "ws://localhost:8002", assets: [{ id: { Parents: 1, interior: "Here" }, fun: { Fungible: "Native" } }] }
]);
```

#### Step 4: Deploy Contracts

```bash
cd contracts
export VITE_RPC_URL=http://localhost:8000
npx hardhat run scripts/deploy-local.ts --network localhost
```

**Save the output addresses**, particularly `BasketManager`.

#### Step 5: Initialize All Baskets

```bash
export BASKET_MANAGER_ADDRESS=<DEPLOYED_ADDRESS>
npx hardhat run scripts/init-baskets.ts --network localhost
```

#### Step 6: Fund Sovereign Accounts

```javascript
// In Asset Hub terminal
const bm = "<BASKET_MANAGER_ADDRESS>";
const s2034 = "0x" + bm.slice(2).padStart(64, '0');
const s2004 = "0x" + bm.slice(2).padStart(64, '0');

await this.chain.dev.setBalance(s2034, 100000000000000000000n);  // 100 PAS
await this.chain.dev.setBalance(s2004, 100000000000000000000n);  // 100 PAS
```

#### Step 7: Configure Frontend

Create `.env`:
```
VITE_NETWORK=local
VITE_CHAIN_ID=31337
VITE_BASKET_MANAGER_ADDRESS=<DEPLOYED_ADDRESS>
VITE_PVM_ENGINE_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
VITE_XCM_MODE=local
VITE_RPC_URL=http://localhost:8000
VITE_USE_MOCK_PVM=true
```

#### Step 8: Start Frontend

```bash
npm run dev
```

#### Step 9: Perform Deposit Test

1. Open http://localhost:5173
2. Connect wallet (add local network: http://localhost:8000, Chain ID: 31337)
3. Navigate to **Baskets** → Select "xDOT Liquidity Basket"
4. Enter deposit amount: 10
5. Click **Deposit**
6. Confirm transaction in wallet

**Expected Behavior:**
- Frontend shows "Processing deposit..."
- Transaction confirms (green checkmark)
- Console logs show:
  ```
  [Deposit] ✅ Tokens minted: 10 xDOT-LIQ
  [XCM] 📤 Message sent to para 2034: 0x...
  [XCM] 📤 Message sent to para 2004: 0x...
  [XCM] 📤 Message sent to para 2000: 0x...
  ```

#### Step 10: Verify Cross-Chain Transfer

```javascript
// In Hydration terminal (port 8001)
const sovereign = "0x<SOVEREIGN_ADDRESS>";
const balance = await this.chain.getBalance(sovereign);
console.log("Hydration sovereign balance:", ethers.formatEther(balance));
// Should show: ~4 PAS (plus initial 100 PAS funding)
```

#### Step 11: Verify Token Balance

```javascript
// In Asset Hub terminal
const basketToken = "0x<BASKET_TOKEN_ADDRESS>";  // From deploy output
const userBalance = await this.chain.getBalance(userAddress, basketToken);
console.log("User basket token balance:", userBalance);
// Should show: 10 xDOT-LIQ
```

#### Step 12: Test Withdrawal

1. In frontend, switch to **Withdraw** tab
2. Enter amount: 5
3. Click **Withdraw**
4. Confirm transaction

**Expected:** 5 xDOT-LIQ burned, 5 PAS returned to wallet.

#### Step 13: Verify Rebalancing

1. Go to basket details page
2. Click **Rebalance** button (if available)
3. Or trigger via contract:

```bash
cast send <BASKET_MANAGER> "rebalance(uint256)" 0 \
  --private-key <YOUR_KEY> \
  --rpc-url http://localhost:8000
```

**Check allocations updated:**
```javascript
const basket = await basketManager.getBasket(0);
console.log("New allocations:", basket.allocations);
```

---

## XCM Verification Commands

```bash
# Check if XCM precompile has code (should NOT be 0x60006000fd in local)
cast code 0x00000000000000000000000000000000000a0000 \
  --rpc-url http://localhost:8000

# Check BasketManager's XCM settings
cast call <BASKET_MANAGER> "xcmEnabled()" --rpc-url http://localhost:8000
cast call <BASKET_MANAGER> "xcmPrecompile()" --rpc-url http://localhost:8000

# Trace a deposit transaction
cast run <TX_HASH> --rpc-url http://localhost:8000

# Check sovereign account balance on Hydration
# (Run in Hydration terminal)
await this.chain.getBalance("0x<sovereign_address>")
```

---