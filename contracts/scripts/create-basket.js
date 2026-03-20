const hre = require("hardhat");

async function main() {
  const provider = new hre.ethers.JsonRpcProvider("https://eth-rpc-testnet.polkadot.io");
  const signer = new hre.ethers.Wallet("0x9b14771598f8bf44732e7fb3be561d0b59662d570a25b38f724d17fc9d0c8a40", provider);
  
  const BasketManager = await hre.ethers.getContractFactory("BasketManager", signer);
  const contract = BasketManager.attach("0x60C1676d4f8CAdb4ac7818D6c8D537b5c3F9BBc5");
  
  const allocations = [
    { paraId: 2034, protocol: "0x0000000000000000000000000000000000000000", weightBps: 5000, depositCall: "0x", withdrawCall: "0x" },
    { paraId: 2004, protocol: "0x0000000000000000000000000000000000000000", weightBps: 3000, depositCall: "0x", withdrawCall: "0x" },
    { paraId: 2000, protocol: "0x0000000000000000000000000000000000000000", weightBps: 2000, depositCall: "0x", withdrawCall: "0x" }
  ];
  
  console.log("Creating basket...");
  const tx = await contract.createBasket("xDOT-LIQ", "xDOT-LIQ", allocations, {
    gasPrice: hre.ethers.parseUnits("1000", "gwei"),
    gasLimit: 5000000
  });
  
  console.log("Tx:", tx.hash);
  const receipt = await tx.wait();
  console.log("Receipt:", receipt.hash);
  
  const nextId = await contract.nextBasketId();
  console.log("nextBasketId:", nextId);
}

main().catch(console.error);
