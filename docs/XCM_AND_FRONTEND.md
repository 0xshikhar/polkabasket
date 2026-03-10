# PolkaBasket — XCM Specification
### `xcm/XCM_SPEC.md`

---

## Overview

PolkaBasket uses **XCM v4** to teleport DOT and execute remote protocol calls across parachains. Every `deposit()` call on the BasketManager triggers one XCM message per allocation target.

---

## Parachain IDs (Westend Testnet)

| Chain | Parachain ID | Testnet Explorer |
|---|---|---|
| Polkadot Hub (Asset Hub) | 1000 | westend.subscan.io |
| Hydration | 2034 | hydration testnet |
| Moonbeam | 2004 | moonbase.moonscan.io |
| Acala | 2000 | acala testnet |

> **Verify these IDs** on the Westend testnet before use. Parachain IDs differ between Polkadot mainnet and Westend.

### How these four parachains are used

| Parachain | Role | Where it’s used |
|-----------|------|------------------|
| **Polkadot Hub (1000)** | **Home chain** — BasketManager and basket tokens live here. User deposits/withdraws on Hub. | Frontend RPC (`westend-asset-hub-eth-rpc.polkadot.io`), `contracts.ts` chain config, XCM “from” chain in messages. |
| **Hydration (2034)** | **Allocation target** — receives a share of each deposit (e.g. 40%) for LP. | `BasketManager` allocations (`paraId: 2034`), `deploy.ts` and `BasketManager.test.ts` allocation arrays, XCM “to” chain in `buildHydrationDepositXCM` and send targets. |
| **Moonbeam (2004)** | **Allocation target** — receives a share (e.g. 30%) for lending. | Same as above: contract allocations, deploy script, tests, XCM destination. |
| **Acala (2000)** | **Allocation target** — receives a share (e.g. 30%) for staking/DeFi. | Same as above: contract allocations, deploy script, tests, XCM destination. |

- **Contracts:** Each basket’s `allocations[]` has one entry per target chain (`paraId` + `protocol` + `weightBps`). On `deposit()`, `BasketManager._dispatchXCMDeposit()` calls the XCM precompile with `alloc.paraId` (2034, 2004, 2000) so the Hub sends XCM to each parachain.
- **Deploy / tests:** `contracts/scripts/deploy.ts` and `contracts/test/BasketManager.test.ts` use the same paraIds (2034, 2004, 2000) so the first basket matches this spec.
- **Frontend:** UI shows “Hydration LP”, “Moonbeam Lending”, “Acala Staking” etc.; the actual chain selection is fixed in the basket’s allocation config on-chain.

---

## XCM Message Flow — Deposit

```
User deposits 100 DOT to BasketManager on Hub
                │
    ┌───────────┴───────────┐
    │                       │
    ▼                       ▼
XCM Message #1          XCM Message #2
Hub → Hydration         Hub → Moonbeam
40 DOT                  30 DOT (+ 30 DOT to Acala if enabled)
```

### XCM Message Format (Hub → Hydration)

```typescript
// xcm/messages/deposit_hydration.ts

import { XcmVersionedXcm } from "@polkadot/types/interfaces";

export function buildHydrationDepositXCM(
    api: ApiPromise,
    amount: bigint,          // DOT amount in planck
    lpCallData: Uint8Array,  // Encoded addLiquidity call
    beneficiary: string,     // Sovereign account on Hydration
): XcmVersionedXcm {
    return api.createType("XcmVersionedXcm", {
        V4: [
            // Step 1: Withdraw DOT from Hub
            {
                WithdrawAsset: [
                    {
                        id: { parents: 1, interior: "Here" }, // DOT
                        fun: { Fungible: amount },
                    },
                ],
            },
            // Step 2: Buy execution on Hydration
            {
                BuyExecution: {
                    fees: {
                        id: { parents: 1, interior: "Here" },
                        fun: { Fungible: amount / 100n }, // ~1% for fees
                    },
                    weightLimit: "Unlimited",
                },
            },
            // Step 3: Deposit to Hydration LP via Transact
            {
                Transact: {
                    originKind: "SovereignAccount",
                    requireWeightAtMost: {
                        refTime: 5_000_000_000n,
                        proofSize: 262144n,
                    },
                    call: {
                        encoded: lpCallData,
                    },
                },
            },
            // Step 4: Trap remaining assets (return unused fees)
            {
                RefundSurplus: null,
            },
            {
                DepositAsset: {
                    assets: { Wild: { AllCounted: 1 } },
                    beneficiary: {
                        parents: 0,
                        interior: {
                            X1: { AccountId32: { id: beneficiary, network: null } },
                        },
                    },
                },
            },
        ],
    });
}
```

