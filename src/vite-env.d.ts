/// <reference types="vite/client" />

/** SubWallet / Polkadot.js extension inject (Substrate) */
interface InjectedExtension {
  accounts: {
    get: () => Promise<{ address: string; name?: string }[]>;
    subscribe: (cb: (accounts: { address: string; name?: string }[]) => void) => () => void;
  };
  signer: unknown;
  metadata: unknown;
}

declare global {
  interface Window {
    injectedWeb3?: Record<string, { enable: () => Promise<InjectedExtension> }>;
    /** SubWallet EVM provider */
    SubWallet?: { isSubWallet?: boolean; request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
    /** MetaMask / standard EIP-1193 */
    ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
  }
}
