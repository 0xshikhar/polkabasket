import { ethers } from "hardhat";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

async function main() {
  const XCM_PRECOMPILE = "0x0000000000000000000000000000000000000800";
  const rpcUrl = process.env.VITE_RPC_URL || process.env.RPC_URL || "https://eth-rpc-testnet.polkadot.io";
  const basketManagerAddress = process.env.VITE_BASKET_MANAGER_ADDRESS || "";
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  // Check if precompile has code
  const code = await provider.getCode(XCM_PRECOMPILE);
  console.log("XCM Precompile code length:", code.length);
  console.log("XCM Precompile code:", code.substring(0, 100) + "...");
  
  if (code === "0x") {
    console.log("\n❌ XCM Precompile NOT deployed at this address!");
    console.log("This is why deposits revert - the contract tries to call XCM but it's not available.");
  } else {
    console.log("\n✓ XCM Precompile has code");
  }

  if (basketManagerAddress) {
    const balance = await provider.getBalance(basketManagerAddress);
    console.log("\nBasketManager balance:", ethers.formatEther(balance), "PAS");

    const abi = ["function xcmEnabled() view returns (bool)"];
    const contract = new ethers.Contract(basketManagerAddress, abi, provider);
    try {
      const enabled = await contract.xcmEnabled();
      console.log("xcmEnabled():", enabled);
    } catch {
      console.log("xcmEnabled(): not available on this deployment");
    }
  }
}

main().catch(console.error);
