import { createContext, useContext, type ReactNode } from "react";
import type { WalletClient } from "viem";
import { useEVMWallet } from "../hooks/useEVMWallet";

interface WalletContextValue {
  address: `0x${string}` | null;
  walletClient: WalletClient | null;
  isAvailable: boolean;
  error: string | null;
  loading: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnected: boolean;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const evm = useEVMWallet();
  const value: WalletContextValue = {
    address: evm.address,
    walletClient: evm.walletClient,
    isAvailable: evm.isAvailable,
    error: evm.error,
    loading: evm.loading,
    connect: evm.connect,
    disconnect: evm.disconnect,
    isConnected: evm.isConnected,
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
