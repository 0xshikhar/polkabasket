import { ethers, network } from "hardhat";
import "dotenv/config";

const HUB_PARA_ID = 1000;

const PARACHAINS: Record<string, { id: number; name: string; explorer: string }> = {
  HYDRATION: {
    id: 2034,
    name: "Hydration",
    explorer: "https://hydration.subscan.io",
  },
  MOONBEAM: {
    id: 2004,
    name: "Moonbeam",
    explorer: "https://moonbase.subscan.io",
  },
  ACALA: {
    id: 2000,
    name: "Acala",
    explorer: "https://acala.subscan.io",
  },
};

const XCM_EVENTS = [
  "XCMMessageSent",
  "XCMMessageFailed",
  "DeploymentDispatched",
  "DeploymentFailed",
  "Deposited",
  "Withdrawn",
];

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
  const txHash = process.env.TX_HASH;

  if (!basketManagerAddress) {
    console.error("Usage: TX_HASH=0x... BASKET_MANAGER_ADDRESS=0x... npx hardhat run scripts/verify-xcm.ts");
    process.exit(1);
  }

  console.log("=".repeat(70));
  console.log("XCM Message Verification");
  console.log("=".repeat(70));
  console.log("\nNetwork:", network.name);
  console.log("BasketManager:", basketManagerAddress);

  const BasketManager = await ethers.getContractAt("BasketManager", basketManagerAddress);

  console.log("\n" + "-".repeat(70));
  console.log("Recent XCM Events");
  console.log("-".repeat(70));

  const currentBlock = await ethers.provider.getBlockNumber();

  console.log("\nScanning blocks", currentBlock - 1000, "to", currentBlock);

  const filter = {
    address: basketManagerAddress,
    fromBlock: currentBlock - 1000,
    toBlock: currentBlock,
    topics: [
      [
        ethers.id("XCMMessageSent(uint32,uint256,bytes32)"),
        ethers.id("XCMMessageFailed(uint32,uint256,string)"),
        ethers.id("DeploymentDispatched(uint256,uint32,uint256)"),
        ethers.id("DeploymentFailed(uint256,uint32,uint256,string)"),
      ],
    ],
  };

  try {
    const logs = await ethers.provider.getLogs(filter);

    if (logs.length === 0) {
      console.log("\nNo XCM events found in recent blocks");
    } else {
      console.log(`\nFound ${logs.length} XCM event(s):\n`);

      for (const log of logs) {
        const eventName = XCM_EVENTS.find((name) => {
          const id = ethers.id(`${name}(${getEventParams(name)})`);
          return log.topics[0] === id;
        }) || "Unknown";

        console.log(`Event: ${eventName}`);
        console.log(`  Block: ${log.blockNumber}`);
        console.log(`  TX:    ${log.transactionHash}`);
        console.log(`  Log:   ${JSON.stringify(log.data)}`);
        console.log("");
      }
    }
  } catch (error) {
    console.error("Error fetching logs:", (error as Error).message);
  }

  if (txHash) {
    console.log("\n" + "-".repeat(70));
    console.log(`Transaction: ${txHash}`);
    console.log("-".repeat(70));

    try {
      const receipt = await ethers.provider.getTransactionReceipt(txHash);

      if (!receipt) {
        console.log("Transaction not found");
      } else {
        console.log("\nStatus:", receipt.status === 1 ? "\x1b[32mSUCCESS\x1b[0m" : "\x1b[31mFAILED\x1b[0m");
        console.log("Block:", receipt.blockNumber);
        console.log("Gas used:", receipt.gasUsed.toString());

        const managerFilter = {
          address: basketManagerAddress,
          topics: [null, null],
        };

        console.log("\nEvents from BasketManager:");
        const relevantLogs = receipt.logs.filter(
          (l) => l.address.toLowerCase() === basketManagerAddress.toLowerCase()
        );

        for (const log of relevantLogs) {
          console.log(`  ${log.topics[0]}`);
        }
      }
    } catch (error) {
      console.error("Error fetching transaction:", (error as Error).message);
    }
  }

  console.log("\n" + "-".repeat(70));
  console.log("Sovereign Account Activity");
  console.log("-".repeat(70));

  for (const [name, chain] of Object.entries(PARACHAINS)) {
    const sovereignAddress = deriveSovereignAccount(basketManagerAddress, chain.id);
    console.log(`\n${name} Sovereign Account:`);
    console.log(`  Address: ${sovereignAddress}`);
    console.log(`  Explorer: ${chain.explorer}/account/${sovereignAddress}`);
  }

  console.log("\n" + "=".repeat(70));
  console.log("\n=== Verification Steps ===\n");

  console.log("1. Check explorer for sovereign account activity:");
  for (const chain of Object.values(PARACHAINS)) {
    console.log(`   ${chain.explorer}`);
  }

  console.log("\n2. Verify XCM message hashes match on source and destination chains");

  console.log("\n3. Check for any XCM execution failed events on target chains");

  console.log("\n4. For local testing, use Chopsticks:");
  console.log("   npx @acala-network/chopsticks@latest");
  console.log("   --endpoint=wss://pasdot-rpc.polkadot.io");
  console.log("   --parachain=2034");
}

function getEventParams(eventName: string): string {
  const params: Record<string, string> = {
    XCMMessageSent: "uint32,uint256,bytes32",
    XCMMessageFailed: "uint32,uint256,string",
    DeploymentDispatched: "uint256,uint32,uint256",
    DeploymentFailed: "uint256,uint32,uint256,string",
  };
  return params[eventName] || "";
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
