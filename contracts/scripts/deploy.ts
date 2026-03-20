import { ethers, network } from "hardhat";

async function main() {
  console.log("Deploying to:", network.name);

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Use gas settings compatible with Polkadot Hub
  const overrides = {
    gasLimit: 15000000,
  };

  const Factory = await ethers.getContractFactory("BasketManager", deployer);
  
  console.log("Deploying BasketManager (this may take a while on Paseo)...");
  console.log("Contract bytecode size: ~25KB");
  
  try {
    const manager = await Factory.deploy(overrides);
    
    console.log("Transaction hash:", manager.deploymentTransaction().hash);
    console.log("Waiting for deployment...");
    
    await manager.waitForDeployment();
    const managerAddress = await manager.getAddress();
    console.log("✅ BasketManager deployed to:", managerAddress);

    console.log("\nCreating xDOT-LIQ basket...");
    
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
    console.log("✅ xDOT-LIQ basket created (ID: 0)!");

    // Check if XCM precompile is available
    console.log("\nChecking XCM precompile availability...");
    const xcmPrecompile = "0x0000000000000000000000000000000000000800";
    const xcmCode = await ethers.provider.getCode(xcmPrecompile);
    
    if (!xcmCode || xcmCode === "0x") {
      console.log("⚠️  XCM precompile not available - attempting to disable XCM...");
      try {
        const disableTx = await manager.setXCMEnabled(false);
        await disableTx.wait();
        console.log("✅ XCM disabled");
      } catch (e: unknown) {
        console.log("Note: setXCMEnabled not available:", (e as Error).message);
      }
    } else {
      console.log("✅ XCM precompile available at", xcmPrecompile);
    }

    // Verify basket
    const basket = await manager.getBasket(0n);
    console.log("\n=== Deployment Summary ===");
    console.log("BasketManager:", managerAddress);
    console.log("Basket Name:", basket.name);
    console.log("Basket Token:", basket.token);
    console.log("Active:", basket.active);

    console.log("\n=== Next Steps ===");
    console.log("1. Update .env with:");
    console.log(`   VITE_BASKET_MANAGER_ADDRESS=${managerAddress}`);
    console.log(`   VITE_BASKET_TOKEN_ADDRESS=${basket.token}`);
    console.log("\n2. Restart frontend: pnpm dev");

  } catch (error: unknown) {
    console.error("\n❌ Deployment failed!");
    const err = error as { message?: string; code?: string; receipt?: { contractAddress?: string } };
    console.error("Error:", err.message);
    console.error("Code:", err.code);
    if (err.receipt?.contractAddress) {
      console.error("Partial deploy at:", err.receipt.contractAddress);
    }
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
