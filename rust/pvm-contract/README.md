# TeleBasket PVM Engine

Rust implementation of the TeleBasket rebalancing engine for PolkaVM.

## Quick Start

```bash
# 1. Install prerequisites
rustup install nightly
rustup component add rust-src --toolchain nightly
cargo install polkatool --version 0.26.0

# 2. Build the contract
make all

# 3. Deploy to testnet
make deploy
```

## Prerequisites

### Required Tools

| Tool | Version | Purpose |
|------|---------|---------|
| **Rust** | 1.84+ | Rust toolchain |
| **Nightly Rust** | latest | Required for `-Zbuild-std` |
| **polkatool** | **v0.26.0** | PolkaVM linker (MUST be v0.26.0) |
| **Foundry** | latest | For `cast` deployment |

### Install Commands

```bash
# Rust nightly
rustup install nightly
rustup component add rust-src --toolchain nightly

# polkatool v0.26.0 (CRITICAL - must match on-chain runtime)
cargo install polkatool --version 0.26.0

# Foundry (for cast command)
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### ⚠️ Critical: polkatool Version

**polkatool version MUST match the on-chain PolkaVM runtime.**

Using the wrong version causes `CodeRejected` errors. LendDot confirmed:
- polkatool v0.26.0 → works on Polkadot Hub TestNet (chain 420420417)
- Newer versions → `CodeRejected`

## Build

```bash
# Set Rust nightly as default
rustup override set nightly

# Build contract
make all

# Output: contract.polkavm (~2.7KB)
```

## Deployment

### Prerequisites

1. Get test tokens: https://faucet.polkadot.io/
2. Ensure your wallet has PAS (Polkadot Hub TestNet tokens)

### Method 1: Using Make (Recommended)

```bash
# Set private key
export PRIVATE_KEY=0x...

# Deploy to Polkadot Hub TestNet (chain 420420417)
make deploy
```

### Method 2: Using cast directly

```bash
# Build first
make all

# Set environment
export ETH_RPC_URL=https://eth-rpc-testnet.polkadot.io
export PRIVATE_KEY=0x...

# Convert contract to hex and deploy
PAYLOAD=$(xxd -p -c 99999 contract.polkavm)
cast send --gas-price 1100gwei --private-key $PRIVATE_KEY --json --create "$PAYLOAD"
```

### Method 3: Using deploy script

```bash
# Set environment
export PRIVATE_KEY=0x...
export RPC_URL=wss://westend-asset-hub-rpc.polkadot.io

# Run deploy script
npm run deploy
```

### Post-Deployment

1. Copy the **contract address** from deployment output
2. Update frontend `.env`:

```bash
cd ../..
pnpm env:paseo

# Edit .env
nano .env
```

```
VITE_USE_MOCK_PVM=false
VITE_PVM_ENGINE_ADDRESS=<contract_address>
```

## Chain Configuration

| Network | Chain ID | RPC | Status |
|---------|----------|-----|--------|
| **Polkadot Hub TestNet** | 420420417 | `https://eth-rpc-testnet.polkadot.io` | ✅ Working |
| Westend Asset Hub | 420420421 | `https://westend-asset-hub-eth-rpc.polkadot.io` | ⚠️ May not support PVM |

## Contract Functions

| Function | Selector | Description |
|----------|----------|-------------|
| `optimizeAllocation(bytes)` | `0x8fa5f25c` | Calculate optimal weights |
| `rebalanceBasket(bytes)` | `0xf4993018` | Get rebalanced weights |
| `getPoolYields(uint32[])` | `0x5e540e6d` | Get yields for parachains |
| `getHistoricalVolatility(uint32[])` | `0x8d12f19a` | Get volatility data |

## Supported Parachains

| Para ID | Name | Default Yield | Volatility |
|---------|------|--------------|------------|
| 2034 | Hydration | 12% APY | 5% |
| 2004 | Moonbeam | 8% APY | 8% |
| 2000 | Acala | 10% APY | 10% |

## Troubleshooting

### "CodeRejected" Error
- **Cause**: polkatool version mismatch
- **Fix**: Install polkatool v0.26.0 specifically

```bash
cargo install polkatool --version 0.26.0
```

### "Invalid Transaction" (code 1010)
- **Cause**: Wrong transaction type or network
- **Fix**: Use legacy transaction type, ensure chain supports PVM

### Transaction Silent Revert
- **Cause**: EIP-1559 not supported for PVM
- **Fix**: Use legacy transaction type with `cast send --gas-price`

### "Insufficient funds"
- **Cause**: Need PAS tokens for Polkadot Hub TestNet
- **Fix**: Get tokens from https://faucet.polkadot.io/

## What's Working

✅ Contract builds successfully (`contract.polkavm`, 2,690 bytes)
✅ polkatool v0.26.0 integration
✅ Foundry cast deployment support
✅ Substrate API deployment script
✅ All 4 contract functions implemented
✅ Integration with TeleBasket frontend

## What's Missing / Needs Testing

❓ **Deployment to Polkadot Hub TestNet (420420417)** - Main target
❓ **EVM → PVM call verification** - Test calling from Solidity
❓ **Integration with BasketManager.sol** - Full end-to-end test

## Reference: LendDot PVM (Successful Deployment)

LendDot has a live PVM AI Risk Engine on the same network:

| Contract | Address |
|----------|---------|
| AI Risk Engine (LendDot) | `0xb9eed1261aba78e9b8e9fc2be542494372556e1c` |
| LendingPool (LendDot) | `0xAB71884EB0Fda707c1B4C40874925801C739Cb65` |

## Files

```
├── src/main.rs              # Rust contract source
├── contract.polkavm        # Compiled bytecode (generated)
├── Makefile                # Build & deploy commands
├── scripts/
│   └── deploy.js          # Substrate API deploy script
└── deployed_*.json        # Deployment output (generated)
```
