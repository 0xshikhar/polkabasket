# TeleBasket Supported Tokens

This document lists the 15 tokens supported on TeleBasket for testing multichain baskets.

---

## Token Categories

### Native & Standard Tokens (8 tokens)

| # | Token | Symbol | Address | Chain | Type |
|---|-------|--------|---------|-------|------|
| 1 | **Paseo DOT** | PAS | Native | Polkadot Hub | Native Gas Token |
| 2 | **Acala Dollar** | aUSD | `0x000...0001` | Acala (2000) | Stablecoin |
| 3 | **Liquid DOT** | LDOT | `0x000...0002` | Parallel Finance | Staking Derivative |
| 4 | **Interlay BTC** | iBTC | `0x000...0003` | Interlay (2032) | Bitcoin Bridge |
| 5 | **Hydration** | HDX | `0x000...0004` | Hydration (2034) | DEX Token |
| 6 | **Moonbeam** | GLMR | `0x000...0005` | Moonbeam (2004) | EVM Parachain |
| 7 | **Polkadex** | PDEX | `0x000...0006` | Polkadex (2040) | Orderbook DEX |
| 8 | **Centrifuge** | CFG | `0x000...0007` | Centrifuge (2031) | RWA Token |

### Famous Cross-Chain Tokens (4 tokens)

| # | Token | Symbol | Address | Origin | Type |
|---|-------|--------|---------|--------|------|
| 9 | **USD Coin** | USDC | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` | Ethereum Bridge | Stablecoin |
| 10 | **Tether USD** | USDT | `0xdAC17F958D2ee523a2206206994597C13D831ec7` | Ethereum Bridge | Stablecoin |
| 11 | **Wrapped BTC** | WBTC | `0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599` | Ethereum Bridge | Bitcoin Wrapped |
| 12 | **Dai Stablecoin** | DAI | `0x6B175474E89094C44Da98b954EedeAC495271d0F` | Ethereum Bridge | Stablecoin |

### Meme & Community Tokens (3 tokens)

| # | Token | Symbol | Address | Description |
|---|-------|--------|---------|-------------|
| 13 | **PolkaPup** | PUP | `0x000...PUP1` | First Polkadot meme token 🐕 |
| 14 | **DOT Moon** | 🌕 | `0x000...MOON` | "To the Moon" community token |
| 15 | **HODL Gang** | HODL | `0x000...HODL` | Diamond hands meme token 💎 |

---

## Token Details

### 1. Paseo DOT (PAS)
- **Type**: Native Gas Token
- **Decimals**: 18
- **Purpose**: Gas fees and native transfers
- **Faucet**: https://app.paseo.network/

### 2. Acala Dollar (aUSD)
- **Type**: Decentralized Stablecoin
- **Decimals**: 12
- **Backing**: Multi-collateral (DOT, LDOT, etc.)
- **Yield**: 5-8% APY via Acala Homa

### 3. Liquid DOT (LDOT)
- **Type**: Staking Derivative
- **Decimals**: 10
- **Staking APY**: ~14%
- **Liquidity**: Always liquid vs locked DOT

### 4. Interlay BTC (iBTC)
- **Type**: Bitcoin Bridge
- **Decimals**: 8
- **Bridge**: 1:1 BTC backing
- **Security**: Vault collateralization

### 5. Hydration (HDX)
- **Type**: DEX Native Token
- **Decimals**: 12
- **Features**: Omnipool AMM, single-sided liquidity
- **Yield**: LP fees + HDX rewards

### 6. Moonbeam (GLMR)
- **Type**: EVM Parachain Token
- **Decimals**: 18
- **Features**: Full EVM compatibility
- **Use**: Gas for Moonbeam EVM

### 7. Polkadex (PDEX)
- **Type**: Orderbook DEX Token
- **Decimals**: 18
- **Features**: Non-custodial trading
- **Speed**: Sub-second finality

### 8. Centrifuge (CFG)
- **Type**: RWA (Real World Assets)
- **Decimals**: 18
- **Purpose**: Tokenize real-world assets
- **Integration**: Tinlake pools

### 9. USD Coin (USDC)
- **Type**: Fiat-backed Stablecoin
- **Decimals**: 6
- **Issuer**: Circle
- **Bridge**: Via Moonbeam or Acala

### 10. Tether USD (USDT)
- **Type**: Fiat-backed Stablecoin
- **Decimals**: 6
- **Issuer**: Tether
- **Availability**: Statemine (Asset Hub)

### 11. Wrapped BTC (WBTC)
- **Type**: Bitcoin Wrapped
- **Decimals**: 8
- **Backing**: 1:1 BTC
- **Use**: DeFi collateral, trading

### 12. Dai Stablecoin (DAI)
- **Type**: Decentralized Stablecoin
- **Decimals**: 18
- **Backing**: Crypto collateral
- **Stability**: MakerDAO protocol

### 13. PolkaPup (PUP) 🐕
- **Type**: Meme Token
- **Decimals**: 18
- **Supply**: 1,000,000,000 PUP
- **Community**: Polkadot dog lovers
- **Utility**: NFT minting, community rewards

### 14. DOT Moon (🌕)
- **Type**: Meme Token
- **Decimals**: 18
- **Supply**: 420,000,000,000 🌕
- **Tagline**: "To the Moon and beyond!"
- **Features**: Reflection rewards

### 15. HODL Gang (HODL) 💎
- **Type**: Meme Token
- **Decimals**: 18
- **Supply**: 694,200,000 HODL
- **Philosophy**: Diamond hands only
- **Reward**: Holders get airdrops

---

## Basket Combinations

### Recommended Test Baskets

| Basket | Composition | Risk Level |
|--------|-------------|------------|
| **Stable Basket** | aUSD + USDC + USDT + DAI | 🟢 Low |
| **Polkadot Native** | PAS + LDOT + HDX + GLMR | 🟡 Medium |
| **Cross-Chain** | WBTC + USDC + iBTC + HDX | 🟡 Medium |
| **Meme Basket** | PUP + 🌕 + HODL | 🔴 High |
| **RWA Basket** | CFG + iBTC + aUSD | 🟡 Medium |
| **DeFi Bluechip** | HDX + PDEX + GLMR + CFG | 🟡 Medium |

---

## Deployment Status

| Token | Deployed | Source |
|-------|----------|--------|
| PAS | ✅ | Native |
| aUSD | ✅ | Acala Bridge |
| LDOT | ✅ | Parallel Bridge |
| iBTC | ✅ | Interlay Bridge |
| HDX | ✅ | Hydration |
| GLMR | ✅ | Moonbeam |
| PDEX | ✅ | Polkadex |
| CFG | ✅ | Centrifuge |
| USDC | 🔄 | Bridge in progress |
| USDT | 🔄 | Bridge in progress |
| WBTC | 🔄 | Bridge in progress |
| DAI | 🔄 | Bridge in progress |
| PUP | ✅ | Deployed on Paseo |
| 🌕 | ✅ | Deployed on Paseo |
| HODL | ✅ | Deployed on Paseo |

---

## Token Faucets

| Token | Faucet URL |
|-------|------------|
| PAS | https://app.paseo.network/ |
| aUSD | https://apps.acala.network/faucet |
| HDX | https://hydration.net/faucet |
| GLMR | https://faucet.moonbeam.network/ |
| PUP | https://faucet.polkapup.io |

---

## Notes

- All token addresses are examples for Paseo testnet
- Mainnet addresses will differ
- Meme tokens are for testing only - no financial value
- Bridge tokens may require waiting periods for finality

---

*Last updated: 2026-03-20*
