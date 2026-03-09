import { useCallback, useState } from "react";

const SUBWALLET_KEY = "subwallet-js";

export interface SubWalletAccount {
  address: string;
  name?: string;
}

export function useSubWallet() {
  const [account, setAccount] = useState<SubWalletAccount | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isAvailable =
    typeof window !== "undefined" &&
    Boolean((window as Window).injectedWeb3?.[SUBWALLET_KEY]);

  const getSubWalletExtension = () => (window as Window).injectedWeb3?.[SUBWALLET_KEY];

  const connect = useCallback(async () => {
    const inject = getSubWalletExtension();
    if (!inject) {
      setError("SubWallet extension not installed");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const ext = await inject.enable();
      const accounts = await ext.accounts.get();
      if (accounts.length > 0) {
        setAccount({ address: accounts[0].address, name: accounts[0].name });
      } else {
        setAccount(null);
        setError("No accounts in SubWallet");
      }
      // Subscribe to account changes (e.g. user switches account in extension)
      ext.accounts.subscribe((accounts) => {
        if (accounts.length > 0) {
          setAccount({ address: accounts[0].address, name: accounts[0].name });
        } else {
          setAccount(null);
        }
      });
    } catch (e) {
      const err = e as { message?: string; code?: number };
      if (err?.code === 4001) {
        setError("Connection rejected");
      } else {
        setError(err?.message ?? "Failed to connect SubWallet");
      }
      setAccount(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAccount(null);
    setError(null);
  }, []);

  return {
    isAvailable,
    account,
    error,
    loading,
    connect,
    disconnect,
  };
}

/** Truncate address for display */
export function truncateAddress(address: string, head = 6, tail = 4): string {
  if (address.length <= head + tail) return address;
  return `${address.slice(0, head)}...${address.slice(-tail)}`;
}
