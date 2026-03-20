.PHONY: all build link deploy clean install disassemble stats

# RPC endpoints
ETH_RPC_URL ?= https://eth-rpc-testnet.polkadot.io
RPC_URL ?= wss://paseo-rpc.parity.io

# Gas settings for Polkadot Hub TestNet
# Base fee is ~1000 gwei, so use slightly higher
GAS_PRICE ?= 1000000000000

# Check for PRIVATE_KEY
HAS_PRIVATE_KEY := $(shell if [ -n "$$PRIVATE_KEY" ]; then echo "yes"; else echo "no"; fi)

all: build link

build:
	@echo "Building PVM contract..."
	RUSTC_BOOTSTRAP=1 cargo build --release

link:
	@echo "Linking contract..."
	@polkatool link --strip --output contract.polkavm target/riscv64emac-unknown-none-polkavm/release/contract
	@echo ""
	@echo "Contract built: contract.polkavm"
	@echo "Size: $$(wc -c < contract.polkavm) bytes"
	@echo ""

install:
	@echo "Installing prerequisites..."
	@echo "1. Rust 1.84+: rustup install 1.86.0"
	@echo "2. polkatool v0.26.0 (CRITICAL): cargo install polkatool --version 0.26.0"
	@echo "3. Foundry (for cast): curl -L https://foundry.paradigm.xyz | bash && foundryup"

deploy: check-key link
	@echo "Deploying to Polkadot Hub TestNet (chain 420420417)..."
	@echo "RPC: $(ETH_RPC_URL)"
	@echo "Gas price: $(GAS_PRICE) wei ($(shell echo $$(($(GAS_PRICE)/1000000000))) gwei)"
	@echo ""
	@PAYLOAD=$$(xxd -p -c 99999 contract.polkavm) && \
	echo "Sending deployment transaction..." && \
	cast send \
		--rpc-url "$(ETH_RPC_URL)" \
		--gas-price $(GAS_PRICE) \
		--private-key "$$PRIVATE_KEY" \
		--legacy \
		--create "$$PAYLOAD" 2>&1 | tee deploy.log
	@echo ""
	@echo "=== Deployment Log ==="
	@grep -E "(contractAddress|transactionHash|Error|error)" deploy.log || echo "Check deploy.log for details"
	@echo ""
	@echo "After deployment, update frontend .env:"
	@echo "  VITE_USE_MOCK_PVM=false"
	@echo "  VITE_PVM_ENGINE_ADDRESS=<contract_address_from_deploy.log>"

check-key:
	@if [ "$(HAS_PRIVATE_KEY)" = "no" ]; then \
		echo "ERROR: PRIVATE_KEY not set"; \
		echo ""; \
		echo "Usage:"; \
		echo "  export PRIVATE_KEY=0x..."; \
		echo "  make deploy"; \
		exit 1; \
	fi

clean:
	cargo clean
	rm -f contract.polkavm deploy.log

disassemble:
	polkatool disassemble contract.polkavm

stats:
	@if [ -f contract.polkavm ]; then \
		polkatool stats contract.polkavm; \
	else \
		echo "Build contract first: make all"; \
	fi
