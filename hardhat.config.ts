import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "berlin",
    },
  },
  networks: {
    polkadotHub: {
      url: "https://westend-asset-hub-eth-rpc.polkadot.io",
      chainId: 420420421,
      accounts: [process.env.PRIVATE_KEY!],
    },
    chopsticks: {
      url: "http://localhost:8545",
      chainId: 420420421,
      accounts: [process.env.PRIVATE_KEY!],
    },
  },
};

export default config;
