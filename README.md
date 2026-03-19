# TeleBasket

Cross-chain DeFi basket primitive for Polkadot Hub (PolkaVM). Users deposit DOT once and receive a basket token representing capital deployed across multiple parachain protocols.

## Quick Start

### 1. Setup Environment

```bash
# Setup for local development (uses mock PVM)
pnpm env:local

# OR setup for Westend testnet
pnpm env:westend
```

### 2. Start Local Node

```bash
cd contracts
pnpm hardhat node
```

### 3. Run Frontend

```bash
pnpm dev
```

## Environment Configuration

All environment variables are managed centrally from `.env.template`.

### Setup Commands

| Command | Description |
|---------|-------------|
| `pnpm env:local` | Setup for local Hardhat development |
| `pnpm env:westend` | Setup for Westend Asset Hub testnet |
| `pnpm env:paseo` | Setup for Paseo Asset Hub testnet |

### Key Variables

| Variable | Description |
|----------|-------------|
| `PRIVATE_KEY` | Deployer wallet private key |
| `VITE_NETWORK` | Current network (`local`, `westend`, `paseo`) |
| `VITE_USE_MOCK_PVM` | Use mock PVM engine (`true` or `false`) |
| `VITE_PVM_ENGINE_ADDRESS` | Deployed PVM contract address |

## Architecture

```
User
  │  deposit(DOT)
  ▼
┌──────────────────────────────┐
│   BasketManager.sol          │  ← Polkadot Hub (PolkaVM)
│   - createBasket()           │
│   - deposit()                │
│   - withdraw()              │
│   - rebalance()             │
└────────────┬─────────────────┘
             │ staticcall
             ▼
┌──────────────────────────────┐
│   PVM Engine (Rust)         │
│   - optimizeAllocation()    │
│   - rebalanceBasket()       │
│   - getPoolYields()         │
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

## Project Structure

```
tele-basket/
├── src/                     # React frontend
│   ├── components/          # UI components
│   ├── hooks/               # React hooks
│   ├── contexts/            # React contexts
│   └── config/              # Contract ABIs & addresses
├── contracts/               # Solidity smart contracts
│   ├── contracts/           # Smart contract source
│   ├── scripts/             # Deployment scripts
│   └── test/                # Contract tests
├── rust/pvm-contract/        # Rust PVM engine
├── scripts/                  # Setup & utility scripts
└── docs/                    # Documentation
```

## Networks

| Network | Chain ID | RPC |
|---------|----------|-----|
| Local | 31337 | http://127.0.0.1:8545 |
| Westend Asset Hub | 420420421 | https://westend-asset-hub-eth-rpc.polkadot.io |
| Paseo Asset Hub | 420420417 | https://eth-rpc-testnet.polkadot.io |

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [PVM Integration](docs/PVM_INTEGRATION.md)
- [Contracts](docs/CONTRACTS.md)
- [Project Status](docs/STATUS.md)

## Tech Stack

- **Frontend**: React, Vite, TypeScript, TailwindCSS
- **Contracts**: Solidity, Hardhat, viem
- **PVM**: Rust, PolkaVM
- **Wallet**: SubWallet, MetaMask (EVM)
- **Interoperability**: XCM, Polkadot.js

## Resources

- [PolkaVM Docs](https://docs.polkadot.com/develop/smart-contracts/)
- [XCM Docs](https://docs.polkadot.com/develop/interoperability/xcm/)
- [Viem](https://viem.sh/)
- [Reactive DOT](https://reactivedot.dev/)

## License

MIT
