const { ethers } = require("ethers");
const fs = require("fs");
require("dotenv").config();

async function main() {
  const rpcUrl = process.argv[2] || process.env.PASEO_RPC_URL || process.env.RPC_URL || "https://eth-rpc-testnet.polkadot.io";
  const privateKey = process.env.PRIVATE_KEY;
  
  if (!privateKey) {
    console.error("PRIVATE_KEY not found in .env");
    process.exit(1);
  }
  
  console.log("Connecting to:", rpcUrl);
  
  // Configure provider with retry and timeout
  const provider = new ethers.JsonRpcProvider(rpcUrl, undefined, {
    staticNetwork: true,
    batchMaxCount: 1,
    timeout: 120000,
  });
  
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log("Deployer:", wallet.address);
  
  // Get bytecode and ABI
  const artifactPath = "./out/BasketManager.sol/BasketManager.json";
  console.log("Reading artifact from:", artifactPath);
  
  let artifact;
  try {
    artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  } catch (e) {
    console.error("Failed to read artifact:", e.message);
    console.log("Current directory:", process.cwd());
    console.log("Files in out/:", fs.readdirSync("./out"));
    process.exit(1);
  }
  
  const bytecode = artifact.bytecode.object || artifact.bytecode;
  console.log("Bytecode size:", bytecode ? bytecode.length / 2 - 1 : "null", "bytes");
  
  const factory = new ethers.ContractFactory(artifact.abi, bytecode, wallet);
  
  console.log("Deploying BasketManager (this may take a few minutes)...");
  
  try {
    const contract = await factory.deploy({
      gasLimit: 15000000,
    });
    
    console.log("Transaction sent:", contract.deploymentTransaction().hash);
    console.log("Waiting for confirmation (this can take a while on Paseo)...");
    
    const deploymentTx = contract.deploymentTransaction();
    if (deploymentTx) {
      const receipt = await deploymentTx.wait();
      console.log("Block number:", receipt.blockNumber);
    }
    
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    
    console.log("\n✅ BasketManager deployed to:", address);
    
    // Create basket
    console.log("\nCreating xDOT-LIQ basket...");
    const tx = await contract.createBasket(
      "xDOT Liquidity Basket",
      "xDOT-LIQ",
      [
        { paraId: 2034, protocol: "0x0000000000000000000000000000000000000001", weightBps: 4000, depositCall: "0x", withdrawCall: "0x" },
        { paraId: 2004, protocol: "0x0000000000000000000000000000000000000002", weightBps: 3000, depositCall: "0x", withdrawCall: "0x" },
        { paraId: 2000, protocol: "0x0000000000000000000000000000000000000003", weightBps: 3000, depositCall: "0x", withdrawCall: "0x" },
      ],
      { gasLimit: 5000000 }
    );
    await tx.wait();
    console.log("✅ Basket created!");
    
    // Check basket
    const basket = await contract.getBasket(0);
    console.log("\nBasket 0:");
    console.log("  Name:", basket.name);
    console.log("  Token:", basket.token);
    console.log("  Active:", basket.active);
    
    // Check XCM precompile
    const xcmCode = await provider.getCode("0x0000000000000000000000000000000000000800");
    if (!xcmCode || xcmCode === "0x") {
      console.log("\nXCM precompile not available - disabling...");
      try {
        const disableTx = await contract.setXCMEnabled(false);
        await disableTx.wait();
        console.log("✅ XCM disabled");
      } catch (e) {
        console.log("Note: setXCMEnabled not available:", e.message);
      }
    } else {
      console.log("\nXCM precompile available at 0x800");
    }
    
    console.log("\n" + "=".repeat(50));
    console.log("DEPLOYMENT COMPLETE");
    console.log("=".repeat(50));
    console.log("BasketManager:", address);
    console.log("Token:", basket.token);
    console.log("Network: Paseo TestNet (Chain ID: 420420417)");
    console.log("Explorer: https://blockscout-passet-hub.parity-testnet.parity.io");
    console.log("\nUpdate your .env:");
    console.log(`VITE_BASKET_MANAGER_ADDRESS=${address}`);
    console.log(`VITE_BASKET_TOKEN_ADDRESS=${basket.token}`);
    
  } catch (error) {
    console.error("\n❌ Deployment failed:", error.message);
    if (error.code) console.error("Error code:", error.code);
    if (error.reason) console.error("Reason:", error.reason);
    if (error.transactionHash) console.error("TX Hash:", error.transactionHash);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
