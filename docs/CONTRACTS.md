# PolkaBasket — Smart Contract Specification
### `contracts/CONTRACTS.md`

---

## Overview

Two contracts are deployed on **Polkadot Hub** (PolkaVM / pallet-revive):

1. **`BasketManager.sol`** — core logic: basket creation, deposits, withdrawals, XCM dispatch
2. **`BasketToken.sol`** — ERC-20 token representing a basket position

---

## PolkaVM Compatibility Notes

Before writing any contract, check these constraints (from the OpenGuild blog post on missing opcodes):

- `SELFDESTRUCT` is disabled — do not use it
- `COINBASE`, `DIFFICULTY`, `PREVRANDAO` may behave differently
- `PUSH0` may not be supported — avoid if using older Solidity patterns
- Max contract size is ~100KB (much larger than standard EVM 24KB — use this to your advantage)
- Gas model differs — profile carefully

Recommended Solidity version: `^0.8.20`

---

## BasketToken.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BasketToken
 * @notice ERC-20 token representing a cross-chain basket position.
 *         Minted and burned only by BasketManager.
 */
contract BasketToken is ERC20, Ownable {
    address public basketManager;

    modifier onlyManager() {
        require(msg.sender == basketManager, "Not basket manager");
        _;
    }

    constructor(
        string memory name_,
        string memory symbol_,
        address manager_
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        basketManager = manager_;
    }

    function mint(address to, uint256 amount) external onlyManager {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyManager {
        _burn(from, amount);
    }

    function setManager(address newManager) external onlyOwner {
        basketManager = newManager;
    }
}
```

---

## BasketManager.sol

### Data Structures

```solidity
struct AllocationConfig {
    uint32  paraId;       // Target parachain ID (e.g. 2034 for Hydration)
    address protocol;     // Protocol address on target chain (used in XCM Transact calldata)
    uint16  weightBps;    // Weight in basis points; all weights must sum to 10000
    bytes   depositCall;  // ABI-encoded call to send to the protocol via XCM Transact
    bytes   withdrawCall; // ABI-encoded withdraw call
}

struct Basket {
    uint256           id;
    string            name;
    address           token;          // BasketToken contract address
    AllocationConfig[] allocations;
    uint256           totalDeposited; // Total DOT deposited (wei)
    bool              active;
}

struct UserPosition {
    uint256 basketId;
    uint256 tokenBalance; // tracked off ERC-20 for convenience
    uint256 depositedAt;
}
```

### Full Contract Skeleton

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BasketToken.sol";
import "./interfaces/IXCMPrecompile.sol";
import "./interfaces/IPVMEngine.sol";

/**
 * @title BasketManager
 * @notice Creates and manages cross-chain DeFi baskets.
 *         Users deposit DOT, receive basket tokens, capital deployed via XCM.
 */
contract BasketManager {

    // ─── State ─────────────────────────────────────────────────────────────
    uint256 public nextBasketId;
    mapping(uint256 => Basket) public baskets;
    mapping(address => UserPosition[]) public userPositions;

    // Precompile addresses (set at deploy time for the specific Hub environment)
    address public constant XCM_PRECOMPILE   = 0x0000000000000000000000000000000000000800;
    address public constant PVM_ENGINE       = 0x0000000000000000000000000000000000000900;

    address public owner;
    uint16  public rebalanceThresholdBps = 200; // 2% drift triggers rebalance

    // ─── Events ────────────────────────────────────────────────────────────
    event BasketCreated(uint256 indexed basketId, string name, address token);
    event Deposited(uint256 indexed basketId, address indexed user, uint256 amount, uint256 tokensMinted);
    event Withdrawn(uint256 indexed basketId, address indexed user, uint256 tokensBurned, uint256 amountOut);
    event DeploymentDispatched(uint256 indexed basketId, uint32 paraId, uint256 amount);
    event Rebalanced(uint256 indexed basketId, uint256 timestamp);

    // ─── Modifiers ─────────────────────────────────────────────────────────
    modifier onlyOwner() { require(msg.sender == owner, "Not owner"); _; }

    // ─── Constructor ───────────────────────────────────────────────────────
    constructor() { owner = msg.sender; }

    // ─── Basket Creation ───────────────────────────────────────────────────

    /**
     * @notice Creates a new basket with a given allocation config.
     * @param name Human-readable basket name, e.g. "xDOT-LIQ"
     * @param symbol ERC-20 symbol for the basket token
     * @param allocations Array of AllocationConfig (weights must sum to 10000)
     */
    function createBasket(
        string calldata name,
        string calldata symbol,
        AllocationConfig[] calldata allocations
    ) external onlyOwner returns (uint256 basketId) {
        _validateAllocations(allocations);

        basketId = nextBasketId++;
        BasketToken token = new BasketToken(name, symbol, address(this));

        Basket storage b = baskets[basketId];
        b.id     = basketId;
        b.name   = name;
        b.token  = address(token);
        b.active = true;
        for (uint i = 0; i < allocations.length; i++) {
            b.allocations.push(allocations[i]);
        }

        emit BasketCreated(basketId, name, address(token));
    }

    // ─── Deposit ───────────────────────────────────────────────────────────

    /**
     * @notice User deposits DOT (native asset). Mints basket tokens 1:1 with DOT.
     *         Triggers XCM deployment across configured chains.
     * @dev In PolkaVM, msg.value carries native DOT amount.
     */
    function deposit(uint256 basketId) external payable returns (uint256 tokensMinted) {
        Basket storage b = baskets[basketId];
        require(b.active, "Basket not active");
        require(msg.value > 0, "Must deposit > 0");

        // Mint basket tokens 1:1 with DOT deposited (simplified NAV)
        tokensMinted = msg.value;
        BasketToken(b.token).mint(msg.sender, tokensMinted);
        b.totalDeposited += msg.value;

        // Deploy capital across chains via XCM
        _executeDeployment(basketId, msg.value);

        emit Deposited(basketId, msg.sender, msg.value, tokensMinted);
    }

    // ─── Withdraw ──────────────────────────────────────────────────────────

    /**
     * @notice Burns basket tokens, initiates XCM withdraw from remote chains.
     * @dev Actual DOT return is async (XCM). User receives DOT after XCM completes.
     *      For MVP, implement as a queued withdrawal with callback.
     */
    function withdraw(uint256 basketId, uint256 tokenAmount) external {
        Basket storage b = baskets[basketId];
        require(b.active, "Basket not active");

        BasketToken(b.token).burn(msg.sender, tokenAmount);

        uint256 share = (tokenAmount * 1e18) / BasketToken(b.token).totalSupply();

        // Dispatch XCM withdraw messages for each allocation
        for (uint i = 0; i < b.allocations.length; i++) {
            uint256 withdrawAmount = (b.totalDeposited * b.allocations[i].weightBps * share) / (10000 * 1e18);
            _dispatchXCMWithdraw(b.allocations[i], withdrawAmount, msg.sender);
        }

        b.totalDeposited -= tokenAmount;
        emit Withdrawn(basketId, msg.sender, tokenAmount, tokenAmount);
    }

    // ─── Rebalance ─────────────────────────────────────────────────────────

    /**
     * @notice Calls PVM Rust engine to compute optimal rebalance, dispatches XCM.
     */
    function rebalance(uint256 basketId) external {
        Basket storage b = baskets[basketId];
        require(b.active, "Basket not active");

        // Encode current positions for PVM engine call
        bytes memory engineInput = _encodeRebalanceInput(b);

        // Call PVM engine (Rust allocation engine)
        bytes memory engineOutput = _callPVMEngine(engineInput);

        // Decode new weights from engine output
        uint16[] memory newWeights = abi.decode(engineOutput, (uint16[]));

        // Update allocation weights if drift exceeds threshold
        for (uint i = 0; i < b.allocations.length; i++) {
            if (_absDiff(b.allocations[i].weightBps, newWeights[i]) > rebalanceThresholdBps) {
                b.allocations[i].weightBps = newWeights[i];
            }
        }

        emit Rebalanced(basketId, block.timestamp);
    }

    // ─── Internal: XCM Dispatch ────────────────────────────────────────────

    function _executeDeployment(uint256 basketId, uint256 totalAmount) internal {
        Basket storage b = baskets[basketId];
        for (uint i = 0; i < b.allocations.length; i++) {
            AllocationConfig memory alloc = b.allocations[i];
            uint256 allocAmount = (totalAmount * alloc.weightBps) / 10000;
            _dispatchXCMDeposit(alloc, allocAmount);
            emit DeploymentDispatched(basketId, alloc.paraId, allocAmount);
        }
    }

    function _dispatchXCMDeposit(AllocationConfig memory alloc, uint256 amount) internal {
        // Build XCM v4 message: WithdrawAsset + BuyExecution + Transact
        bytes memory xcmMessage = abi.encode(
            alloc.paraId,
            amount,
            alloc.depositCall
        );
        IXCMPrecompile(XCM_PRECOMPILE).sendXCM(alloc.paraId, xcmMessage);
    }

    function _dispatchXCMWithdraw(
        AllocationConfig memory alloc,
        uint256 amount,
        address recipient
    ) internal {
        bytes memory xcmMessage = abi.encode(
            alloc.paraId,
            amount,
            alloc.withdrawCall,
            recipient
        );
        IXCMPrecompile(XCM_PRECOMPILE).sendXCM(alloc.paraId, xcmMessage);
    }

    // ─── Internal: PVM Engine ──────────────────────────────────────────────

    function _callPVMEngine(bytes memory input) internal view returns (bytes memory) {
        (bool success, bytes memory result) = PVM_ENGINE.staticcall(input);
        require(success, "PVM engine call failed");
        return result;
    }

    function _encodeRebalanceInput(Basket storage b) internal view returns (bytes memory) {
        uint16[] memory weights = new uint16[](b.allocations.length);
        for (uint i = 0; i < b.allocations.length; i++) {
            weights[i] = b.allocations[i].weightBps;
        }
        return abi.encode(weights, b.totalDeposited);
    }

    // ─── Internal: Validation ──────────────────────────────────────────────

    function _validateAllocations(AllocationConfig[] calldata allocations) internal pure {
        uint256 totalWeight;
        for (uint i = 0; i < allocations.length; i++) {
            totalWeight += allocations[i].weightBps;
        }
        require(totalWeight == 10000, "Weights must sum to 10000 bps");
    }

    function _absDiff(uint16 a, uint16 b) internal pure returns (uint16) {
        return a > b ? a - b : b - a;
    }

    // ─── View ──────────────────────────────────────────────────────────────

    function getBasket(uint256 basketId) external view returns (Basket memory) {
        return baskets[basketId];
    }

    function getBasketNAV(uint256 basketId) external view returns (uint256) {
        // Simplified: return totalDeposited. Real implementation queries remote positions.
        return baskets[basketId].totalDeposited;
    }
}
```

---

## IXCMPrecompile.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IXCMPrecompile
 * @notice Interface for the XCM precompile at 0x800 on Polkadot Hub.
 *         Actual interface depends on Hub's pallet-revive XCM precompile spec.
 *         Update this based on official docs before deployment.
 */
interface IXCMPrecompile {
    function sendXCM(uint32 destParaId, bytes calldata xcmMessage) external;
    function teleportAsset(uint32 destParaId, uint256 amount, address beneficiary) external;
}
```

---

## IPVMEngine.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPVMEngine
 * @notice Interface for the Rust allocation engine compiled to PolkaVM bytecode.
 *         Called via staticcall to a precompile address.
 */
interface IPVMEngine {
    function optimizeAllocation(bytes calldata input) external view returns (bytes memory);
    function rebalanceBasket(bytes calldata input) external view returns (bytes memory);
}
```

---

## Deployment Script

```typescript
// scripts/deploy.ts
import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with:", deployer.address);

    const BasketManager = await ethers.getContractFactory("BasketManager");
    const manager = await BasketManager.deploy();
    await manager.waitForDeployment();
    console.log("BasketManager deployed to:", await manager.getAddress());

    // Create the default xDOT-LIQ basket
    const tx = await manager.createBasket(
        "xDOT Liquidity Basket",
        "xDOT-LIQ",
        [
            {
                paraId: 2034,    // Hydration
                protocol: "0x...",
                weightBps: 4000, // 40%
                depositCall: "0x...",
                withdrawCall: "0x...",
            },
            {
                paraId: 2004,    // Moonbeam
                protocol: "0x...",
                weightBps: 3000, // 30%
                depositCall: "0x...",
                withdrawCall: "0x...",
            },
            {
                paraId: 2000,    // Acala (stretch)
                protocol: "0x...",
                weightBps: 3000, // 30%
                depositCall: "0x...",
                withdrawCall: "0x...",
            },
        ]
    );
    await tx.wait();
    console.log("xDOT-LIQ basket created");
}

main().catch(console.error);
```

---

## Hardhat Config for PolkaVM

```typescript
// hardhat.config.ts
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: { enabled: true, runs: 200 },
            evmVersion: "berlin", // Use berlin for broader PolkaVM compatibility
        },
    },
    networks: {
        // Polkadot Hub testnet (Westend Asset Hub with pallet-revive)
        polkadotHub: {
            url: "https://westend-asset-hub-eth-rpc.polkadot.io",
            chainId: 420420421, // Verify this chain ID
            accounts: [process.env.PRIVATE_KEY!],
        },
        // Local Chopsticks fork
        chopsticks: {
            url: "http://localhost:8545",
            chainId: 420420421,
            accounts: [process.env.PRIVATE_KEY!],
        },
    },
};

export default config;
```

---

## Testing Strategy

### Unit Tests (Hardhat + local)

```
test/
├── BasketManager.deposit.test.ts    — deposit + mint, check token balance
├── BasketManager.withdraw.test.ts   — burn + withdraw, check DOT return
├── BasketManager.rebalance.test.ts  — rebalance triggers correct weight updates
├── BasketToken.test.ts              — access control on mint/burn
└── mocks/
    ├── MockXCMPrecompile.sol        — records XCM calls, returns success
    └── MockPVMEngine.sol            — returns hardcoded weights
```

### Integration Tests (Chopsticks fork)

- Fork Westend Asset Hub
- Test actual XCM messages dispatched to forked Hydration/Moonbeam
- Verify sovereign account receives DOT

---

*Part of PolkaBasket implementation plan. See also: `PVM_ENGINE.md`, `XCM_SPEC.md`, `FRONTEND.md`*
