# TeleBasket Status (Paseo)

Last updated: 2026-03-20

## Current target

- Network: **Paseo / Polkadot Hub TestNet**
- Chain ID: `420420417`
- RPC: `https://eth-rpc-testnet.polkadot.io`

---

## Implemented Features

### Core Protocol
- [x] Frontend with SubWallet/MetaMask integration on Paseo testnet
- [x] BasketManager contract with deposit/withdraw/rebalance
- [x] BasketToken ERC-20 per basket with 1:1 minting
- [x] Legacy gas configuration for Polkadot Hub EVM compatibility
- [x] Rust PVM engine integration for allocation optimization

### Multichain XCM Infrastructure (Updated to match VeritasXCM)
- [x] **XCM Precompile Interface** (`contracts/interfaces/IXCMPrecompile.sol`)
  - Address: `0x00000000000000000000000000000000000a0000` (standard)
  - Matches VeritasXCM proven implementation
  - Supports XCM V5 SCALE-encoded messages

- [x] **XCM V5 SCALE Encoding** (replacing base64 JSON)
  - `send()` - Dispatch XCM to parachains
  - `execute()` - Execute XCM locally
  - `weighMessage()` - Estimate execution weight
  - Proper SCALE encoding for MultiLocation and XCM instructions

- [x] **XCM Message Builders** (`xcm/messages/index.ts`)
  - SCALE-encoded destination (sibling parachain)
  - WithdrawAsset, BuyExecution, DepositAsset instructions
  - ClearOrigin instruction for withdraw flow
  - Support for Hydration, Moonbeam, Acala

- [x] **Weight Estimation**
  - Calls `weighMessage()` before `send()`
  - Falls back to default weights if estimation fails
  - `estimateXCMWeight()` public function

- [x] **Sovereign Account Derivation** (`xcm/sovereign.ts`)
  - blake2b-256 derivation for EVM contract addresses
  - Supports both Substrate and EVM address formats

### Deployment & Verification Scripts
- [x] **`npm run deploy:paseo`** - Full deployment with SCALE XCM V5
- [x] **`npm run fund:sovereign`** - Fund sovereign accounts
- [x] **`npm run verify:sovereign`** - Verify balances & XCM status
- [x] **`npm run verify:xcm`** - Track XCM message events
- [x] **`npm run deploy:xcm-precompile`** - Deploy XCM precompile

### Frontend
- [x] Per-chain XCM status display (⏳/✓/✗)
- [x] Target chain indicators
- [x] Withdrawal status tracking

---

## What's Missing

### Critical - Multichain Verification
- [ ] **Live XCM testing** - Verify cross-chain transfers on testnet
  - Run `npm run deploy:paseo`
  - Run `npm run verify:sovereign`
  - Test deposit and verify XCM events
  - Reference: VeritasXCM proven TX `0x9678278bccd05564458a1fc5d8069928758ddace9d5a2b431815ff5267f4d626`

- [ ] **Sovereign account funding verification**
  - Check explorer for each chain
  - Verify funds arrived

### Swap Basket Feature (Next Priority)
- [ ] **Left/Right Swap Baskets**
  - Left swap: deposit Asset A → receive basket token
  - Right swap: deposit basket token → receive Asset B

- [ ] Swap rate calculation (price oracle)
- [ ] Slippage tolerance UI
- [ ] Swap confirmation

### Contract Enhancements
- [ ] Basket migration/updating allocations
- [ ] Emergency withdrawal
- [ ] Pause/unpause functionality
- [ ] Fee configuration

---

## XCM Implementation Comparison

| Feature | Tele-Basket (Before) | Tele-Basket (Now) | VeritasXCM |
|---------|---------------------|-------------------|------------|
| Precompile | `0x0800` ❌ | `0x0a0000` ✅ | `0x0a0000` ✅ |
| Encoding | base64 JSON ❌ | SCALE V5 ✅ | SCALE V5 ✅ |
| Weight | No ❌ | Yes ✅ | Yes ✅ |
| Tested | No ❌ | Pending | ✅ Proven |

---

## Quick Start

```bash
# 1. Deploy
cd contracts
npm run deploy:paseo

# 2. Verify sovereign accounts
npm run verify:sovereign

# 3. Fund if needed
npm run fund:sovereign

# 4. Test XCM
npm run verify:xcm TX_HASH=<tx-hash>

# 5. Start frontend
cd .. && npm run dev
```

---

## Key Changes (from VeritasXCM copy)

1. **IXCMPrecompile.sol** - Updated to match VeritasXCM interface
2. **BasketManager.sol** - SCALE encoding, weight estimation
3. **deploy.ts** - SCALE-encoded XCM messages instead of base64
4. **xcm/messages/index.ts** - SCALE encoding functions

---

## Docs

- Integration: `docs/PVM_INTEGRATION.md`
- E2E testing: `docs/PASEO_E2E_TESTING.md`
- XCM Testing: `docs/XCM_TESTING.md`

## Reference Projects

- **VeritasXCM**: Proven XCM V5 implementation on Paseo
  - XcmOracle: `0xC856458944fecE98766700b229D3D57219D42F5b`
  - Proven TX: `0x9678278bccd05564458a1fc5d8069928758ddace9d5a2b431815ff5267f4d626`

- **Hyperway**: Alternative XCM approach with XCMMessageBuilder library
