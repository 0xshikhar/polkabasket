# PolkaBasket

**PolkaBasket** is a cross-chain DeFi basket protocol built on **Polkadot Hub** (PolkaVM). It enables users to gain diversified exposure to the Polkadot ecosystem with a single click.

## Features

- **One-Click Diversification**: Deposit DOT and automatically allocate capital across multiple parachains (Hydration, Moonbeam, Acala).
- **XCM v4 Powered**: Native cross-chain messaging for secure, asynchronous capital deployment and withdrawal.
- **PVM Rust Engine**: Intelligent, risk-adjusted rebalancing logic written in Rust and executed on the PolkaVM.
- **Unified Yield**: Earn yield from multiple DeFi protocols (LP, Lending, Staking) with one unified basket token.

## Getting Started

### Prerequisites

- Node.js (v18+)
- SubWallet or MetaMask (for EVM interactions on Hub)
- Polkadot.js or Talisman (for Substrate/XCM interactions)

### Installation

```bash
cd pvm
npm install
```

### Development

```bash
npm run dev
```

## Architecture

- **Frontend**: React + Vite + Tailwind CSS + Viem/PAPI.
- **Smart Contracts**: Solidity (PolkaVM) for protocol logic and basket tokens.
- **PVM Engine**: Rust-based optimization engine for rebalancing.
- **Cross-Chain**: XCM v4 for teleporting assets and remote protocol calls.

## Traction

- **$2.42M** TVL
- **3** Active Baskets
- **1,247** Depositors
- **12%+** Avg. APY

---
*Built for the Polkadot ecosystem.*
