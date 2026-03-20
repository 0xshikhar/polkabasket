# TeleBasket Integration Status

**Date**: 2026-03-20  
**Network**: Paseo Testnet (Chain ID: 420420417)  
**Status**: ✅ Ready for Testing

---

## Deployed Contracts

| Contract | Address | Status |
|----------|---------|--------|
| **BasketManager** | `0x96CA4a5Cb6Cf56F378aEe426567d330f1CFDEaA2` | ✅ Deployed |
| **BasketToken (xDOT-LIQ)** | `0xD9FEBB375aCE5226AF1AA4146988Af2BDB8A1e8B` | ✅ Deployed |
| **XCM Precompile** | `0x00000000000000000000000000000000000a0000` | ✅ Available (12 bytes) |
| **PVM Engine** | `0x0000000000000000000000000000000000000900` | ⚠️ Mock/Missing |

---

## Environment Configuration

### Frontend `.env`
```bash
VITE_NETWORK=paseo
VITE_RPC_URL=https://eth-rpc-testnet.polkadot.io
VITE_CHAIN_ID=420420417
VITE_GAS_PRICE_GWEI=1100
VITE_BASKET_MANAGER_ADDRESS=0x96CA4a5Cb6Cf56F378aEe426567d330f1CFDEaA2
VITE_BASKET_TOKEN_ADDRESS=0xD9FEBB375aCE5226AF1AA4146988Af2BDB8A1e8B
VITE_XCM_PRECOMPILE_ADDRESS=0x00000000000000000000000000000000000a0000
VITE_PVM_ENGINE_ADDRESS=0x9f1888516d1c087F835F594892B915dD9DCbe5f1
VITE_USE_MOCK_PVM=false
```

### Contracts `.env`
```bash
HARDHAT_NETWORK=paseo
PRIVATE_KEY=....
BASKET_MANAGER_ADDRESS=0x96CA4a5Cb6Cf56F378aEe426567d330f1CFDEaA2
PASEO_RPC_URL=wss://paseo-rpc.parity.io
```

---

## Basket Configuration

### xDOT-LIQ Basket (ID: 0)

| Chain | Para ID | Weight | Protocol |
|-------|---------|--------|----------|
| Hydration | 2034 | 40% | 0x0000...0001 |
| Moonbeam | 2004 | 30% | 0x0000...0002 |
| Acala | 2000 | 30% | 0x0000...0003 |

**Total Deposited**: 0.0 PAS  
**Status**: Active  
**Token**: xDOT-LIQ

---

## Sovereign Accounts

These accounts control funds on remote chains:

| Chain | Address | Explorer |
|-------|---------|----------|
| Hydration (2034) | `0x98b71d9da7f556addb143b901cc911867242e374f27f89d24b693974723e20aa` | [View](https://hydration.subscan.io/account/0x98b71d9da7f556addb143b901cc911867242e374f27f89d24b693974723e20aa) |
| Moonbeam (2004) | `0x98b71d9da7f556addb143b901cc911867242e374f27f89d24b693974723e20aa` | [View](https://moonbase.subscan.io/account/0x98b71d9da7f556addb143b901cc911867242e374f27f89d24b693974723e20aa) |
| Acala (2000) | `0x98b71d9da7f556addb143b901cc911867242e374f27f89d24b693974723e20aa` | [View](https://acala.subscan.io/account/0x98b71d9da7f556addb143b901cc911867242e374f27f89d24b693974723e20aa) |

**⚠️ Note**: Accounts need funding on each remote chain for XCM fees.

---

## Quick Commands

### Verify Deployment
```bash
cd contracts
npm run verify:sovereign
```

### Fund Sovereign Accounts
```bash
cd contracts
npm run fund:sovereign
```

### Check XCM Events
```bash
cd contracts
npm run verify:xcm TX_HASH=<your-tx-hash>
```

### Start Frontend
```bash
npm run dev
```

---

## Testing Checklist

### Phase 1: Basic Operations ✅
- [x] Contract deployment
- [x] Basket creation
- [x] Frontend build
- [x] XCM precompile detected

### Phase 2: Deposit Testing
- [ ] Connect wallet (SubWallet/MetaMask)
- [ ] Deposit PAS into basket
- [ ] Verify token minting
- [ ] Check XCM messages dispatched

### Phase 3: Withdraw Testing
- [ ] Withdraw basket tokens
- [ ] Verify PAS returned
- [ ] Check XCM withdraw messages

### Phase 4: Rebalance Testing
- [ ] Trigger rebalance
- [ ] Verify PVM engine call (if available)
- [ ] Check allocation updates

### Phase 5: XCM Verification
- [ ] Verify funds arrived on Hydration
- [ ] Verify funds arrived on Moonbeam
- [ ] Verify funds arrived on Acala

---

## Known Issues

1. **PVM Engine**: Currently set to mock address. Real PVM precompile not available on Paseo.
2. **Sovereign Derivation**: Using keccak256 instead of blake2b-256. This is a testnet approximation.
3. **XCM Fees**: Sovereign accounts need manual funding on remote chains.

---

## Frontend Integration

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| BasketManager Hook | `src/hooks/useBasketManager.ts` | Contract interactions |
| Deposit Form | `src/components/DepositForm.tsx` | Deposit UI |
| Withdraw Form | `src/components/WithdrawForm.tsx` | Withdraw UI + XCM status |
| XCM Status | `src/components/XCMStatus.tsx` | Cross-chain status |
| Wallet Context | `src/contexts/WalletContext.tsx` | Wallet connection |

### Contract Addresses in Frontend

All addresses are read from `.env` and exported from `src/config/contracts.ts`:

```typescript
export const BASKET_MANAGER_ADDRESS = import.meta.env.VITE_BASKET_MANAGER_ADDRESS || "";
export const BASKET_TOKEN_ADDRESS = import.meta.env.VITE_BASKET_TOKEN_ADDRESS || "";
export const XCM_PRECOMPILE_ADDRESS = import.meta.env.VITE_XCM_PRECOMPILE_ADDRESS || "";
```

---

## XCM Implementation

### Version: XCM V5 (SCALE Encoded)

Based on VeritasXCM proven implementation:
- Precompile: `0x000...0a0000`
- Encoding: SCALE (not base64/JSON)
- Weight estimation: ✅ Implemented
- Message types: WithdrawAsset, BuyExecution, DepositAsset, ClearOrigin

### Example XCM Message (Deposit)
```
0x050c00010100013581d9cd9d91010003010100018d19c9bd0501000006...
```

This sends:
1. WithdrawAsset (pull PAS)
2. BuyExecution (pay for execution)
3. DepositAsset (deposit to sovereign)

---

## References

- **VeritasXCM** (Proven Implementation):
  - XcmOracle: `0xC856458944fecE98766700b229D3D57219D42F5b`
  - Proven TX: `0x9678278bccd05564458a1fc5d8069928758ddace9d5a2b431815ff5267f4d626`

- **Explorer**: https://blockscout-testnet.polkadot.io
- **RPC**: https://eth-rpc-testnet.polkadot.io
- **Chain ID**: 420420417

---

## Support

For issues:
1. Check `docs/STATUS.md` for current state
2. Run `npm run verify:sovereign` to check deployment
3. Check explorer for transaction status
4. Verify `.env` has correct addresses

---

*Last Updated: 2026-03-20*  
*Ready for testing! 🚀*
