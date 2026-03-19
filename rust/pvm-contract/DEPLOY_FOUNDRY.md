# PVM Deployment Methods

This document compares different methods for deploying the PVM contract to Westend Asset Hub.

## Method 1: Substrate API (Recommended)

Uses `@polkadot/api` directly with the `revive` pallet.

**Setup:**
```bash
cd rust/pvm-contract
npm install
```

**Deploy:**
```bash
export PRIVATE_KEY=0x...
export RPC_URL=wss://westend-asset-hub-rpc.polkadot.io
npm run deploy
```

**Pros:**
- Native Substrate integration
- Uses revive pallet directly
- Clear status output
- Saves deployment info to JSON

**Cons:**
- Requires @polkadot/api
- May need account mapping

---

## Method 2: Foundry cast

Uses Foundry's `cast` command to deploy via Ethereum RPC.

**Setup:**
```bash
npm install -g foundry
make all
```

**Deploy:**
```bash
export PRIVATE_KEY=0x...
export ETH_RPC_URL=wss://westend-asset-hub-rpc.polkadot.io

# Convert to hex and deploy
PAYLOAD=$(xxd -p -c 99999 contract.polkavm)
cast send --gas-price 100gwei --private-key $PRIVATE_KEY --json --create "$PAYLOAD"
```

**Note:** This may NOT work on Westend because EVM interface doesn't support PVM bytecode.

**Pros:**
- Fast
- No Node.js needed

**Cons:**
- EVM interface doesn't support PVM contracts
- Westend rejects PVM bytecode via EVM

---

## Method 3: Polkadot.js Apps (GUI)

Manual deployment via browser.

**Steps:**
1. Go to https://polkadot.js.org/apps/
2. Switch to Westend Asset Hub
3. Developer → Contracts → Upload new contract
4. Select `contract.polkavm`
5. Click **Upload and Instantiate**

**Pros:**
- No CLI setup
- Clear UI
- Handles errors well

**Cons:**
- Manual process
- Can't automate

---

## Method 4: Direct Substrate Extrinsics

Using `@substrate/api` or similar.

```javascript
const api = await ApiPromise.create({ 
  provider: new WsProvider('wss://westend-asset-hub-rpc.polkadot.io') 
});

const contractBlob = fs.readFileSync('./contract.polkavm');
const tx = api.tx.revive.uploadCode(
  { storageDepositLimit: null },
  contractBlob
);

const result = await new Promise((resolve, reject) => {
  tx.signAndSend(deployer, ({ events, status }) => {
    if (status.isFinalized) {
      // Extract code hash from events
      resolve(events);
    }
  });
});
```

---

## Comparison

| Method | PVM Support | Automation | Difficulty |
|--------|-------------|------------|------------|
| Substrate API | ✅ Yes | ✅ Yes | Medium |
| Foundry cast | ❌ No | ✅ Yes | Easy |
| Polkadot.js Apps | ✅ Yes | ❌ No | Easy |
| Direct Extrinsics | ✅ Yes | ✅ Yes | Hard |

## Recommendation

**For automation:** Use Method 1 (Substrate API script)

**For testing:** Use Method 3 (Polkadot.js Apps)

**Do NOT use:** Method 2 (Foundry) - Westend EVM doesn't support PVM

## Environment Variables

All deployment methods need:

```bash
PRIVATE_KEY=0x...        # Your wallet private key
RPC_URL=wss://...       # WebSocket RPC endpoint
```

Get Westend RPCs from:
- https://github.com/polkadot-js/apps/tree/master/packages/apps-config/src endpoints
- https://status.polkadot.io/
