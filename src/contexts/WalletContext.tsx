import { createContext, useContext, useCallback, useState, type ReactNode } from "react";
import type { WalletClient } from "viem";
import { useEVMWallet } from "../hooks/useEVMWallet";
import { useSubWallet, type SubWalletAccount } from "../hooks/useSubWallet";

export interface WalletState {
  evm: {
    address: `0x${string}` | null;
    walletClient: WalletClient | null;
    chainId: number | null;
    isConnected: boolean;
  };
  substrate: {
    account: SubWalletAccount | null;
    isConnected: boolean;
  };
}

interface WalletContextValue {
  state: WalletState;
  isAvailable: boolean;
  error: string | null;
  loading: boolean;
  connectEVM: () => Promise<void>;
  connectSubstrate: () => Promise<void>;
  disconnect: () => void;
  switchChain: (chainId: number) => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

const POLKADOT_HUB_CHAIN_ID = 420420421;

export function WalletProvider({ children }: { children: ReactNode }) {
  const evm = useEVMWallet();
  const substrate = useSubWallet();
  const [globalError, setGlobalError] = useState<string | null>(null);

  const connectEVM = useCallback(async () => {
    setGlobalError(null);
    try {
      await evm.connect();
    } catch (err) {
      const message = err instanceof Error ? err.message : "EVM connection failed";
      setGlobalError(message);
    }
  }, [evm]);

  const connectSubstrate = useCallback(async () => {
    setGlobalError(null);
    try {
      await substrate.connect();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Substrate connection failed";
      setGlobalError(message);
    }
  }, [substrate]);

  const disconnect = useCallback(() => {
    evm.disconnect();
    substrate.disconnect();
    setGlobalError(null);
  }, [evm, substrate]);

  const switchChain = useCallback(async (chainId: number) => {
    if (!evm.walletClient) {
      throw new Error("Wallet not connected");
    }
    const provider = (evm.walletClient as unknown as { transport: { cache: { _internalType: string } } }).transport;
    if (!provider) {
      throw new Error("Provider not available");
    }
    
    const injectedProvider = (window as Window & { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<void> } }).ethereum;
    if (!injectedProvider) {
      throw new Error("No injected provider");
    }

    try {
      await injectedProvider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
    } catch (switchError) {
      if ((switchError as { code?: number }).code === 4902) {
        throw new Error("Chain not added to wallet");
      }
      throw switchError;
    }
  }, [evm.walletClient]);

  const value: WalletContextValue = {
    state: {
      evm: {
        address: evm.address,
        walletClient: evm.walletClient,
        chainId: evm.address ? POLKADOT_HUB_CHAIN_ID : null,
        isConnected: evm.isConnected,
      },
      substrate: {
        account: substrate.account,
        isConnected: !!substrate.account,
      },
    },
    isAvailable: evm.isAvailable || substrate.isAvailable,
    error: globalError || evm.error || substrate.error,
    loading: evm.loading || substrate.loading,
    connectEVM,
    connectSubstrate,
    disconnect,
    switchChain,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}

export function useWalletAddress() {
  const { state } = useWallet();
  return state.evm.address;
}

export function useWalletClient() {
  const { state } = useWallet();
  return state.evm.walletClient;
}
