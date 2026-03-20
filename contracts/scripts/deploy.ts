import { ethers, network } from "hardhat";
import "dotenv/config";

const HUB_PARA_ID = 1000;

function bufferToHex(buffer: Buffer): string {
  return "0x" + buffer.toString("hex");
}

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

function encodeSiblingDestination(paraId: number): Buffer {
  const dest = Buffer.alloc(6);
  dest[0] = 0x05;
  dest[1] = 0x01;
  dest[2] = 0x02;
  dest[3] = 0x04;
  dest[4] = (paraId >> 8) & 0xff;
  dest[5] = paraId & 0xff;
  return dest;
}

function bufToHex(buffer: Buffer): string {
  return "0x" + buffer.toString("hex");
}

function encodeCompactU256(value: bigint): Buffer {
  const bytes: number[] = [];
  let val = value;
  
  while (val > 0n) {
    bytes.push(Number(val & 0xffn));
    val >>= 8n;
  }
  
  if (bytes.length === 0) bytes.push(0);
  
  return Buffer.from(bytes.reverse().map((b, i) => (b << 2) | (i === bytes.length - 1 ? 0 : 1)));
}

function encodeMultiAssetFungible(amount: bigint, parents: number = 1): Buffer {
  const amountBytes = encodeCompactU256(amount);
  
  const asset = Buffer.from([parents, 0x00]);
  const fungible = Buffer.concat([Buffer.from([0x01]), amountBytes]);
  const multiasset = Buffer.concat([Buffer.from([0x01]), asset, fungible]);
  
  return multiasset;
}

function buildWithdrawAsset(amount: bigint): Buffer {
  const inner = encodeMultiAssetFungible(amount);
  return Buffer.concat([Buffer.from([0x00]), inner]);
}

function buildBuyExecution(fees: bigint): Buffer {
  const feeAsset = encodeMultiAssetFungible(fees);
  return Buffer.concat([Buffer.from([0x03]), feeAsset, Buffer.from([0x00])]);
}

function buildDepositAsset(account32: Buffer): Buffer {
  return Buffer.concat([Buffer.from([0x06, 0x03, 0x01, 0x00]), account32]);
}

function encodeXCMV5(instructions: Buffer[]): Buffer {
  const totalLength = 2 + instructions.reduce((sum, i) => sum + i.length, 0);
  const message = Buffer.alloc(totalLength);
  
  message[0] = 0x05;
  message[1] = instructions.length << 2 | (instructions.length < 64 ? 0 : 1);
  
  let offset = 2;
  for (const instr of instructions) {
    instr.copy(message, offset);
    offset += instr.length;
  }
  
  return message;
}

function buildDepositXCM(amount: bigint, sovereignAccount: string): { destination: string; message: string } {
  const destination = encodeSiblingDestination(PARACHAINS.HYDRATION);
  
  const sovereignBytes = Buffer.from(sovereignAccount.slice(2), "hex");
  const account32 = Buffer.alloc(32);
  sovereignBytes.copy(account32, 32 - sovereignBytes.length);
  
  const feeAmount = amount / 100n;
  
  const instructions = [
    buildWithdrawAsset(amount),
    buildBuyExecution(feeAmount),
    buildDepositAsset(account32),
  ];
  
  return {
    destination: bufToHex(destination),
    message: bufToHex(encodeXCMV5(instructions)),
  };
}

function buildWithdrawXCM(amount: bigint, recipient: string): { destination: string; message: string } {
  const destination = encodeSiblingDestination(PARACHAINS.HYDRATION);
  
  const recipientBytes = Buffer.from(recipient.slice(2), "hex");
  
  const feeAmount = amount / 100n;
  
  const instructions = [
    buildWithdrawAsset(amount),
    buildBuyExecution(feeAmount),
    Buffer.from([0x0a]),
    buildDepositAsset(recipientBytes),
  ];
  
  return {
    destination: bufToHex(destination),
    message: bufToHex(encodeXCMV5(instructions)),
  };
}

