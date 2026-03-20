import { ethers, network } from "hardhat";
import "dotenv/config";

const HUB_PARA_ID = 1000;

const PARACHAINS: Record<string, { id: number; name: string; minBalance: string; explorer: string }> = {
  HYDRATION: {
    id: 2034,
    name: "Hydration",
    minBalance: "1",
    explorer: "https://hydration.subscan.io",
  },
  MOONBEAM: {
    id: 2004,
    name: "Moonbeam",
    minBalance: "1.5",
    explorer: "https://moonbase.subscan.io",
  },
  ACALA: {
    id: 2000,
    name: "Acala",
    minBalance: "1",
    explorer: "https://acala.subscan.io",
  },
};

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

async function checkBalance(address: string, chain: string): Promise<{ balance: bigint; formatted: string }> {
  try {
    const balance = await ethers.provider.getBalance(address);
    return { balance, formatted: ethers.formatEther(balance) };
  } catch (error) {
    console.error(`  Error checking ${chain} balance:`, (error as Error).message);
    return { balance: 0n, formatted: "Error" };
  }
}

async function main() {
  const basketManagerAddress = process.env.BASKET_MANAGER_ADDRESS;

  if (!basketManagerAddress) {
    console.error("Set BASKET_MANAGER_ADDRESS in .env or as environment variable");
    console.error("Usage: BASKET_MANAGER_ADDRESS=0x... npx hardhat run scripts/verify-sovereign.ts");
    process.exit(1);
  }

  console.log("=".repeat(70));
  console.log("Sovereign Account Verification");
  console.log("=".repeat(70));
  console.log("\nNetwork:", network.name);
  console.log("BasketManager:", basketManagerAddress);

  const [deployer] = await ethers.getSigners();
  console.log("Checked by:", deployer.address);

  console.log("\n" + "-".repeat(70));
  console.log("Sovereign Accounts");
  console.log("-".repeat(70));
  console.log("\nNote: Sovereign accounts are on remote chains (Hydration, Moonbeam, Acala)");
  console.log("      Check balances using the explorer links below.\n");

  const accounts: Record<string, { address: string; status: string }> = {};

  for (const [name, chain] of Object.entries(PARACHAINS)) {
    const sovereignAddress = deriveSovereignAccount(basketManagerAddress, chain.id);

    accounts[name] = {
      address: sovereignAddress,
      status: "Check explorer",
    };

    console.log(`${name} (Para ${chain.id}):`);
    console.log(`  Address:   ${sovereignAddress}`);
    console.log(`  Check at:  ${chain.explorer}/account/${sovereignAddress}`);
    console.log("");
  }

  console.log("\n" + "-".repeat(70));
  console.log("XCM Precompile Status");
  console.log("-".repeat(70));

  const xcmPrecompile = "0x00000000000000000000000000000000000a0000";
  const xcmCode = await ethers.provider.getCode(xcmPrecompile);
  const hasXCM = xcmCode && xcmCode !== "0x";

  console.log("\nXCM Precompile:", xcmPrecompile);
  console.log("Status:", hasXCM ? "\x1b[32mDEPLOYED\x1b[0m" : "\x1b[31mNOT DEPLOYED\x1b[0m");
  console.log("Note: This is Polkadot's standard XCM precompile address");
  if (hasXCM) {
    console.log("Code size:", xcmCode.length, "bytes");
  }

  console.log("\n" + "-".repeat(70));
  console.log("BasketManager Status");
  console.log("-".repeat(70));

  const managerCode = await ethers.provider.getCode(basketManagerAddress);
  console.log("\nBasketManager:", basketManagerAddress);
  console.log("Code deployed:", managerCode !== "0x" ? "\x1b[32mYES\x1b[0m" : "\x1b[31mNO\x1b[0m");

  if (managerCode !== "0x") {
    const BasketManager = await ethers.getContractAt("BasketManager", basketManagerAddress);
    const xcmEnabled = await BasketManager.xcmEnabled();
    const xcmConfigured = await BasketManager.xcmPrecompile();

    console.log("XCM Enabled:", xcmEnabled ? "\x1b[32mYES\x1b[0m" : "\x1b[33mNO\x1b[0m");
    console.log("XCM Precompile:", xcmConfigured);

    const nextBasketId = await BasketManager.nextBasketId();
    console.log("Total Baskets:", nextBasketId.toString());

    if (nextBasketId > 0n) {
      console.log("\nBaskets:");
      for (let i = 0; i < nextBasketId; i++) {
        const basket = await BasketManager.getBasket(i);
        console.log(`  [${i}] ${basket.name}`);
        console.log(`      Token: ${basket.token}`);
        console.log(`      Active: ${basket.active}`);
        console.log(`      Deposited: ${ethers.formatEther(basket.totalDeposited)} PAS`);
        console.log(`      Allocations: ${basket.allocations.length}`);
        for (const alloc of basket.allocations) {
          console.log(`        - Para ${alloc.paraId}: ${Number(alloc.weightBps) / 100}%`);
        }
      }
    }
  }

  console.log("\n" + "-".repeat(70));
  console.log("Summary");
  console.log("-".repeat(70));

  console.log("\n\x1b[33m⚠ SOVEREIGN ACCOUNTS NEED MANUAL FUNDING\x1b[0m");
  console.log("  These accounts are on remote chains - fund via cross-chain transfer");
  console.log("  or through each chain's faucet/transfer UI.\n");

  if (!hasXCM) {
    console.log("\x1b[31m✗ XCM precompile not deployed at standard address\x1b[0m");
    console.log("  Note: On Paseo, the precompile may be pre-deployed by the network.");
    console.log("  Check with network documentation for precompile status.");
  } else {
    console.log("\x1b[32m✓ XCM precompile available\x1b[0m");
  }

  console.log("\n" + "=".repeat(70));

  console.log("\n=== Quick Actions ===\n");

  console.log("1. Fund all sovereign accounts:");
  console.log("   cd contracts && npm run fund:sovereign\n");

  console.log("2. Deploy XCM precompile:");
  console.log("   cd contracts && npm run deploy:xcm-precompile\n");

  console.log("3. If XCM precompile deployed to different address:");
  console.log("   await basketManager.setXCMPrecompile('<address>')\n");

  console.log("4. Enable XCM:");
  console.log("   await basketManager.setXCMEnabled(true)\n");

  console.log("5. Check sovereign balances on explorers:");
  for (const [name, chain] of Object.entries(PARACHAINS)) {
    const sovereign = deriveSovereignAccount(basketManagerAddress, chain.id);
    console.log(`   ${name}: ${chain.explorer}/account/${sovereign}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
