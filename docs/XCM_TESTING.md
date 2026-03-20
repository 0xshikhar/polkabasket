# Chopsticks Local XCM Testing

This directory contains configuration for local XCM testing using Chopsticks.

## Prerequisites

```bash
# Install Chopsticks
npm install -g @acala-network/chopsticks

# Or use npx
npx @acala-network/chopsticks@latest --help
```

## Network Endpoints (Paseo Testnet)

- **Polkadot Hub (Asset Hub)**: wss://pasdot-rpc.polkadot.io
- **Hydration**: wss://rpc.nice.hydration.cloud
- **Moonbeam**: wss://wss.api.moonbase.moonbeam.network
- **Acala**: wss://acala-mandala.api.onfinality.io/public-ws

## Quick Start

### 1. Start Polkadot Hub Fork

```bash
npx @acala-network/chopsticks@latest \
  --endpoint=wss://pasdot-rpc.polkadot.io \
  --port=8000
```

### 2. Start Hydration Fork (in another terminal)

```bash
npx @acala-network/chopsticks@latest \
  --endpoint=wss://rpc.nice.hydration.cloud \
  --port=8001
```

### 3. Configure Cross-chain

In the Polkadot Hub Chopsticks terminal:

```javascript
// Connect to Hydration
await this.chain.addSiblings([{
  id: 2034,
  endpoint: "ws://localhost:8001",
  assets: [{ id: { parents: 1, interior: "Here" }, fun: { Fungible: "Native" } }],
}]);
```

## Testing XCM Transfers

### From Polkadot Hub to Hydration

1. Derive sovereign account:
```javascript
const contractAddress = "0x..."; // Your BasketManager address
const sovereign = deriveSiblingParaAccount(contractAddress, 2034);
console.log("Sovereign account:", sovereign);
```

2. Fund sovereign account:
```javascript
await this.chain.dev.setBalance(sovereign, 1000000000000);
```

3. Send XCM message:
```javascript
const xcmMessage = {
  V4: [
    { WithdrawAsset: [...] },
    { BuyExecution: {...} },
    { DepositAsset: {...} },
  ],
};

const messageHash = await this.chain.xcm.send(2034, xcmMessage);
console.log("Message hash:", messageHash);
```

## Verify Cross-chain Transfer

1. Check message status on source:
```javascript
const status = await this.chain.xcm.getStatus(messageHash);
console.log(status);
```

2. Check balance on destination:
```javascript
const balance = await this.chain.account.balance(sovereign);
console.log("Balance:", balance);
```

## Common Issues

### "Barrier" Error
- Sovereign account doesn't have enough DOT for fees
- Solution: Fund with more DOT

### "Unimplemented" Error
- XCM version not supported
- Solution: Check Chopsticks version and XCM v4 compatibility

### "NotExecutable" Error
- Message execution failed
- Solution: Check XCM program logic

## Script: Full XCM Test

```javascript
// test-xcm.js
const { chopsticks } = require("@acala-network/chopsticks");

async function testXCM() {
  const hub = await chopsticks.launch({
    endpoint: "wss://pasdot-rpc.polkadot.io",
    port: 8000,
  });

  const hydration = await chopsticks.launch({
    endpoint: "wss://rpc.nice.hydration.cloud",
    port: 8001,
  });

  // Configure cross-chain
  await hub.addSibling(hydration);

  // Derive sovereign account
  const basketManager = "0x...";
  const sovereign = hub.deriveSovereignAccount(basketManager, 2034);

  // Fund sovereign
  await hub.dev.setBalance(sovereign, 10000000000000);

  // Create XCM message
  const message = {
    V4: [
      {
        WithdrawAsset: [{
          id: { Parents: 1, interior: "Here" },
          fun: { Fungible: 100000000000 }, // 0.1 DOT
        }],
      },
      {
        DepositAsset: {
          assets: "All",
          beneficiary: {
            parents: 0,
            interior: { X1: { AccountId32: { id: "0x...", network: null } } },
          },
        },
      },
    ],
  };

  // Send XCM
  const hash = await hub.xcm.send(2034, message);
  console.log("XCM sent:", hash);

  // Wait for execution
  await new Promise((r) => setTimeout(r, 30000));

  // Check balance
  const balance = await hydration.account.balance(sovereign);
  console.log("Destination balance:", balance);

  await hub.close();
  await hydration.close();
}

testXCM().catch(console.error);
```

## Useful Commands

```bash
# Check endpoint
npx @acala-network/chopsticks@latest --endpoint=wss://pasdot-rpc.polkadot.io

# Run with storage diff
npx @acala-network/chopsticks@latest --endpoint=wss://pasdot-rpc.polkadot.io --enable-storage-diff

# Export state
npx @acala-network/chopsticks@latest --endpoint=wss://pasdot-rpc.polkadot.io --export-state=state.json
```
