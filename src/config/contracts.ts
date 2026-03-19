export const polkadotHubTestnet = {
  id: 420420421,
  name: "Westend Asset Hub",
  nativeCurrency: { name: "Westend DOT", symbol: "WND", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://westend-asset-hub-eth-rpc.polkadot.io"] },
  },
  blockExplorers: {
    default: {
      name: "Subscan",
      url: "https://assethub-westend.subscan.io",
    },
  },
  testnet: true,
};

export const paseoAssetHub = {
  id: 420420417,
  name: "Paseo Asset Hub",
  nativeCurrency: { name: "Paseo DOT", symbol: "PASEO", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://services.polkadothub-rpc.com/testnet"] },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://blockscout-passet-hub.parity-testnet.parity.io",
    },
  },
  testnet: true,
};

export const PARACHAINS = {
  HYDRA: { id: 2034, name: "Hydration", type: "LP" },
  MOONBEAM: { id: 2004, name: "Moonbeam", type: "Lending" },
  ACALA: { id: 2000, name: "Acala", type: "Staking" },
} as const;

// PVM Engine configuration
// Set VITE_USE_MOCK_PVM=true in .env to use mock for local testing
export const USE_MOCK_PVM = import.meta.env.VITE_USE_MOCK_PVM === 'true';

// Contract addresses
// For local testing with mock: deploy MockPVMEngine and update this
export const PVM_ENGINE_ADDRESS = USE_MOCK_PVM
  ? "0x0000000000000000000000000000000000000900" // Mock address
  : "0x0000000000000000000000000000000000000900"; // Real PVM (when deployed)

export const DEFAULT_CHAINS = [PARACHAINS.HYDRA, PARACHAINS.MOONBEAM, PARACHAINS.ACALA] as const;

export const BASKET_MANAGER_ADDRESS = "0x0000000000000000000000000000000000000001";

export const BASKET_MANAGER_ABI = [
  {
    type: "function",
    name: "createBasket",
    inputs: [
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
      {
        name: "allocations",
        type: "tuple[]",
        components: [
          { name: "paraId", type: "uint32" },
          { name: "protocol", type: "address" },
          { name: "weightBps", type: "uint16" },
          { name: "depositCall", type: "bytes" },
          { name: "withdrawCall", type: "bytes" },
        ],
      },
    ],
    outputs: [{ name: "basketId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "deposit",
    inputs: [{ name: "basketId", type: "uint256" }],
    outputs: [{ name: "tokensMinted", type: "uint256" }],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "withdraw",
    inputs: [
      { name: "basketId", type: "uint256" },
      { name: "tokenAmount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "rebalance",
    inputs: [{ name: "basketId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getBasket",
    inputs: [{ name: "basketId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "name", type: "string" },
          { name: "token", type: "address" },
          { name: "totalDeposited", type: "uint256" },
          { name: "active", type: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getBasketNAV",
    inputs: [{ name: "basketId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "nextBasketId",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "BasketCreated",
    inputs: [
      { name: "basketId", type: "uint256", indexed: true },
      { name: "name", type: "string" },
      { name: "token", type: "address" },
    ],
  },
  {
    type: "event",
    name: "Deposited",
    inputs: [
      { name: "basketId", type: "uint256", indexed: true },
      { name: "user", type: "address", indexed: true },
      { name: "amount", type: "uint256" },
      { name: "tokensMinted", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "Withdrawn",
    inputs: [
      { name: "basketId", type: "uint256", indexed: true },
      { name: "user", type: "address", indexed: true },
      { name: "tokensBurned", type: "uint256" },
      { name: "amountOut", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "Rebalanced",
    inputs: [
      { name: "basketId", type: "uint256", indexed: true },
      { name: "timestamp", type: "uint256" },
    ],
  },
] as const;

export const BASKET_TOKEN_ABI = [
  {
    type: "function",
    name: "name",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "symbol",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalSupply",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "transfer",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export const XCM_PRECOMPILE_ABI = [
  {
    type: "function",
    name: "sendXCM",
    inputs: [
      { name: "destParaId", type: "uint32" },
      { name: "xcmMessage", type: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "teleportAsset",
    inputs: [
      { name: "destParaId", type: "uint32" },
      { name: "amount", type: "uint256" },
      { name: "beneficiary", type: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

export const PVM_ENGINE_ABI = [
  {
    type: "function",
    name: "optimizeAllocation",
    inputs: [{ name: "input", type: "bytes" }],
    outputs: [{ name: "", type: "bytes" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "rebalanceBasket",
    inputs: [{ name: "input", type: "bytes" }],
    outputs: [{ name: "", type: "bytes" }],
    stateMutability: "view",
  },
] as const;

export const RPC_URLS = {
  WESTEND: "https://westend-asset-hub-eth-rpc.polkadot.io",
  PASEO: "https://services.polkadothub-rpc.com/testnet",
  HYDRATION: "https://rpc.nice.hydration.cloud",
  MOONBASE: "https://rpc.api.moonbase.moonbeam.network",
} as const;

export const EXPLORER_URLS = {
  WESTEND: "https://assethub-westend.subscan.io",
  PASEO: "https://blockscout-passet-hub.parity-testnet.parity.io",
  HYDRATION: "https://hydration.subscan.io",
  MOONBASE: "https://moonbase.subscan.io",
} as const;
