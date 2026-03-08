export const polkadotHubTestnet = {
  id: 420420421,
  name: "Polkadot Hub Testnet",
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
] as const;
