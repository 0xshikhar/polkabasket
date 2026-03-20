import { ethers } from "hardhat";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const FALLBACK_XCM_PRECOMPILE = "0x0000000000000000000000000000000000000800";

async function main() {
  const rpcUrl = process.env.VITE_RPC_URL || process.env.RPC_URL || "https://eth-rpc-testnet.polkadot.io";
  const managerAddress = process.env.VITE_BASKET_MANAGER_ADDRESS || "";
  const pvmEngineAddress = process.env.VITE_PVM_ENGINE_ADDRESS || "";

  if (!managerAddress) {
    throw new Error("Missing VITE_BASKET_MANAGER_ADDRESS in .env");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const network = await provider.getNetwork();
  console.log("RPC:", rpcUrl);
  console.log("Chain ID:", network.chainId.toString());

  const managerCode = await provider.getCode(managerAddress);
  console.log("BasketManager:", managerAddress);
  console.log("BasketManager code length:", managerCode.length);

  const managerAbi = [
    "function nextBasketId() view returns (uint256)",
    "function getBasket(uint256 basketId) view returns (tuple(uint256 id, string name, address token, tuple(uint32 paraId, address protocol, uint16 weightBps, bytes depositCall, bytes withdrawCall)[] allocations, uint256 totalDeposited, bool active))",
    "function xcmEnabled() view returns (bool)",
    "function xcmPrecompile() view returns (address)",
    "function pvmEngine() view returns (address)",
    "function owner() view returns (address)",
  ];
  const manager = new ethers.Contract(managerAddress, managerAbi, provider);

  const nextBasketId = await manager.nextBasketId();
  console.log("nextBasketId:", nextBasketId.toString());

  if (nextBasketId > 0n) {
    const basket0 = await manager.getBasket(0n);
    console.log("basket[0].active:", basket0.active);
    console.log("basket[0].name:", basket0.name);
    console.log("basket[0].allocations:", basket0.allocations.length.toString());
    console.log("basket[0].totalDeposited:", basket0.totalDeposited.toString());
  }

  try {
    const owner = await manager.owner();
    console.log("owner:", owner);
  } catch {
    console.log("owner: unavailable");
  }

  let xcmPrecompile = FALLBACK_XCM_PRECOMPILE;
  let managerPVMEngine = "";
  try {
    const xcmEnabled = await manager.xcmEnabled();
    xcmPrecompile = await manager.xcmPrecompile();
    managerPVMEngine = await manager.pvmEngine();
    console.log("xcmEnabled:", xcmEnabled);
    console.log("xcmPrecompile:", xcmPrecompile);
    console.log("manager.pvmEngine:", managerPVMEngine);
  } catch {
    console.log("xcmEnabled/xcmPrecompile/pvmEngine: unavailable (older deployment ABI)");
  }

  const xcmCode = await provider.getCode(xcmPrecompile);
  console.log("xcmPrecompile code length:", xcmCode.length);

  if (managerPVMEngine) {
    const managerPVMCode = await provider.getCode(managerPVMEngine);
    console.log("manager.pvmEngine code length:", managerPVMCode.length);
  }

  if (pvmEngineAddress) {
    const pvmCode = await provider.getCode(pvmEngineAddress);
    console.log("PVM Engine:", pvmEngineAddress);
    console.log("PVM Engine code length:", pvmCode.length);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
