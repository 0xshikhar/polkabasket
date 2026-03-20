export interface CustomBasket {
  id: string;
  name: string;
  symbol: string;
  allocations: Array<{ paraId: number; protocol: string; weightBps: number }>;
  createdAt: number;
  creator: string;
  status: "draft" | "pending" | "deployed";
  txHash?: string;
}

export interface CustomBasketPreview {
  id: string;
  name: string;
  symbol: string;
  totalDeposited: bigint;
  active: boolean;
  allocations: Array<{ chain: string; weight: number; paraId: number }>;
  creator: string;
  status: "draft" | "pending" | "deployed";
  isCustom?: boolean;
}

const STORAGE_KEY = "polkabasket_custom_baskets";

const PROTOCOL_CHAIN_MAP: Record<string, number> = {
  "Hydration LP": 2034,
  "Hydration Stable": 2034,
  "Moonbeam Lending": 2004,
  "Moonbeam Liquid Staking": 2004,
  "Moonbeam Leverage": 2004,
  "Acala Staking": 2000,
  "Acala Leverage": 2000,
};

export function getCustomBaskets(): CustomBasket[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function saveCustomBasket(basket: CustomBasket): boolean {
  try {
    const existing = getCustomBaskets();
    const filtered = existing.filter(b => b.id !== basket.id);
    const updated = [basket, ...filtered];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return true;
  } catch {
    return false;
  }
}

export function deleteCustomBasket(id: string): boolean {
  try {
    const existing = getCustomBaskets();
    const updated = existing.filter(b => b.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return true;
  } catch {
    return false;
  }
}

export function updateCustomBasketStatus(id: string, status: CustomBasket["status"], txHash?: string): boolean {
  try {
    const existing = getCustomBaskets();
    const updated = existing.map(b =>
      b.id === id ? { ...b, status, ...(txHash ? { txHash } : {}) } : b
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return true;
  } catch {
    return false;
  }
}

export function customBasketToPreview(basket: CustomBasket): CustomBasketPreview {
  return {
    id: basket.id,
    name: basket.name,
    symbol: basket.symbol,
    totalDeposited: 0n,
    active: basket.status === "deployed",
    allocations: basket.allocations.map(a => ({
      chain: a.protocol,
      weight: a.weightBps / 100,
      paraId: a.paraId,
    })),
    creator: basket.creator,
    status: basket.status,
    isCustom: true,
  };
}