---

## Sovereign Account Derivation

The BasketManager contract on Hub controls a **sovereign account** on each target parachain. Capital is held in these sovereign accounts between deposit and protocol interaction.

### Derivation Formula

For a PolkaVM contract at address `contractAddr` on Hub (parachain 1000):

```
sovereign_account = blake2_256(
    "SiblingChain" || encode(1000) || "AccountKey20" || contractAddr
)[0..32]
```

> **Important:** PolkaVM contract addresses are 20-byte Ethereum-style addresses. The sovereign account derivation for EVM/PolkaVM contracts on sibling parachains may differ from standard Substrate account derivation. **Verify this with the OpenGuild team in Discord before Week 2 development.**

### Practical Steps

1. Deploy BasketManager to Hub testnet
2. Compute its sovereign account address on Hydration and Moonbeam
3. Fund these sovereign accounts with some DOT for fees (one-time setup)
4. Verify by checking the account balance on each target chain explorer

---

## XCM Message Flow — Withdraw

The withdraw flow is the reverse: XCM messages call `removeLiquidity` / `withdraw` on target protocols, then teleport DOT back to the user on Hub.

```typescript
// xcm/messages/withdraw_hydration.ts

export function buildHydrationWithdrawXCM(
    api: ApiPromise,
    amount: bigint,
    withdrawCallData: Uint8Array,
    recipientOnHub: string,
): XcmVersionedXcm {
    return api.createType("XcmVersionedXcm", {
        V4: [
            { WithdrawAsset: [/* DOT LP position */] },
            { BuyExecution: { /* fees */ } },
            {
                Transact: {
                    originKind: "SovereignAccount",
                    call: { encoded: withdrawCallData }, // removeLiquidity
                },
            },
            // Teleport DOT back to Hub
            {
                InitiateReserveWithdraw: {
                    assets: { Wild: { AllCounted: 1 } },
                    reserve: {
                        parents: 1,
                        interior: { X1: { Parachain: 1000 } }, // Hub
                    },
                    xcm: [
                        {
                            DepositAsset: {
                                assets: { Wild: "All" },
                                beneficiary: {
                                    parents: 0,
                                    interior: {
                                        X1: { AccountKey20: { key: recipientOnHub, network: null } }
                                    }
                                }
                            }
                        }
                    ]
                }
            }
        ],
    });
}
```

---

## Local Testing with Chopsticks

Chopsticks lets you fork the Westend testnet locally and test XCM without spending real testnet tokens.

### Setup

```bash
npm install -g @acala-network/chopsticks

# Fork Hub + Hydration + Moonbeam
npx chopsticks xcm \
    --config ./chopsticks/hub.yml \
    --config ./chopsticks/hydration.yml \
    --config ./chopsticks/moonbeam.yml
```

### chopsticks/hub.yml

```yaml
endpoint: wss://westend-asset-hub-rpc.polkadot.io
mock-signature-host: true
block: latest
```

### chopsticks/hydration.yml

```yaml
endpoint: wss://rpc.nice.hydration.cloud
mock-signature-host: true
block: latest
```

### Testing XCM Locally

```typescript
// scripts/test_xcm_local.ts
import { ApiPromise, WsProvider } from "@polkadot/api";
import { buildHydrationDepositXCM } from "../xcm/messages/deposit_hydration";

const hubApi = await ApiPromise.create({ provider: new WsProvider("ws://localhost:8000") });
const hydrationApi = await ApiPromise.create({ provider: new WsProvider("ws://localhost:8001") });

// Check sovereign account balance before
const before = await hydrationApi.query.system.account(SOVEREIGN_ACCOUNT);
console.log("Before:", before.toHuman());

// Send XCM
const xcmMsg = buildHydrationDepositXCM(hubApi, 1_000_000_000_000n, lpCallData, SOVEREIGN_ACCOUNT);
await hubApi.tx.polkadotXcm.send({ V4: { parents: 1, interior: { X1: { Parachain: 2034 } } } }, xcmMsg)
    .signAndSend(sender);

// Wait for finalization, then check
await new Promise(r => setTimeout(r, 12000));
const after = await hydrationApi.query.system.account(SOVEREIGN_ACCOUNT);
console.log("After:", after.toHuman());
```

