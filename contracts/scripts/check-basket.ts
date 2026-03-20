import { ethers } from "hardhat";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

async function main() {
  const BASKET_MANAGER_ADDRESS = process.env.VITE_BASKET_MANAGER_ADDRESS || "";
  const rpcUrl = process.env.VITE_RPC_URL || process.env.RPC_URL || "https://eth-rpc-testnet.polkadot.io";
  if (!BASKET_MANAGER_ADDRESS) {
    throw new Error("Missing VITE_BASKET_MANAGER_ADDRESS in .env");
  }
  
  console.log("Checking BasketManager at:", BASKET_MANAGER_ADDRESS);
  
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  // Minimal ABI for checking
  const abi = [
    "function getBasket(uint256 basketId) view returns (tuple(uint256 id, string name, address token, tuple(uint32 paraId, address protocol, uint16 weightBps, bytes depositCall, bytes withdrawCall)[] allocations, uint256 totalDeposited, bool active))",
    "function nextBasketId() view returns (uint256)",
  ];
  
  const basketManager = new ethers.Contract(BASKET_MANAGER_ADDRESS, abi, provider);
  
  try {
    const nextId = await basketManager.nextBasketId();
    console.log("Next Basket ID:", nextId.toString());
    
    for (let i = 0; i < Math.min(Number(nextId), 3); i++) {
      try {
        const basket = await basketManager.getBasket(i);
        console.log(`\nBasket ${i}:`);
        console.log("  Name:", basket.name);
        console.log("  Token:", basket.token);
        console.log("  Active:", basket.active);
        console.log("  Total Deposited:", ethers.formatEther(basket.totalDeposited), "PAS");
        console.log("  Allocations:", basket.allocations.length);
        for (const alloc of basket.allocations) {
          console.log(`    - Para ${alloc.paraId}: ${alloc.weightBps / 100}%`);
        }
      } catch (e) {
        console.log(`Basket ${i}: Error -`, (e as Error).message);
      }
    }
  } catch (e) {
    console.error("Error:", e);
  }
}

main().catch(console.error);