async function main() {
  console.log("=".repeat(70));
  console.log("PolkaBasket Deployment - SCALE XCM V5");
  console.log("=".repeat(70));
  console.log("\nNetwork:", network.name);

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "PAS");

  const overrides = { gasLimit: 15000000 };

  console.log("\n" + "-".repeat(70));
  console.log("Step 1: Deploying BasketManager");
  console.log("-".repeat(70));

  const ManagerFactory = await ethers.getContractFactory("BasketManager", deployer);
  console.log("Deploying BasketManager...");

  const manager = await ManagerFactory.deploy(overrides);
  console.log("Transaction:", manager.deploymentTransaction()?.hash ?? "pending");
  await manager.waitForDeployment();

  const managerAddress = await manager.getAddress();
  console.log("BasketManager deployed to:", managerAddress);

  console.log("\n" + "-".repeat(70));
  console.log("Step 2: Creating xDOT-LIQ Basket");
  console.log("-".repeat(70));

  const sovereignAccounts: Record<number, string> = {};
  for (const [, paraId] of Object.entries(PARACHAINS)) {
    sovereignAccounts[paraId] = deriveSovereignAccount(managerAddress, paraId);
    console.log(`Sovereign for para ${paraId}: ${sovereignAccounts[paraId]}`);
  }

  const depositXCM = buildDepositXCM(BigInt(ethers.parseEther("1").toString()), sovereignAccounts[PARACHAINS.HYDRATION]);
  const withdrawXCM = buildWithdrawXCM(BigInt(ethers.parseEther("1").toString()), managerAddress);

  console.log("\nXCM Configuration:");
  console.log("  Deposit destination:", depositXCM.destination);
  console.log("  Deposit message:", depositXCM.message.slice(0, 60) + "...");
  console.log("  Withdraw destination:", withdrawXCM.destination);
  console.log("  Withdraw message:", withdrawXCM.message.slice(0, 60) + "...");

  console.log("\nCreating basket with SCALE XCM V5 messages...");
  const createTx = await manager.createBasket(
    "xDOT Liquidity Basket",
    "xDOT-LIQ",
    [
      {
        paraId: PARACHAINS.HYDRATION,
        protocol: "0x0000000000000000000000000000000000000001",
        weightBps: 4000,
        depositCall: depositXCM.message,
        withdrawCall: withdrawXCM.message,
      },
      {
        paraId: PARACHAINS.MOONBEAM,
        protocol: "0x0000000000000000000000000000000000000002",
        weightBps: 3000,
        depositCall: depositXCM.message,
        withdrawCall: withdrawXCM.message,
      },
      {
        paraId: PARACHAINS.ACALA,
        protocol: "0x0000000000000000000000000000000000000003",
        weightBps: 3000,
        depositCall: depositXCM.message,
        withdrawCall: withdrawXCM.message,
      },
    ],
    overrides
  );
  await createTx.wait();
  console.log("xDOT-LIQ basket created (ID: 0)!");

  console.log("\n" + "-".repeat(70));
  console.log("Sovereign Account Summary");
  console.log("-".repeat(70));

  console.log("\nFund these accounts with PAS for XCM fees:");
  for (const [name, paraId] of Object.entries(PARACHAINS)) {
    console.log(`  ${name} (${paraId}): ${sovereignAccounts[paraId]}`);
  }

  console.log("\n" + "-".repeat(70));
  console.log("Deployment Summary");
  console.log("-".repeat(70));

  const basket = await manager.getBasket(0n);
  console.log("\nAddresses:");
  console.log("  BasketManager:", managerAddress);
  console.log("  Basket Token:", basket.token);
  console.log("  XCM Precompile: 0x00000000000000000000000000000000000a0000 (standard)");

  console.log("\nBasket:");
  console.log("  Name:", basket.name);
  console.log("  Active:", basket.active);
  console.log("  Allocations:");
  for (const alloc of basket.allocations) {
    const chainName = Object.entries(PARACHAINS).find(
      ([, id]) => id === Number(alloc.paraId)
    )?.[0];
    console.log(`    - ${chainName} (${alloc.paraId}): ${Number(alloc.weightBps) / 100}%`);
  }

  console.log("\n" + "=".repeat(70));
  console.log("Next Steps");
  console.log("=".repeat(70));

  console.log("\n1. Update .env with:");
  console.log(`   VITE_BASKET_MANAGER_ADDRESS=${managerAddress}`);
  console.log(`   VITE_BASKET_TOKEN_ADDRESS=${basket.token}`);
  console.log(`   VITE_XCM_PRECOMPILE_ADDRESS=0x00000000000000000000000000000000000a0000`);

  console.log("\n2. Fund sovereign accounts:");
  console.log("   cd contracts && npm run fund:sovereign");

  console.log("\n3. Verify deployment:");
  console.log("   npm run verify:sovereign");

  console.log("\n4. Test XCM:");
  console.log("   npm run verify:xcm TX_HASH=<tx-hash>");
}

main().catch((error) => {
  console.error("\n❌ Deployment failed!");
  console.error(error);
  process.exit(1);
});
