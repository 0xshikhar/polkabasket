# Deploy Contracts, Faucet & How to Use

This doc answers: **how to deposit**, **how baskets are created**, **what to deploy and in what order**, and **where to get testnet DOT**.

---

## 1. DOT testnet faucet (Westend)

You need **WND** (Westend DOT) for gas and for depositing into baskets. The app targets **Westend Asset Hub** (EVM).

### Get testnet WND

1. **Official Polkadot faucet**  
   - Go to: **https://faucet.polkadot.io/westend**
   - Choose **“Hub (smart contracts)”** (or the option that targets Asset Hub / EVM).
   - Enter your **EVM address** (0x…) from SubWallet/MetaMask (the same account you use in the app).
   - Complete the captcha and submit.
   - You get **10 WND** per request, usually **once per 24 hours**.

2. **Alternative**  
   - **Triangle Platform:** https://faucet.triangleplatform.com/polkadot/westend  
   - Smaller amount per request; use if the official faucet is rate-limited.

### Important

- Use the **same EVM address** in the faucet that you connect in the TeleBasket UI.
- If the faucet only accepts SS58 (Substrate) addresses, get WND to your Substrate account, then send WND to your **EVM address** on Asset Hub via the wallet (transfer to Asset Hub, then to your 0x address if needed).

---

## 2. What contracts to deploy (and in what order)

You only deploy **one** contract: **BasketManager**.

- **BasketManager** – deploys and owns everything:
  - Creates baskets and, for each basket, deploys a **BasketToken** (ERC‑20) and stores its address.
- You do **not** deploy BasketToken yourself; the manager does it in `createBasket(...)`.

### Deploy order

1. Deploy **BasketManager** (once).
2. (Optional) Call **createBasket** from the deploy script to create the first basket (e.g. “xDOT-LIQ”).

So: **one contract to deploy (BasketManager), then optionally create baskets from the same deploy script.**

---

## 3. How to deploy

### Prerequisites

- Node.js and npm in the repo root (and in `contracts/` if you run scripts from there).
- A **private key** with some WND on Westend Asset Hub (from the faucet above). Use a **test-only** key.

### Steps

1. **Install and compile**

   ```bash
   cd pvm/contracts
   npm install
   npx hardhat compile
   ```

2. **Set deployer key**

   Set the private key (without `0x` or with, depending on your env):

   ```bash
   export PRIVATE_KEY=your_hex_private_key_here
   ```

   (Use the same account you funded with the faucet.)

3. **Deploy to Westend Asset Hub**

   From the repo root (where `hardhat.config.ts` is):

   ```bash
   cd pvm
   npx hardhat run contracts/scripts/deploy.ts --network polkadotHub
   ```

   Or from `pvm/contracts`:

   ```bash
   npx hardhat run scripts/deploy.ts --network polkadotHub
   ```

   The script will:

   - Deploy **BasketManager**.
   - Call **createBasket("xDOT Liquidity Basket", "xDOT-LIQ", allocations)** so the first basket (id `0`) exists.

4. **Copy the deployed address**

   The script prints something like:

   ```text
   BasketManager deployed to: 0x1234...abcd
   ```

   Copy that address.

5. **Point the frontend at the deployed contract**

   In **`pvm/src/config/contracts.ts`**, set:

   ```ts
   export const BASKET_MANAGER_ADDRESS = "0x1234...abcd";  // paste deployed address
   ```

   Rebuild/restart the app so the UI uses the real contract.

---

## 4. How someone creates a basket

- **On-chain:** Only the **owner** of BasketManager can create baskets (the deployer is the owner).
- **How it’s done:** Call `BasketManager.createBasket(name, symbol, allocations)`.
- **In this repo:** The **deploy script** already creates one basket (xDOT-LIQ). To create more:
  - Use a Hardhat/script that calls `manager.createBasket(...)` with the same shape of `allocations` (paraId, protocol, weightBps, depositCall, withdrawCall), or
  - Build an “admin” or “create basket” UI that sends that transaction from the owner wallet.

So: **deploy BasketManager → run deploy script (creates first basket) → optionally add more baskets via script or owner-only UI.**

---

## 5. How to deposit into a basket (user flow)

1. **Get WND**  
   Use the [faucet](#1-dot-testnet-faucet-westend) and send WND to your **EVM** address on Westend Asset Hub.

2. **Open the app**  
   Run the frontend (e.g. `npm run dev` in `pvm/`), and open the app in the browser.

3. **Connect wallet**  
   Click **“Connect Wallet”** and connect the same EVM account that holds WND (SubWallet EVM or MetaMask).

4. **Go to Baskets**  
   In the navbar, open **“Baskets”** and pick a basket (e.g. xDOT-LIQ).

5. **Deposit**  
   On the basket page:
   - Choose the **“Deposit”** tab.
   - Enter the amount of DOT (WND) you want to deposit.
   - Click **“Deposit DOT”** (or “Mint xDOT-LIQ Token”).
   - Confirm the transaction in your wallet. You receive basket tokens in return.

6. **Withdraw (optional)**  
   Use the **“Withdraw”** tab, enter the amount of basket tokens to burn, and submit. You get DOT (WND) back.

---

## 6. Summary

| Question | Answer |
|----------|--------|
| **DOT testnet faucet** | https://faucet.polkadot.io/westend — select “Hub (smart contracts)” and use your EVM address. |
| **What to deploy** | Only **BasketManager**. BasketToken is created per basket by the manager. |
| **Deploy order** | 1) Deploy BasketManager, 2) (optional) Call `createBasket` in the same script. |
| **How to create a basket** | Owner calls `BasketManager.createBasket(name, symbol, allocations)`. Deploy script does this for the first basket. |
| **How to deposit** | Connect EVM wallet → Baskets → pick basket → Deposit tab → enter amount → “Deposit DOT” → confirm tx. |

After updating `BASKET_MANAGER_ADDRESS` in `pvm/src/config/contracts.ts` and ensuring your wallet has WND from the faucet, you can deposit and withdraw against the live contract on Westend Asset Hub.
