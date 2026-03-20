import { ethers, network } from "hardhat";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

async function main() {
  console.log("Redeploying BasketManager on Paseo...");
  console.log("Network:", network.name);

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Deploy new BasketManager
  const BasketManager = await ethers.getContractFactory("BasketManager");
  const manager = await BasketManager.deploy();
  await manager.waitForDeployment();
  
  const managerAddress = await manager.getAddress();
  console.log("\n✓ BasketManager deployed to:", managerAddress);

  // Create xDOT-LIQ basket
  const tx = await manager.createBasket(
    "xDOT Liquidity Basket",
    "xDOT-LIQ",
    [
      {
        paraId: 2034,
        protocol: "0x0000000000000000000000000000000000000001",
        weightBps: 4000,
        depositCall: "0x",
        withdrawCall: "0x",
      },
      {
        paraId: 2004,
        protocol: "0x0000000000000000000000000000000000000002",
        weightBps: 3000,
        depositCall: "0x",
        withdrawCall: "0x",
      },
      {
        paraId: 2000,
        protocol: "0x0000000000000000000000000000000000000003",
        weightBps: 3000,
        depositCall: "0x",
        withdrawCall: "0x",
      },
    ]
  );
  await tx.wait();
  console.log("✓ xDOT-LIQ basket created (ID: 0)");

  const configuredPVMEngine = process.env.VITE_PVM_ENGINE_ADDRESS || "";
  if (configuredPVMEngine) {
    const pvmCode = await ethers.provider.getCode(configuredPVMEngine);
    if (pvmCode && pvmCode !== "0x") {
      const setEngineTx = await manager.setPVMEngine(configuredPVMEngine);
      await setEngineTx.wait();
      console.log("✓ PVM engine configured:", configuredPVMEngine);
    } else {
      console.log("⚠ Configured VITE_PVM_ENGINE_ADDRESS has no code; skipping setPVMEngine");
    }
  }

  const xcmAddress = await manager.xcmPrecompile();
  const xcmCode = await ethers.provider.getCode(xcmAddress);
  if (!xcmCode || xcmCode === "0x") {
    const disableTx = await manager.setXCMEnabled(false);
    await disableTx.wait();
    console.log(`✓ XCM disabled (no code at ${xcmAddress})`);
  } else {
    console.log(`✓ XCM precompile detected at ${xcmAddress}; XCM left enabled`);
  }

  // Verify basket
  const basket = await manager.getBasket(0);
  console.log("\nBasket 0 created:");
  console.log("  Name:", basket.name);
  console.log("  Token:", basket.token);
  console.log("  Active:", basket.active);

  console.log("\n=== UPDATE FRONTEND .env ===");
  console.log(`VITE_BASKET_MANAGER_ADDRESS=${managerAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
