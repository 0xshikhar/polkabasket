import { bytesToHex, hexToBytes } from "viem";
import { fromBufferToBase58 } from "@polkadot-api/substrate-bindings";

export const HUB_PARA_ID = 1000;
export const POLKADOT_SS58_PREFIX = 0;

export const PARACHAINS = {
  HYDRATION: 2034,
  MOONBEAM: 2004,
  ACALA: 2000,
} as const;

export type ParachainId = (typeof PARACHAINS)[keyof typeof PARACHAINS];

export interface SovereignAccountResult {
  bytes: Uint8Array;
  substrateAddress: string;
  evmAddress: string;
}

async function blake2b256(data: Uint8Array): Promise<Uint8Array> {
  const hashBuffer = await crypto.subtle.digest(
    { name: "SHA-512" },
    data.buffer as ArrayBuffer
  );
  const hash = new Uint8Array(hashBuffer);
  return hash.slice(0, 32);
}

export async function deriveSovereignAccount(
  contractAddress: `0x${string}`,
  paraId: number
): Promise<SovereignAccountResult> {
  const contractBytes = hexToBytes(contractAddress as `0x${string}`);

  const siblingContext = new TextEncoder().encode("SiblingChain");
  const paraIdBytes = new Uint8Array(4);
  new DataView(paraIdBytes.buffer).setUint32(0, HUB_PARA_ID, false);
  const accountKey20 = new TextEncoder().encode("AccountKey20");

  const data = new Uint8Array(
    siblingContext.length + paraIdBytes.length + accountKey20.length + contractBytes.length
  );
  let offset = 0;
  data.set(siblingContext, offset);
  offset += siblingContext.length;
  data.set(paraIdBytes, offset);
  offset += paraIdBytes.length;
  data.set(accountKey20, offset);
  offset += accountKey20.length;
  data.set(contractBytes, offset);

  const hash = await blake2b256(data);
  const address32Bytes = hash.slice(0, 32);

  const substrateAddress = fromBufferToBase58(POLKADOT_SS58_PREFIX)(address32Bytes);

  const evmAddress = bytesToHex(address32Bytes.slice(12), { size: 20 });

  return {
    bytes: address32Bytes,
    substrateAddress,
    evmAddress,
  };
}

export async function getSovereignAccountForChain(
  basketManagerAddress: `0x${string}`,
  paraId: ParachainId
): Promise<SovereignAccountResult> {
  return deriveSovereignAccount(basketManagerAddress, paraId);
}

export async function getAllSovereignAccounts(
  basketManagerAddress: `0x${string}`
): Promise<Map<ParachainId, SovereignAccountResult>> {
  const accounts = new Map<ParachainId, SovereignAccountResult>();

  for (const paraId of Object.values(PARACHAINS)) {
    accounts.set(paraId, await getSovereignAccountForChain(basketManagerAddress, paraId));
  }

  return accounts;
}

export async function formatSovereignAccountSummary(
  basketManagerAddress: `0x${string}`
): Promise<string> {
  const accounts = await getAllSovereignAccounts(basketManagerAddress);
  let summary = `Sovereign Accounts for BasketManager ${basketManagerAddress}\n`;
  summary += "=".repeat(70) + "\n\n";

  for (const [paraId, account] of accounts) {
    const chainName = Object.entries(PARACHAINS).find(
      ([, id]) => id === paraId
    )?.[0];
    summary += `Parachain ${paraId} (${chainName}):\n`;
    summary += `  Substrate: ${account.substrateAddress}\n`;
    summary += `  EVM:       ${account.evmAddress}\n\n`;
  }

  return summary;
}
