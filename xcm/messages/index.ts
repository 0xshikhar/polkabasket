export function buildHydrationDepositXCM(
  amount: bigint,
  lpCallData: Uint8Array,
  beneficiary: string
) {
  return {
    V4: [
      {
        WithdrawAsset: [
          {
            id: { parents: 1, interior: "Here" },
            fun: { Fungible: amount },
          },
        ],
      },
      {
        BuyExecution: {
          fees: {
            id: { parents: 1, interior: "Here" },
            fun: { Fungible: amount / 100n },
          },
          weightLimit: "Unlimited",
        },
      },
      {
        Transact: {
          originKind: "SovereignAccount",
          requireWeightAtMost: {
            refTime: 5_000_000_000n,
            proofSize: 262144n,
          },
          call: {
            encoded: Array.from(lpCallData),
          },
        },
      },
      {
        RefundSurplus: null,
      },
      {
        DepositAsset: {
          assets: { Wild: { AllCounted: 1 } },
          beneficiary: {
            parents: 0,
            interior: {
              X1: { AccountId32: { id: beneficiary, network: null } },
            },
          },
        },
      },
    ],
  };
}

export function buildMoonbeamDepositXCM(
  amount: bigint,
  lendingCallData: Uint8Array,
  beneficiary: string
) {
  return buildHydrationDepositXCM(amount, lendingCallData, beneficiary);
}

export function buildHydrationWithdrawXCM(
  amount: bigint,
  withdrawCallData: Uint8Array,
  recipientOnHub: string
) {
  return {
    V4: [
      {
        WithdrawAsset: [
          {
            id: { parents: 1, interior: "Here" },
            fun: { Fungible: amount },
          },
        ],
      },
      {
        BuyExecution: {
          fees: {
            id: { parents: 1, interior: "Here" },
            fun: { Fungible: amount / 100n },
          },
          weightLimit: "Unlimited",
        },
      },
      {
        Transact: {
          originKind: "SovereignAccount",
          requireWeightAtMost: {
            refTime: 5_000_000_000n,
            proofSize: 262144n,
          },
          call: {
            encoded: Array.from(withdrawCallData),
          },
        },
      },
      {
        InitiateReserveWithdraw: {
          assets: { Wild: { AllCounted: 1 } },
          reserve: {
            parents: 1,
            interior: { X1: { Parachain: 1000 } },
          },
          xcm: [
            {
              DepositAsset: {
                assets: { Wild: "All" },
                beneficiary: {
                  parents: 0,
                  interior: {
                    X1: { AccountKey20: { key: recipientOnHub, network: null } },
                  },
                },
              },
            },
          ],
        },
      },
    ],
  };
}
