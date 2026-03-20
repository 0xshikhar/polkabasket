import { createContext, useContext, useCallback, useState, type ReactNode } from "react";
import type { WalletClient } from "viem";
import { useEVMWallet } from "../hooks/useEVMWallet";
import { useSubWallet, type SubWalletAccount } from "../hooks/useSubWallet";
import { APP_CHAIN_NAME } from "../config/contracts";

export interface WalletState {
  evm: {
    address: `0x${string}` | null;
    walletClient: WalletClient | null;
    chainId: number | null;
    isConnected: boolean;
    isCorrectChain: boolean;
    needsSwitchChain: boolean;
    targetChainId: number;
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
  switchChain: (chainId?: number) => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const evm = useEVMWallet();
  const substrate = useSubWallet();
  const [globalError, setGlobalError] = useState<string | null>(null);

  const connectEVM = useCallback(async () => {
    setGlobalError(null);
    try {
      await evm.connect();
      if (evm.needsSwitchChain) {
        setGlobalError(`Please switch to ${APP_CHAIN_NAME} (Chain ID: ${evm.targetChainId}) to continue.`);
      }
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

  const switchChain = useCallback(async (chainId?: number) => {
    try {
      await evm.switchChain(chainId);
      setGlobalError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to switch chain";
      setGlobalError(message);
      throw err;
    }
  }, [evm]);

  const value: WalletContextValue = {
    state: {
      evm: {
        address: evm.address,
        walletClient: evm.walletClient,
        chainId: evm.chainId,
        isConnected: evm.isConnected,
        isCorrectChain: evm.isCorrectChain,
        needsSwitchChain: evm.needsSwitchChain || false,
        targetChainId: evm.targetChainId,
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
