import { useCallback, useEffect, useState } from "react";
import { createWalletClient, custom, type WalletClient } from "viem";
import { polkadotHubTestnet } from "../config/contracts";

type EVMProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

function getEVMProvider(): EVMProvider | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & { SubWallet?: EVMProvider & { isSubWallet?: boolean }; ethereum?: EVMProvider };
  if (w.SubWallet?.isSubWallet) return w.SubWallet;
  if (w.ethereum) return w.ethereum;
  return null;
}

export function useEVMWallet() {
  const [address, setAddress] = useState<`0x${string}` | null>(null);
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const provider = getEVMProvider();
  const isAvailable = Boolean(provider);

  const connect = useCallback(async () => {
    const p = getEVMProvider();
    if (!p) {
      setError("No EVM wallet (SubWallet or MetaMask) found");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const accounts = (await p.request({
        method: "eth_requestAccounts",
        params: [],
      })) as string[];
      if (!accounts?.length) {
        setError("No accounts returned");
        setLoading(false);
        return;
      }
      const accountAddress = accounts[0] as `0x${string}`;
      const client = createWalletClient({
        account: accountAddress,
        chain: polkadotHubTestnet,
        transport: custom(p),
      });
      setAddress(accountAddress);
      setWalletClient(client);
      setError(null);
    } catch (e) {
      const err = e as { code?: number; message?: string };
      if (err?.code === 4001) {
        setError("Connection rejected");
      } else {
        setError(err?.message ?? "Failed to connect");
      }
      setAddress(null);
      setWalletClient(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setWalletClient(null);
    setError(null);
  }, []);

  // Listen for account/chain changes when connected
  useEffect(() => {
    if (!address) return;
    const p = getEVMProvider();
    if (!p || typeof (p as EVMProvider & { on?: (e: string, cb: (payload: unknown) => void) => void }).on !== "function") return;
    const prov = p as EVMProvider & { on: (e: string, cb: (payload: unknown) => void) => void };
    const onAccounts = (accounts: unknown) => {
      const list = accounts as string[];
      if (!list?.length) disconnect();
      else if (list[0] !== address) setAddress(list[0] as `0x${string}`);
    };
    prov.on("accountsChanged", onAccounts);
  }, [address, disconnect]);

  return {
    address,
    walletClient,
    isAvailable,
    error,
    loading,
    connect,
    disconnect,
    isConnected: Boolean(address && walletClient),
  };
}
