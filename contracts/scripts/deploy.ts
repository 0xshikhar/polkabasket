import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const BasketManager = await ethers.getContractFactory("BasketManager");
  const manager = await BasketManager.deploy();
  await manager.waitForDeployment();
  console.log("BasketManager deployed to:", await manager.getAddress());

  const tx = await manager.createBasket(
    "xDOT Liquidity Basket",
    "xDOT-LIQ",
    [
      {
        paraId: 2034,
        protocol: "0x0000000000000000000000000000000000000001",
        weightBps: 4000,
        depositCall: "0x",
        withdrawCall: "0x",
      },
      {
        paraId: 2004,
        protocol: "0x0000000000000000000000000000000000000002",
        weightBps: 3000,
        depositCall: "0x",
        withdrawCall: "0x",
      },
      {
        paraId: 2000,
        protocol: "0x0000000000000000000000000000000000000003",
        weightBps: 3000,
        depositCall: "0x",
        withdrawCall: "0x",
      },
    ]
  );
  await tx.wait();
  console.log("xDOT-LIQ basket created");
}

main().catch(console.error);