---

## XCM Error Handling

Common XCM failure modes and mitigations:

| Error | Cause | Mitigation |
|---|---|---|
| `Barrier` error | Message not allowed through filter | Ensure sovereign account has enough DOT for fees |
| `TooExpensive` | Weight limit too low | Increase `requireWeightAtMost` values |
| `AssetNotFound` | DOT not registered on target | Verify asset registration on testnet |
| `FailedToTransactAsset` | Protocol call reverted | Check calldata encoding, mock with simpler call |
| `Overflow` | Amount too large | Add amount validation before dispatch |

For the demo: use conservative amounts (1–10 DOT per chain) and pre-fund sovereign accounts generously.

---

---

# PolkaBasket — Frontend Specification
### `frontend/FRONTEND.md`

---

## Base Setup

The project starts from the **create-dot-app React + PAPI template**:

```bash
# Already initialized
npx create-dot-app@latest my-dapp --template react-papi
cd my-dapp

# Add additional deps
npm install recharts viem wagmi @tanstack/react-query
npm install @polkadot/extension-dapp @polkadot/api
```

---

## App Structure

```
frontend/src/
├── App.tsx                    # Root, wallet connection, routing
├── pages/
│   ├── Home.tsx               # Landing: list of baskets
│   └── Basket.tsx             # Single basket detail + deposit/withdraw
├── components/
│   ├── WalletConnect.tsx      # Polkadot.js + EVM wallet connection
│   ├── BasketCard.tsx         # Basket summary card on home page
│   ├── DepositForm.tsx        # Deposit DOT, preview allocation split
│   ├── WithdrawForm.tsx       # Burn basket tokens, initiate withdraw
│   ├── AllocationChart.tsx    # Recharts pie chart: live weights
│   ├── XCMStatus.tsx          # Show XCM message status per chain
│   └── RebalancePanel.tsx     # Trigger rebalance, show Rust engine output
├── hooks/
│   ├── useBasketManager.ts    # Viem calls to BasketManager.sol
│   ├── useBasketToken.ts      # ERC-20 token balance, approve
│   ├── useXCMStatus.ts        # Poll XCM message status
│   └── usePolkadotApi.ts      # PAPI / Polkadot.js connection
├── config/
│   ├── contracts.ts           # Deployed contract addresses + ABIs
│   └── chains.ts              # Chain configs for Hub testnet
└── utils/
    ├── formatDOT.ts
    └── xcmDecoder.ts
```

---

## Wallet Connection (Dual: EVM + Substrate)

Users need two connections:
1. **EVM wallet** (MetaMask or Talisman EVM mode) — for calling `BasketManager.sol` on Hub
2. **Substrate wallet** (Polkadot.js / Talisman) — for signing XCM extrinsics

```typescript
// hooks/usePolkadotApi.ts
import { createClient } from "polkadot-api";
import { getWsProvider } from "polkadot-api/ws-provider/web";
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat";

export function usePolkadotApi() {
    const [client, setClient] = useState<PolkadotClient | null>(null);

    useEffect(() => {
        const c = createClient(
            withPolkadotSdkCompat(
                getWsProvider("wss://westend-asset-hub-rpc.polkadot.io")
            )
        );
        setClient(c);
        return () => c.destroy();
    }, []);

    return client;
}
```

```typescript
// hooks/useBasketManager.ts — EVM calls via viem
import { createPublicClient, createWalletClient, http, parseEther } from "viem";
import { BASKET_MANAGER_ABI, BASKET_MANAGER_ADDRESS } from "../config/contracts";

const publicClient = createPublicClient({
    chain: polkadotHubTestnet,
    transport: http("https://westend-asset-hub-eth-rpc.polkadot.io"),
});

export function useDeposit() {
    const { data: walletClient } = useWalletClient();

    const deposit = async (basketId: bigint, amountDOT: number) => {
        const hash = await walletClient!.writeContract({
            address: BASKET_MANAGER_ADDRESS,
            abi: BASKET_MANAGER_ABI,
            functionName: "deposit",
            args: [basketId],
            value: parseEther(amountDOT.toString()),
        });
        return hash;
    };

    return { deposit };
}
```

---

## AllocationChart Component

