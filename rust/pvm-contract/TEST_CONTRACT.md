# TeleBasket PVM Contract Deployment Guide

## Overview

This guide covers how to build and deploy the PVM (PolkaVM) contract to Westend Asset Hub testnet.

## Prerequisites

1. **Rust 1.86+** with nightly
2. **polkatool** (`cargo install polkatool`)
3. **Node.js** with `@polkadot/api`
4. **Testnet tokens** - Get WND from https://faucet.polkadot.io/

## Build the Contract

```bash
cd tele-basket/rust/pvm-contract

# Install dependencies
npm install

# Build the contract
make all
```

This creates `contract.polkavm` (around 2.7KB).

## Option 1: Deploy via Polkadot.js Apps (Recommended)

1. Go to https://polkadot.js.org/apps/
2. Switch to **Westend Asset Hub** (testnet)
3. Go to **Developer → Contracts**
4. Click **Upload new contract**
5. Select your `contract.polkavm` file
6. Set:
   - Gas Limit: 10,000,000,000
   - Storage Deposit Limit: Leave empty
7. Click **Upload and Instantiate**
8. Confirm the transaction

## Option 2: Deploy via CLI

```bash
cd tele-basket/rust/pvm-contract

# Set your private key
export PRIVATE_KEY=0x...

# Run deploy script
npm run deploy
```

### Troubleshooting

**Error: "Invalid AccountId"**
- The account needs to be mapped first. Use Polkadot.js Apps to map your Ethereum address to a Substrate address.

**Transaction stuck**
- Try with higher gas limit or use Polkadot.js Apps which handles this better.

**RPC connection issues**
- Try alternative RPC: `wss://westend-asset-hub-rpc.polkadot.io`

## Contract Functions

After deployment, call these functions:

### 1. rebalanceBasket(bytes)
- **Selector**: `0xf4993018`
- **Input**: ABI-encoded (uint16[] weights, uint256 totalDeposited, uint32[] paraIds)
- **Output**: uint16[] optimized weights

### 2. optimizeAllocation(bytes)
- **Selector**: `0x8fa5f25c`
- **Input**: ABI-encoded (uint16[] weights, uint32[] paraIds)
- **Output**: uint16[] optimized weights

### 3. getPoolYields(uint32[])
- **Selector**: `0x5e540e6d`
- **Input**: Para IDs array
- **Output**: Yields array (basis points)

### 4. getHistoricalVolatility(uint32[])
- **Selector**: `0x8d12f19a`
- **Input**: Para IDs array
- **Output**: Volatility array (basis points)

## Supported Parachains

| Para ID | Name     | Default Yield | Volatility |
|---------|----------|---------------|------------|
| 2034    | Hydration| 12% APY      | 5%         |
| 2004    | Moonbeam | 8% APY       | 8%         |
| 2000    | Acala    | 10% APY      | 10%        |

## Example: Call from EVM Contract

```solidity
interface IPVMEngine {
    function rebalanceBasket(bytes calldata input) external view returns (bytes memory);
}

contract YourContract {
    address constant PVM_ENGINE = 0x...; // Deployed PVM contract address
    
    function rebalance(uint16[] memory weights, uint256 total, uint32[] memory paraIds) 
        public view returns (uint16[] memory) {
        bytes memory input = abi.encode(weights, total, paraIds);
        bytes memory result = IPVMEngine(PVM_ENGINE).rebalanceBasket(input);
        return abi.decode(result, (uint16[]));
    }
}
```

## Build Stats

```
Contract: contract.polkavm
Size: 2,713 bytes
Instructions: 776
Stack size: 8,192 bytes
```
