import { useCallback, useEffect, useState, useRef } from "react";
import { createWalletClient, custom, type WalletClient, getAddress } from "viem";
import { APP_CHAIN } from "../config/contracts";

const TARGET_CHAIN_ID = APP_CHAIN.id;

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

async function getCurrentChainId(provider: EVMProvider): Promise<number | null> {
  try {
    const chainId = await provider.request({ method: "eth_chainId" });
    return parseInt(chainId as string, 16);
  } catch {
    return null;
  }
}

export function useEVMWallet() {
  const [address, setAddress] = useState<`0x${string}` | null>(null);
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const providerRef = useRef<EVMProvider | null>(null);

  const provider = getEVMProvider();
  providerRef.current = provider;
  const isAvailable = Boolean(provider);

  const isCorrectChain = chainId === TARGET_CHAIN_ID;
  const needsSwitchChain = address && chainId && chainId !== TARGET_CHAIN_ID;

  const switchChain = useCallback(async (targetChainId?: number) => {
    const p = providerRef.current || getEVMProvider();
    if (!p) {
      setError("No wallet connected");
      return;
    }
    const target = targetChainId || TARGET_CHAIN_ID;
    try {
      await p.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${target.toString(16)}` }],
      });
    } catch (err) {
      const e = err as { code?: number; message?: string };
      if (e?.code === 4902) {
        try {
          await p.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${APP_CHAIN.id.toString(16)}`,
                chainName: APP_CHAIN.name,
                nativeCurrency: APP_CHAIN.nativeCurrency,
                rpcUrls: APP_CHAIN.rpcUrls.default.http,
                blockExplorerUrls: APP_CHAIN.blockExplorers?.default?.url ? [APP_CHAIN.blockExplorers.default.url] : undefined,
              },
            ],
          });
          await p.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${APP_CHAIN.id.toString(16)}` }],
          });
        } catch (addErr) {
          const addE = addErr as { message?: string };
          setError(addE?.message || `Chain ${target} not added to wallet. Please add it manually.`);
          throw addErr;
        }
      } else {
        setError(e?.message || "Failed to switch chain");
        throw err;
      }
    }
  }, []);

  const connect = useCallback(async () => {
    const p = getEVMProvider();
    if (!p) {
      setError("No EVM wallet found. Please install MetaMask or SubWallet.");
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
      const accountAddress = getAddress(accounts[0]);
      const currentChainId = await getCurrentChainId(p);
      
      const client = createWalletClient({
        account: accountAddress,
        chain: APP_CHAIN,
        transport: custom(p),
      });
      
      setAddress(accountAddress);
      setWalletClient(client);
      setChainId(currentChainId);
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
      setChainId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setWalletClient(null);
    setChainId(null);
    setError(null);
  }, []);

  useEffect(() => {
    if (!address || !providerRef.current) return;
    const p = providerRef.current;
    if (typeof (p as EVMProvider & { on?: unknown }).on !== "function") return;
    const prov = p as EVMProvider & {
      on: (e: string, cb: (payload: unknown) => void) => void;
      removeListener?: (e: string, cb: (payload: unknown) => void) => void;
    };

    const onAccounts = (accounts: unknown) => {
      const list = accounts as string[];
      if (!list?.length) {
        disconnect();
      } else if (list[0] !== address) {
        setAddress(getAddress(list[0]));
      }
    };

    const onChainChanged = (newChainId: unknown) => {
      setChainId(parseInt(newChainId as string, 16));
    };

    prov.on("accountsChanged", onAccounts);
    prov.on("chainChanged", onChainChanged);

    return () => {
      if (typeof prov.removeListener === "function") {
        prov.removeListener("accountsChanged", onAccounts);
        prov.removeListener("chainChanged", onChainChanged);
      }
    };
  }, [address, disconnect]);

  return {
    address,
    walletClient,
    chainId,
    isAvailable,
    isConnected: Boolean(address && walletClient),
    isCorrectChain,
    needsSwitchChain,
    error,
    loading,
    connect,
    disconnect,
    switchChain,
    targetChainId: TARGET_CHAIN_ID,
  };
}
