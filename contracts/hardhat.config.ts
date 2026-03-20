import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";
import "dotenv/config";

const privateKey = process.env.PRIVATE_KEY || "";
const rpcUrl = process.env.RPC_URL || process.env.PASEO_RPC_URL || "https://eth-rpc-testnet.polkadot.io";
const legacyGasPrice = 1_000_000_000_000; // 1000 Gwei in wei (number)

const accounts = /^0x[0-9a-fA-F]{64}$/.test(privateKey) ? [privateKey] : [];

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    },
    paseo: {
      url: rpcUrl,
      chainId: 420420417,
      accounts,
      gasPrice: legacyGasPrice,
      gas: 15000000,
      timeout: 600000,
    },
    westend: {
      url: process.env.WESTEND_RPC_URL || "https://westend-asset-hub-eth-rpc.polkadot.io",
      chainId: 420420421,
      accounts,
      gasPrice: legacyGasPrice,
      gas: 15000000,
      timeout: 600000,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
  },
};

export default config;
