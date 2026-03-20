const { ethers } = require("ethers");

const BASKET_MANAGER = "0x60C1676d4f8CAdb4ac7818D6c8D537b5c3F9BBc5";
const PRIVATE_KEY = "0x9b14771598f8bf44732e7fb3be561d0b59662d570a25b38f724d17fc9d0c8a40";
const RPC_URL = "https://eth-rpc-testnet.polkadot.io";

const ABI = [
  "function createBasket(string calldata name, string calldata symbol, (uint32 paraId, address protocol, uint16 weightBps, bytes depositCall, bytes withdrawCall)[] calldata allocations) external returns(uint256 basketId)",
  "function owner() external view returns(address)",
  "function nextBasketId() external view returns(uint256)"
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  const contract = new ethers.Contract(BASKET_MANAGER, ABI, wallet);
  
  console.log("Owner:", await contract.owner());
  console.log("Current nextBasketId:", await contract.nextBasketId());
  
  const allocations = [
    { paraId: 2034, protocol: "0x0000000000000000000000000000000000000000", weightBps: 5000, depositCall: "0x", withdrawCall: "0x" },
    { paraId: 2004, protocol: "0x0000000000000000000000000000000000000000", weightBps: 3000, depositCall: "0x", withdrawCall: "0x" },
    { paraId: 2000, protocol: "0x0000000000000000000000000000000000000000", weightBps: 2000, depositCall: "0x", withdrawCall: "0x" }
  ];
  
  console.log("Creating basket...");
  const tx = await contract.createBasket("xDOT-LIQ", "xDOT-LIQ", allocations, {
    gasPrice: ethers.parseUnits("1000", "gwei"),
    gasLimit: 5000000
  });
  
  console.log("Tx hash:", tx.hash);
  const receipt = await tx.wait();
  console.log("Confirmed in block:", receipt.blockNumber);
  
  console.log("New nextBasketId:", await contract.nextBasketId());
}

main().catch(err => {
  console.error("Error:", err.message || err);
  process.exit(1);
});
