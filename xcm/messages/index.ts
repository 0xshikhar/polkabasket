export const XCM_PRECOMPILE_ADDRESS = "0x00000000000000000000000000000000000a0000";

export const PARACHAINS = {
  HYDRATION: 2034,
  MOONBEAM: 2004,
  ACALA: 2000,
} as const;

export function encodeSiblingDestination(paraId: number): Uint8Array {
  const dest = new Uint8Array(6);
  dest[0] = 0x05;
  dest[1] = 0x01;
  dest[2] = 0x02;
  dest[3] = 0x04;
  dest[4] = (paraId >> 8) & 0xff;
  dest[5] = paraId & 0xff;
  return dest;
}

export function encodeRelayDestination(): Uint8Array {
  return new Uint8Array([0x05, 0x01, 0x00]);
}

export function encodeCompactU32(value: number): Uint8Array {
  if (value < 64) {
    return new Uint8Array([value << 2]);
  } else if (value < 16384) {
    const val = value << 2 | 1;
    return new Uint8Array([val & 0xff, (val >> 8) & 0xff]);
  } else {
    const val = value << 2 | 2;
    return new Uint8Array([
      val & 0xff,
      (val >> 8) & 0xff,
      (val >> 16) & 0xff,
      (val >> 24) & 0xff,
    ]);
  }
}

export function encodeMultiAssetFungible(
  amount: bigint,
  parents: number = 1,
  interior: "Here" | "X1" = "Here"
): Uint8Array {
  const amountBytes = encodeCompactU256(amount);
  
  if (interior === "Here") {
    const asset = new Uint8Array(4);
    asset[0] = parents;
    asset[1] = 0x00;
    
    const fungible = new Uint8Array(1 + amountBytes.length);
    fungible[0] = 0x01;
    fungible.set(amountBytes, 1);
    
    const multiasset = new Uint8Array(1 + asset.length + fungible.length);
    multiasset[0] = 0x01;
    multiasset.set(asset, 1);
    multiasset.set(fungible, 1 + asset.length);
    
    return multiasset;
  }
  
  return new Uint8Array(0);
}

function encodeCompactU256(value: bigint): Uint8Array {
  const bytes: number[] = [];
  let val = value;
  
  while (val > 0) {
    bytes.push(Number(val & 0xffn));
    val >>= 8n;
  }
  
  if (bytes.length === 0) bytes.push(0);
  
  const compact = bytes.map((b, i) => (b << 2) | (i === bytes.length - 1 ? 0 : 1));
  return new Uint8Array(compact.reverse());
}

export function buildWithdrawAsset(amount: bigint): Uint8Array {
  const inner = encodeMultiAssetFungible(amount);
  
  const instr = new Uint8Array(1 + inner.length);
  instr[0] = 0x00;
  instr.set(inner, 1);
  
  return instr;
}

export function buildBuyExecution(
  fees: bigint,
  weightLimit: "Unlimited" | bigint = "Unlimited"
): Uint8Array {
  const feeAsset = encodeMultiAssetFungible(fees);
  
  const instr = new Uint8Array(1 + feeAsset.length + 1 + 4);
  let offset = 0;
  
  instr[offset++] = 0x03;
  instr.set(feeAsset, offset);
  offset += feeAsset.length;
  
  if (weightLimit === "Unlimited") {
    instr[offset++] = 0x00;
  } else {
    instr[offset++] = 0x01;
    const weightBytes = new Uint8Array(16);
    const weightBig = BigInt(weightLimit);
    for (let i = 0; i < 16; i++) {
      weightBytes[15 - i] = Number((weightBig >> BigInt(i * 8)) & 0xffn);
    }
    instr.set(weightBytes, offset);
  }
  
  return instr.subarray(0, offset + 16);
}

export function buildDepositAsset(
  account: Uint8Array,
  isAccount32: boolean = true
): Uint8Array {
  const instr = new Uint8Array(1 + 3 + (isAccount32 ? 32 : 20));
  let offset = 0;
  
  instr[offset++] = 0x06;
  instr[offset++] = 0x03;
  instr[offset++] = 0x01;
  instr[offset++] = 0x00;
  instr.set(account.slice(0, isAccount32 ? 32 : 20), offset);
  
  return instr;
}

export function buildClearOrigin(): Uint8Array {
  return new Uint8Array([0x0a]);
}

