# PVM Contract Deployment Checklist

**Reference: LendDot has a LIVE PVM AI Risk Engine at `0xb9eed1261aba78e9b8e9fc2be542494372556e1c`**

---

## Prerequisites

### 1. Install Tools

```bash
# Rust nightly
rustup install nightly
rustup component add rust-src --toolchain nightly
rustup override set nightly

# polkatool v0.26.0 (CRITICAL - must match on-chain runtime)
cargo install polkatool --version 0.26.0

# Foundry (for cast deployment)
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### 2. Get Test Tokens

1. Go to https://faucet.polkadot.io/
2. Select **Polkadot Hub TestNet** (chain 420420417)
3. Get PAS tokens
4. Verify balance: `cast balance <address> --rpc-url https://eth-rpc-testnet.polkadot.io`

### 3. Environment Setup

```bash
# From tele-basket root
cd ../..
npm run env:paseo

# Edit .env with your private key
nano .env
```

---

## Build

```bash
cd rust/pvm-contract

# Build contract
make all

# Verify output
ls -la contract.polkavm
# Should be ~2.7KB
```

---

## Deployment

### Option A: Using Make (Recommended)

```bash
cd rust/pvm-contract

export PRIVATE_KEY=0x...
export ETH_RPC_URL=https://eth-rpc-testnet.polkadot.io

make deploy
```

### Option B: Using cast directly

```bash
cd rust/pvm-contract

# Set private key
export PRIVATE_KEY=0x...
export ETH_RPC_URL=https://eth-rpc-testnet.polkadot.io

# Build
make all

# Deploy using cast (legacy transaction required for PVM)
PAYLOAD=$(xxd -p -c 99999 contract.polkavm)
cast send --gas-price 1100gwei --private-key $PRIVATE_KEY --json --create "$PAYLOAD"
```

### Option C: Using Node script

```bash
cd rust/pvm-contract

export PRIVATE_KEY=0x...
export RPC_URL=wss://paseo-rpc.parity.io

npm run deploy
```

---

## Expected Output

```
Deploying to Polkadot Hub TestNet (chain 420420417)...
RPC: https://eth-rpc-testnet.polkadot.io

Sending deployment transaction...
Contract address: 0x...
Transaction hash: 0x...

Deployment successful!
```

---

## Post-Deployment

### 1. Update Frontend Config

```bash
# From tele-basket root
cd ../..
npm run env:paseo

# Edit .env with the deployed address
nano .env
```

```bash
VITE_USE_MOCK_PVM=false
VITE_PVM_ENGINE_ADDRESS=<contract_address>
```

### 2. Verify Deployment

```bash
# Check contract exists
cast call <address> "0x8fa5f25c" --rpc-url https://eth-rpc-testnet.polkadot.io
```

---

## Verification Checklist

- [ ] polkatool v0.26.0 installed
- [ ] Rust nightly set
- [ ] Contract builds without errors
- [ ] Test tokens received
- [ ] Deployment transaction sent
- [ ] Contract address returned
- [ ] Frontend .env updated
- [ ] Frontend shows "Using Real PVM"

---

## Troubleshooting

### "CodeRejected" Error

**Cause**: polkatool version mismatch

```bash
# Must use v0.26.0 exactly
cargo install polkatool --version 0.26.0
```

### "Invalid Transaction" (code 1010)

**Cause**: Wrong chain or EIP-1559 not supported

**Fix**: 
1. Use Polkadot Hub TestNet (chain 420420417)
2. Use legacy transaction type: `--gas-price` not `--max-fee-per-gas`

### Transaction Silent Revert

**Cause**: EIP-1559 not supported for PVM deployments

**Fix**: Always use legacy transaction type:
```bash
cast send --gas-price 1100gwei ...
```

### "Insufficient funds"

**Cause**: Need PAS tokens for Polkadot Hub TestNet

**Fix**: Get tokens from https://faucet.polkadot.io/

### Contract Call Fails

**Cause**: May need to map Ethereum address

**Fix**: Use Polkadot.js Apps to create/account from Ethereum address

---

## Chain Configuration

| Network | Chain ID | Status | RPC |
|---------|----------|--------|-----|
| **Polkadot Hub TestNet** | 420420417 | ✅ Working | `https://eth-rpc-testnet.polkadot.io` |
| Westend Asset Hub | 420420421 | ⚠️ Unknown | `https://westend-asset-hub-eth-rpc.polkadot.io` |

**Note**: LendDot confirmed PVM works on Polkadot Hub TestNet (420420417). Westend may not support PVM.

---

## Reference: Working PVM Deployment

LendDot has successfully deployed PVM contracts on the same network:

| Contract | Address | Status |
|----------|---------|--------|
| AI Risk Engine (LendDot) | `0xb9eed1261aba78e9b8e9fc2be542494372556e1c` | ✅ Live |
| LendingPool (LendDot) | `0xAB71884EB0Fda707c1B4C40874925801C739Cb65` | ✅ Live |

---

## Next Steps

1. Deploy PVM contract
2. Deploy BasketManager to same network
3. Create a basket
4. Test deposit/withdraw flow
5. Test rebalancing with PVM

---

## Resources

- [TeleBasket Main README](../../README.md)
- [PVM Integration Guide](../../docs/PVM_INTEGRATION.md)
- [LendDot PVM Contract](https://github.com/your-org/lenddot)
- [Polkadot PVM Docs](https://docs.polkadot.com/)
- [polkatool](https://github.com/risc0/polkatool)
