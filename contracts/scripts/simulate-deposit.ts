import { ethers } from "hardhat";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

async function main() {
  const managerAddress = process.env.VITE_BASKET_MANAGER_ADDRESS || "";
  const basketId = BigInt(process.env.BASKET_ID || "0");
  const amount = process.env.DEPOSIT_AMOUNT || "1";

  if (!managerAddress) {
    throw new Error("Missing VITE_BASKET_MANAGER_ADDRESS in .env");
  }

  const [signer] = await ethers.getSigners();
  if (!signer) {
    throw new Error("No signer available. Set PRIVATE_KEY in .env");
  }

  const abi = [
    "function deposit(uint256 basketId) payable returns (uint256)",
    "function getBasket(uint256 basketId) view returns (tuple(uint256 id, string name, address token, tuple(uint32 paraId, address protocol, uint16 weightBps, bytes depositCall, bytes withdrawCall)[] allocations, uint256 totalDeposited, bool active))",
    "function xcmEnabled() view returns (bool)",
    "function xcmPrecompile() view returns (address)",
  ];
  const manager = new ethers.Contract(managerAddress, abi, signer);

  console.log("Simulating deposit");
  console.log("Manager:", managerAddress);
  console.log("Sender:", await signer.getAddress());
  console.log("Basket ID:", basketId.toString());
  console.log("Amount:", amount, "PAS");

  const basket = await manager.getBasket(basketId);
  console.log("Basket active:", basket.active);
  console.log("Basket name:", basket.name);
  try {
    const xcmEnabled = await manager.xcmEnabled();
    const xcmPrecompile = await manager.xcmPrecompile();
    const xcmCode = await ethers.provider.getCode(xcmPrecompile);
    console.log("xcmEnabled:", xcmEnabled);
    console.log("xcmPrecompile:", xcmPrecompile);
    console.log("xcmPrecompile code length:", xcmCode.length);
  } catch {
    console.log("xcmEnabled/xcmPrecompile unavailable (older deployment ABI)");
  }

  try {
    const minted = await manager.deposit.staticCall(
      basketId,
      { value: ethers.parseUnits(amount, 18) }
    );
    console.log("Simulation success, tokensMinted:", minted.toString());
  } catch (error) {
    const e = error as { shortMessage?: string; message?: string };
    console.log("Simulation reverted:");
    console.log(e.shortMessage || e.message || String(error));
    console.log("\nAction:");
    console.log("1) Redeploy latest BasketManager: npm run deploy:paseo");
    console.log("2) Update ../.env VITE_BASKET_MANAGER_ADDRESS to new address");
    console.log("3) Re-run: npm run health:paseo && npm run simulate:deposit");
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
