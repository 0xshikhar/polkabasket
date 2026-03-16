import { ethers } from "ethers";
import { readFileSync } from "fs";

const RPC_URL = process.env.ETH_RPC_URL || "https://eth-rpc-testnet.polkadot.io";
const PRIVATE_KEY = process.env.PRIVATE_KEY;

async function main() {
  if (!PRIVATE_KEY) {
    console.error("Error: PRIVATE_KEY environment variable not set");
    process.exit(1);
  }

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = wallet.connect(provider);
  
  console.log("Deployer:", signer.address);
  
  const contractBytecode = readFileSync("./contract.polkavm");
  console.log("Contract size:", contractBytecode.length, "bytes");
  
  // Get nonce
  const nonce = await provider.getTransactionCount(signer.address);
  console.log("Nonce:", nonce);
  
  // Get gas price
  const feeData = await provider.getFeeData();
  console.log("Gas price:", feeData.gasPrice?.toString());
  
  // Estimate gas
  console.log("Estimating gas...");
  try {
    const gasEstimate = await provider.estimateGas({
      from: signer.address,
      data: "0x" + contractBytecode.toString("hex")
    });
    console.log("Gas estimate:", gasEstimate.toString());
  } catch (e) {
    console.log("Gas estimate failed:", e.message);
  }
  
  // Send transaction
  console.log("\nSending transaction...");
  const tx = await signer.sendTransaction({
    to: null, // Contract creation
    data: "0x" + contractBytecode.toString("hex"),
    gasPrice: feeData.gasPrice,
    gasLimit: 5000000 // 5M gas
  });
  
  console.log("Transaction hash:", tx.hash);
  console.log("Waiting for confirmation...");
  
  const receipt = await tx.wait();
  console.log("\n✓ Contract deployed!");
  console.log("Block:", receipt.blockNumber);
  console.log("Contract address:", receipt.contractAddress);
}

main().catch(console.error);
