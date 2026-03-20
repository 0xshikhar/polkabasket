import { defineChain, parseGwei, type Chain } from "viem";

const DEFAULT_PASEO_GAS_PRICE_GWEI = import.meta.env.VITE_GAS_PRICE_GWEI || "1100";
export const APP_LEGACY_GAS_PRICE = parseGwei(DEFAULT_PASEO_GAS_PRICE_GWEI);

export const westendAssetHub = defineChain({
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
});

export const polkadotHubTestnet = defineChain({
  id: 420420417,
  name: "Polkadot Hub TestNet (Paseo)",
  nativeCurrency: { name: "Paseo DOT", symbol: "PAS", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://eth-rpc-testnet.polkadot.io"] },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://blockscout-testnet.polkadot.io",
    },
  },
  fees: {
    estimateFeesPerGas: async () => ({
      gasPrice: APP_LEGACY_GAS_PRICE,
    }),
  },
  testnet: true,
});

export const paseoAssetHub = defineChain({
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
});

export const PARACHAINS = {
  HYDRA: { id: 2034, name: "Hydration", type: "LP" },
  MOONBEAM: { id: 2004, name: "Moonbeam", type: "Lending" },
  ACALA: { id: 2000, name: "Acala", type: "Staking" },
} as const;

export const CHAIN_CONFIG = {
  id: Number(import.meta.env.VITE_CHAIN_ID) || 420420417,
  name: "Polkadot Hub TestNet",
  rpcUrl: import.meta.env.VITE_RPC_URL || "https://eth-rpc-testnet.polkadot.io",
  explorerUrl: "https://blockscout-testnet.polkadot.io",
  explorerName: "Blockscout",
};

export const APP_NETWORK = (import.meta.env.VITE_NETWORK || "paseo").toLowerCase();

const NETWORK_CHAINS: Record<string, Chain> = {
  westend: westendAssetHub,
  paseo: polkadotHubTestnet,
};

const ENV_CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID);
const CHAIN_FROM_ENV_ID =
  Number.isFinite(ENV_CHAIN_ID) && ENV_CHAIN_ID > 0
    ? (Object.values(NETWORK_CHAINS).find((c) => c.id === ENV_CHAIN_ID) ?? null)
    : null;

export const APP_CHAIN =
  CHAIN_FROM_ENV_ID ||
  NETWORK_CHAINS[APP_NETWORK] ||
  polkadotHubTestnet;
export const APP_RPC_URL = import.meta.env.VITE_RPC_URL || APP_CHAIN.rpcUrls.default.http[0];
export const APP_CHAIN_ID = APP_CHAIN.id;
export const APP_CHAIN_NAME = APP_CHAIN.name;
export const APP_NATIVE_SYMBOL = APP_CHAIN.nativeCurrency.symbol;
export const APP_NATIVE_DECIMALS = APP_CHAIN.nativeCurrency.decimals;
export const APP_EXPLORER_URL = APP_CHAIN.blockExplorers?.default.url || "";

function normalizeExplorerBaseUrl(url: string) {
  return url.replace(/\/+$/, "");
}

export function getExplorerTxUrl(txHash: string, baseUrl = APP_EXPLORER_URL): string | null {
  if (!baseUrl) return null;
  const base = normalizeExplorerBaseUrl(baseUrl);
  if (base.includes("subscan.io")) return `${base}/evm/tx/${txHash}`;
  return `${base}/tx/${txHash}`;
}

export function getExplorerExtrinsicUrl(txHash: string, baseUrl = APP_EXPLORER_URL): string | null {
  if (!baseUrl) return null;
  const base = normalizeExplorerBaseUrl(baseUrl);
  if (base.includes("subscan.io")) return `${base}/extrinsic/${txHash}`;
  return `${base}/tx/${txHash}`;
}

export function getExplorerAddressUrl(address: string, baseUrl = APP_EXPLORER_URL): string | null {
  if (!baseUrl) return null;
  const base = normalizeExplorerBaseUrl(baseUrl);
  if (base.includes("subscan.io")) return `${base}/evm/address/${address}`;
  return `${base}/address/${address}`;
}

export const USE_MOCK_PVM = import.meta.env.VITE_USE_MOCK_PVM === 'true';
export const PVM_CODE_HASH = import.meta.env.VITE_PVM_CODE_HASH || "";
export const PVM_ENGINE_ADDRESS = import.meta.env.VITE_PVM_ENGINE_ADDRESS || "";
export const BASKET_MANAGER_ADDRESS = import.meta.env.VITE_BASKET_MANAGER_ADDRESS || "";

// XCM Mode Configuration
// local: Full XCM functionality (for local development with working XCM)
// testnet: Simulated XCM for demo purposes (Paseo testnet limitation)
export const XCM_MODE = (import.meta.env.VITE_XCM_MODE || 
  (APP_NETWORK === 'paseo' ? 'testnet' : 'local')
).toLowerCase() as 'local' | 'testnet';

export const IS_LOCAL_XCM = XCM_MODE === 'local';
export const IS_TESTNET_XCM = XCM_MODE === 'testnet';

export const DEFAULT_CHAINS = [PARACHAINS.HYDRA, PARACHAINS.MOONBEAM, PARACHAINS.ACALA] as const;

export const ALLOCATION_CONFIG_ABI = [
  { name: "paraId", type: "uint32" },
  { name: "protocol", type: "address" },
  { name: "weightBps", type: "uint16" },
  { name: "depositCall", type: "bytes" },
  { name: "withdrawCall", type: "bytes" },
] as const;

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
        components: ALLOCATION_CONFIG_ABI,
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
          { name: "allocations", type: "tuple[]", components: ALLOCATION_CONFIG_ABI },
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
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "rebalanceThresholdBps",
    inputs: [],
    outputs: [{ name: "", type: "uint16" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "xcmEnabled",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "xcmPrecompile",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "pvmEngine",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "setXCMEnabled",
    inputs: [{ name: "enabled", type: "bool" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setPVMEngine",
    inputs: [{ name: "engine", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
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
    name: "DeploymentDispatched",
    inputs: [
      { name: "basketId", type: "uint256", indexed: true },
      { name: "paraId", type: "uint32" },
      { name: "amount", type: "uint256" },
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
  {
    type: "event",
    name: "XCMMessageSent",
    inputs: [
      { name: "paraId", type: "uint32", indexed: true },
      { name: "messageHash", type: "bytes32", indexed: true },
      { name: "amount", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "XCMMessageFailed",
    inputs: [
      { name: "paraId", type: "uint32", indexed: true },
      { name: "reason", type: "string" },
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
  {
    type: "function",
    name: "mint",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "burn",
    inputs: [
      { name: "from", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
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
  PASEO: "https://eth-rpc-testnet.polkadot.io",
  PASEO_SERVICES: "https://services.polkadothub-rpc.com/testnet",
  HYDRATION: "https://rpc.nice.hydration.cloud",
  MOONBASE: "https://rpc.api.moonbase.moonbeam.network",
} as const;

export const EXPLORER_URLS = {
  WESTEND: "https://assethub-westend.subscan.io",
  PASEO: "https://blockscout-testnet.polkadot.io",
  HYDRATION: "https://hydration.subscan.io",
  MOONBASE: "https://moonbase.subscan.io",
} as const;