export function encodeXCMV5(instructions: Uint8Array[]): Uint8Array {
  const totalLength = 2 + instructions.reduce((sum, i) => sum + i.length, 0);
  const message = new Uint8Array(totalLength);
  
  message[0] = 0x05;
  message[1] = encodeCompactU32(instructions.length)[0];
  
  let offset = 2;
  for (const instr of instructions) {
    message.set(instr, offset);
    offset += instr.length;
  }
  
  return message;
}

export function buildHydrationDepositXCM(
  amount: bigint,
  _lpCallData: Uint8Array,
  sovereignAccount: string
): { destination: Uint8Array; message: Uint8Array } {
  const destination = encodeSiblingDestination(PARACHAINS.HYDRATION);
  
  const accountBytes = hexToBytes(sovereignAccount.startsWith("0x") ? sovereignAccount : `0x${sovereignAccount}` as `0x${string}`);
  
  const feeAmount = amount / 100n;
  const depositAmount = amount - feeAmount;
  
  const instructions = [
    buildWithdrawAsset(amount),
    buildBuyExecution(feeAmount),
    buildDepositAsset(accountBytes),
  ];
  
  return {
    destination,
    message: encodeXCMV5(instructions),
  };
}

export function buildMoonbeamDepositXCM(
  amount: bigint,
  _lendingCallData: Uint8Array,
  sovereignAccount: string
): { destination: Uint8Array; message: Uint8Array } {
  return buildHydrationDepositXCM(amount, _lendingCallData, sovereignAccount);
}

export function buildAcalaDepositXCM(
  amount: bigint,
  _stakingCallData: Uint8Array,
  sovereignAccount: string
): { destination: Uint8Array; message: Uint8Array } {
  return buildHydrationDepositXCM(amount, _stakingCallData, sovereignAccount);
}

export function buildHydrationWithdrawXCM(
  amount: bigint,
  _withdrawCallData: Uint8Array,
  recipientOnHub: string
): { destination: Uint8Array; message: Uint8Array } {
  const destination = encodeSiblingDestination(PARACHAINS.HYDRATION);
  
  const recipientBytes = hexToBytes(recipientOnHub.startsWith("0x") ? recipientOnHub : `0x${recipientOnHub}` as `0x${string}`);
  
  const instructions = [
    buildWithdrawAsset(amount),
    buildBuyExecution(amount / 100n),
    buildClearOrigin(),
    buildDepositAsset(recipientBytes),
  ];
  
  return {
    destination,
    message: encodeXCMV5(instructions),
  };
}

export function buildSimpleTransferXCM(
  amount: bigint,
  recipient: string,
  isEVMRecipient: boolean = true
): { destination: Uint8Array; message: Uint8Array } {
  const destination = encodeRelayDestination();
  
  const recipientBytes = hexToBytes(recipient.startsWith("0x") ? recipient : `0x${recipient}` as `0x${string}`);
  
  const instructions = [
    buildWithdrawAsset(amount),
    buildDepositAsset(recipientBytes, !isEVMRecipient),
  ];
  
  return {
    destination,
    message: encodeXCMV5(instructions),
  };
}

export function getXCMMessageForChain(
  chainType: "hydradx" | "moonbeam" | "acala",
  action: "deposit" | "withdraw",
  amount: bigint,
  callData: Uint8Array,
  sovereignAccount: string,
  recipient?: string
): { destination: Uint8Array; message: Uint8Array } {
  switch (action) {
    case "deposit":
      switch (chainType) {
        case "hydradx":
          return buildHydrationDepositXCM(amount, callData, sovereignAccount);
        case "moonbeam":
          return buildMoonbeamDepositXCM(amount, callData, sovereignAccount);
        case "acala":
          return buildAcalaDepositXCM(amount, callData, sovereignAccount);
      }
      break;
    case "withdraw":
      if (!recipient) throw new Error("Recipient required for withdraw");
      switch (chainType) {
        case "hydradx":
          return buildHydrationWithdrawXCM(amount, callData, recipient);
        case "moonbeam":
          return buildHydrationWithdrawXCM(amount, callData, recipient);
        case "acala":
          return buildHydrationWithdrawXCM(amount, callData, recipient);
      }
      break;
  }
  throw new Error(`Unknown chain type: ${chainType} or action: ${action}`);
}

function hexToBytes(hex: `0x${string}` | string): Uint8Array {
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }
  return bytes;
}

export function xcmMessageToHex(message: Uint8Array): `0x${string}` {
  return `0x${Array.from(message).map(b => b.toString(16).padStart(2, '0')).join('')}` as `0x${string}`;
}
