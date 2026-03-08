import { ethers } from "hardhat";

async function main() {
  const [deployer, user1, user2, user3] = await ethers.getSigners();
  
  const FUND_AMOUNT = ethers.parseEther("100");
  
  console.log("Funding test wallets...");
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));
  
  // Fund user1
  console.log("\nFunding user1...");
  const tx1 = await deployer.sendTransaction({
    to: user1.address,
    value: FUND_AMOUNT
  });
  await tx1.wait();
  console.log("  Funded user1:", user1.address);
  
  // Fund user2
  console.log("Funding user2...");
  const tx2 = await deployer.sendTransaction({
    to: user2.address,
    value: FUND_AMOUNT
  });
  await tx2.wait();
  console.log("  Funded user2:", user2.address);
  
  // Fund user3
  console.log("Funding user3...");
  const tx3 = await deployer.sendTransaction({
    to: user3.address,
    value: FUND_AMOUNT
  });
  await tx3.wait();
  console.log("  Funded user3:", user3.address);
  
  console.log("\n=== Funding Complete ===");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
