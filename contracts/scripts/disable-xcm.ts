import { ethers } from "hardhat";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

async function main() {
  const managerAddress = process.env.VITE_BASKET_MANAGER_ADDRESS || "";
  if (!managerAddress) {
    throw new Error("Missing VITE_BASKET_MANAGER_ADDRESS in .env");
  }

  const [signer] = await ethers.getSigners();
  if (!signer) {
    throw new Error("No signer available. Set PRIVATE_KEY in .env");
  }

  console.log("Network signer:", await signer.getAddress());
  console.log("BasketManager:", managerAddress);

  const abi = [
    "function owner() view returns (address)",
    "function xcmEnabled() view returns (bool)",
    "function setXCMEnabled(bool enabled) external",
  ];

  const contract = new ethers.Contract(managerAddress, abi, signer);
  const owner = await contract.owner();
  const current = await contract.xcmEnabled();
  const signerAddress = await signer.getAddress();

  console.log("Owner:", owner);
  console.log("xcmEnabled (before):", current);

  if (owner.toLowerCase() !== signerAddress.toLowerCase()) {
    throw new Error("Signer is not owner; cannot call setXCMEnabled");
  }

  if (!current) {
    console.log("XCM already disabled.");
    return;
  }

  const tx = await contract.setXCMEnabled(false);
  console.log("Submitted tx:", tx.hash);
  await tx.wait();

  const after = await contract.xcmEnabled();
  console.log("xcmEnabled (after):", after);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
