#!/bin/bash
# Deploy to Paseo using cast

set -e

RPC_URL="https://services.polkadothub-rpc.com/testnet"
PRIVATE_KEY="0x9b14771598f8bf44732e7fb3be561d0b59662d570a25b38f724d17fc9d0c8a40"
GAS_PRICE=$(cast rpc eth_gasPrice --rpc-url $RPC_URL)
CHAIN_ID=420420417

echo "Deploying to Paseo TestNet..."
echo "RPC: $RPC_URL"
echo "Gas Price: $GAS_PRICE"

# Deploy BasketManager
echo "Deploying BasketManager..."
BASKET_MANAGER=$(cast create \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --gas-limit 15000000 \
  --gas-price $GAS_PRICE \
  ./out/BasketManager.sol/BasketManager.json 2>&1)

echo "Deployment result: $BASKET_MANAGER"
