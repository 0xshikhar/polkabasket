import { ethers, network } from "hardhat";

const XCM_PRECOMPILE_ADDRESS = "0x0000000000000000000000000000000000000800";
const PVM_ENGINE_ADDRESS = "0x0000000000000000000000000000000000000900";

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  
  if (!privateKey) {
    console.error("Error: PRIVATE_KEY not set");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider("https://westend-asset-hub-eth-rpc.polkadot.io");
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log("Deploying with:", wallet.address);
  console.log("Network:", network.name);

  // Deploy MockXCMPrecompile
  const MockXCM = await ethers.getContractFactory("MockXCMPrecompile", wallet);
  const mockXCM = await MockXCM.deploy({ gasLimit: 500000 });
  await mockXCM.waitForDeployment();
  console.log("MockXCMPrecompile deployed to:", await mockXCM.getAddress());

  // Set up XCM precompile at the expected address
  const xcmCode = await provider.getCode(await mockXCM.getAddress());
  await provider.send("hardhat_setCode", [XCM_PRECOMPILE_ADDRESS, xcmCode]);
  console.log("XCM precompile set up at:", XCM_PRECOMPILE_ADDRESS);

  // Deploy MockPVMEngine
  const MockPVM = await ethers.getContractFactory("MockPVMEngine", wallet);
  const mockPVM = await MockPVM.deploy({ gasLimit: 500000 });
  await mockPVM.waitForDeployment();
  console.log("MockPVMEngine deployed to:", await mockPVM.getAddress());

  // Set up PVM engine at the expected address
  const pvmCode = await provider.getCode(await mockPVM.getAddress());
  await provider.send("hardhat_setCode", [PVM_ENGINE_ADDRESS, pvmCode]);
  console.log("PVM engine set up at:", PVM_ENGINE_ADDRESS);

  // Deploy BasketManager
  const BasketManager = await ethers.getContractFactory("BasketManager", wallet);
  const basketManager = await BasketManager.deploy({ gasLimit: 1000000 });
  await basketManager.waitForDeployment();
  console.log("BasketManager deployed to:", await basketManager.getAddress());

  console.log("\n✅ All contracts deployed successfully!");
  console.log("\nUpdate your frontend config:");
  console.log(`BASKET_MANAGER_ADDRESS = "${await basketManager.getAddress()}"`);
}

main().catch(console.error);
