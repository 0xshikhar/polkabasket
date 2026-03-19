import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";
import "dotenv/config";

const privateKey = process.env.PRIVATE_KEY || "";
const rpcUrl = process.env.RPC_URL || "https://eth-rpc-testnet.polkadot.io";

const accounts = /^0x[0-9a-fA-F]{64}$/.test(privateKey) ? [privateKey] : [];

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    hardhat: {},
    paseo: {
      url: rpcUrl,
      chainId: 420420417,
      accounts,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
  },
};

export default config;