```typescript
// components/AllocationChart.tsx
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

interface Allocation {
    name: string;   // e.g. "Hydration LP"
    weight: number; // e.g. 40 (percent)
    color: string;
}

const DEFAULT_ALLOCATIONS: Allocation[] = [
    { name: "Hydration LP",      weight: 40, color: "#E6007A" },
    { name: "Moonbeam Lending",  weight: 30, color: "#53CBC9" },
    { name: "Acala Staking",     weight: 30, color: "#FF4B4B" },
];

export function AllocationChart({ allocations = DEFAULT_ALLOCATIONS }) {
    return (
        <PieChart width={320} height={280}>
            <Pie
                data={allocations}
                cx={160}
                cy={130}
                outerRadius={100}
                dataKey="weight"
                label={({ name, weight }) => `${name}: ${weight}%`}
            >
                {allocations.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                ))}
            </Pie>
            <Tooltip formatter={(value) => `${value}%`} />
            <Legend />
        </PieChart>
    );
}
```

---

## XCMStatus Component

```typescript
// components/XCMStatus.tsx
interface XCMMessage {
    id: string;
    fromChain: string;
    toChain: string;
    amount: string;
    status: "pending" | "confirmed" | "failed";
    txHash?: string;
    explorerUrl?: string;
}

export function XCMStatus({ messages }: { messages: XCMMessage[] }) {
    const statusIcon = (s: string) =>
        s === "confirmed" ? "✅" : s === "failed" ? "❌" : "⏳";

    return (
        <div className="xcm-status">
            <h3>XCM Message Status</h3>
            {messages.map(msg => (
                <div key={msg.id} className="xcm-row">
                    <span>{statusIcon(msg.status)}</span>
                    <span>{msg.fromChain} → {msg.toChain}</span>
                    <span>{msg.amount} DOT</span>
                    {msg.explorerUrl && (
                        <a href={msg.explorerUrl} target="_blank" rel="noreferrer">
                            View ↗
                        </a>
                    )}
                </div>
            ))}
        </div>
    );
}
```

---

## DepositForm Component

```typescript
// components/DepositForm.tsx
export function DepositForm({ basketId }: { basketId: bigint }) {
    const [amount, setAmount] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { deposit } = useDeposit();

    const allocation = [
        { chain: "Hydration LP",     pct: 40 },
        { chain: "Moonbeam Lending", pct: 30 },
        { chain: "Acala Staking",    pct: 30 },
    ];

    const handleDeposit = async () => {
        setIsLoading(true);
        try {
            const hash = await deposit(basketId, parseFloat(amount));
            console.log("Deposit tx:", hash);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <input
                type="number"
                placeholder="Amount in DOT"
                value={amount}
                onChange={e => setAmount(e.target.value)}
            />

            {amount && (
                <div className="allocation-preview">
                    <p>Your {amount} DOT will be deployed:</p>
                    {allocation.map(a => (
                        <div key={a.chain}>
                            {a.chain}: {((parseFloat(amount) * a.pct) / 100).toFixed(2)} DOT
                        </div>
                    ))}
                </div>
            )}

            <button onClick={handleDeposit} disabled={isLoading || !amount}>
                {isLoading ? "Minting..." : "Mint xDOT-LIQ Token"}
            </button>
        </div>
    );
}
```

---

## Chain Config (viem)

```typescript
// config/chains.ts
import { defineChain } from "viem";

export const polkadotHubTestnet = defineChain({
    id: 420420421,
    name: "Polkadot Hub Testnet",
    nativeCurrency: { name: "Westend DOT", symbol: "WND", decimals: 18 },
    rpcUrls: {
        default: { http: ["https://westend-asset-hub-eth-rpc.polkadot.io"] },
    },
    blockExplorers: {
        default: {
            name: "Subscan",
            url: "https://assethub-westend.subscan.io",
        },
    },
    testnet: true,
});
```

> **Verify the chain ID** — the Westend Asset Hub EVM chain ID may differ from 420420421. Check with OpenGuild Discord or the official hub docs.

---

## Demo Checklist

Before recording the demo video, verify:

- [ ] Wallet connects (both EVM and Substrate)
- [ ] Basket page loads with correct allocation percentages
- [ ] Deposit of 10 WND completes and tx appears on explorer
- [ ] XCM status panel shows 2 messages dispatched
- [ ] Basket token balance updates in UI
- [ ] Rebalance button triggers and updates allocation display
- [ ] AllocationChart animates smoothly
- [ ] Explorer links open to correct transactions

---

*Part of PolkaBasket implementation plan. See also: `POLKABASKET_IMPLEMENTATION_PLAN.md`, `CONTRACTS.md`, `PVM_ENGINE.md`*
