import { ethers, network } from "hardhat";

const XCM_PRECOMPILE_ADDRESS = "0x0000000000000000000000000000000000000800";

async function main() {
  console.log("Network:", network.name);

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");

  console.log("\n=== XCM Precompile Deployment ===");
  console.log("Target address:", XCM_PRECOMPILE_ADDRESS);

  const existingCode = await ethers.provider.getCode(XCM_PRECOMPILE_ADDRESS);
  if (existingCode && existingCode !== "0x") {
    console.log("\nXCM precompile already exists at", XCM_PRECOMPILE_ADDRESS);
    console.log("Code length:", existingCode.length, "bytes");
    
    const confirm = await new Promise((resolve) => {
      process.stdout.write("Overwrite? (y/N): ");
      process.stdin.once("data", (data) => {
        resolve(data.toString().trim().toLowerCase() === "y");
      });
    });
    
    if (!confirm) {
      console.log("Skipping deployment");
      return;
    }
  }

  console.log("\nDeploying XCMPrecompile...");

  const Factory = await ethers.getContractFactory("XCMPrecompile", deployer);

  const precompile = await Factory.deploy({
    gasLimit: 5000000,
  });

  console.log("Transaction:", precompile.deploymentTransaction()?.hash);
  await precompile.waitForDeployment();

  const deployedAddress = await precompile.getAddress();
  console.log("Deployed to:", deployedAddress);

  console.log("\n=== Critical Next Step ===");
  console.log("The XCM precompile must be at address", XCM_PRECOMPILE_ADDRESS);
  console.log("Deployed address:", deployedAddress);
  console.log("\nOptions:");
  console.log("1. Update hardhat config to deploy at exact address (requires CREATE2)");
  console.log("2. Deploy to any address and update BasketManager.xcmPrecompile");
  console.log("3. Use the deployed address as-is if address doesn't matter");

  console.log("\nIf using option 2, call:");
  console.log(`await basketManager.setXCMPrecompile("${deployedAddress}")`);

  console.log("\n=== Update .env ===");
  console.log(`VITE_XCM_PRECOMPILE_ADDRESS=${deployedAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
