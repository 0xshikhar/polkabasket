# Deploy PVM Contract using Foundry (like LendDot)

## Method: Use Foundry's cast command

```bash
cd tele-basket/rust/pvm-contract

# Build first
make all

# Set environment
export ETH_RPC_URL=wss://westend-asset-hub-rpc.polkadot.io
export PRIVATE_KEY=0x9b14771598f8bf44732e7fb3be561d0b59662d570a25b38f724d17fc9d0c8a40

# Convert contract to hex payload
PAYLOAD=$(xxd -p -c 99999 contract.polkavm)

# Deploy using cast
cast send --gas-price 100gwei --private-key $PRIVATE_KEY --json --create "$PAYLOAD"
```

## Alternative: Use the script

```bash
cd tele-basket/rust/pvm-contract
npm install -g foundry
make all

# Set your private key
export PRIVATE_KEY=0x...

# Run the cast-based deploy
./scripts/deploy-cast.sh
```
