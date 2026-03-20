import { ethers, network } from "hardhat";
import "dotenv/config";

const HUB_PARA_ID = 1000;
const FUND_AMOUNT_ETHER = "2";

const PARACHAINS = {
  HYDRATION: 2034,
  MOONBEAM: 2004,
  ACALA: 2000,
} as const;

function deriveSovereignAccount(contractAddress: string, paraId: number): string {
  const siblingContext = "SiblingChain";
  const accountKey20 = "AccountKey20";
  
  const data = ethers.solidityPacked(
    ["string", "uint32", "string", "address"],
    [siblingContext, HUB_PARA_ID, accountKey20, contractAddress]
  );
  
  const hash = ethers.keccak256(ethers.toUtf8Bytes(data));
  return hash;
}

async function main() {
  const basketManagerAddress = process.env.BASKET_MANAGER_ADDRESS;

  if (!basketManagerAddress) {
    console.error("Set BASKET_MANAGER_ADDRESS in .env");
    process.exit(1);
  }

  console.log("Network:", network.name);
  console.log("BasketManager:", basketManagerAddress);

  const [deployer] = await ethers.getSigners();
  console.log("Funded by:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH");

  const sovereignAccounts: Record<number, string> = {};
  console.log("\n=== Sovereign Accounts ===");

  for (const [name, paraId] of Object.entries(PARACHAINS)) {
    sovereignAccounts[paraId] = deriveSovereignAccount(basketManagerAddress, paraId);
    const currentBalance = await ethers.provider.getBalance(sovereignAccounts[paraId]);
    console.log(`\n${name} (Para ${paraId}):`);
    console.log(`  Address: ${sovereignAccounts[paraId]}`);
    console.log(`  Balance: ${ethers.formatEther(currentBalance)} PAS`);

    if (currentBalance < ethers.parseEther("0.5")) {
      console.log(`  Status: LOW - needs funding`);
      console.log(`  Funding with ${FUND_AMOUNT_ETHER} PAS...`);

      const tx = await deployer.sendTransaction({
        to: sovereignAccounts[paraId],
        value: ethers.parseEther(FUND_AMOUNT_ETHER),
      });
      await tx.wait();
      console.log(`  Funded! TX: ${tx.hash}`);
    } else {
      console.log(`  Status: OK`);
    }
  }

  console.log("\n=== Summary ===");
  console.log("All sovereign accounts should now have ~2 PAS each for XCM fees");
  console.log("Note: Actual XCM fees vary by chain and message complexity");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
