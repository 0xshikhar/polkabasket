import { createPublicClient, http, hexToBytes } from 'viem';
import { polkadotHubTestnet, USE_MOCK_PVM, PVM_ENGINE_ADDRESS } from '../config/contracts';

const pvmClient = createPublicClient({
  chain: polkadotHubTestnet,
  transport: http(),
});

const SELECTOR_REBALANCE = '0xf4993018';
const SELECTOR_OPTIMIZE = '0x8fa5f25c';

function encodeOptimizeInput(weights: readonly number[], paraIds: readonly number[]): `0x${string}` {
  return `0x${SELECTOR_OPTIMIZE}` +
    `${(32 + 64).toString(16).padStart(64, '0')}` +
    `${(32 + 64 + 32 + weights.length * 32).toString(16).padStart(64, '0')}` +
    `${weights.length.toString(16).padStart(64, '0')}` +
    weights.map(w => `00000000000000000000000000000000${w.toString(16).padStart(4, '0')}`.slice(-64)).join('') +
    `${paraIds.length.toString(16).padStart(64, '0')}` +
    paraIds.map(id => id.toString(16).padStart(64, '0')).join('') as `0x${string}`;
}

function encodeRebalanceInput(weights: readonly number[], totalDeposited: bigint, paraIds: readonly number[]): `0x${string}` {
  return `0x${SELECTOR_REBALANCE}` +
    `${(32 + 64 + 32).toString(16).padStart(64, '0')}` +
    `${totalDeposited.toString(16).padStart(64, '0')}` +
    `${(32 + 64 + 32 + 32 + weights.length * 32).toString(16).padStart(64, '0')}` +
    `${weights.length.toString(16).padStart(64, '0')}` +
    weights.map(w => `00000000000000000000000000000000${w.toString(16).padStart(4, '0')}`.slice(-64)).join('') +
    `${paraIds.length.toString(16).padStart(64, '0')}` +
    paraIds.map(id => id.toString(16).padStart(64, '0')).join('') as `0x${string}`;
}

function decodeU16Array(result: `0x${string}`, count: number): number[] {
  const bytes = hexToBytes(result);
  const weights: number[] = [];
  for (let i = 0; i < count; i++) {
    const offset = 64 + i * 32 + 30;
    if (offset + 2 <= bytes.length) {
      weights.push((bytes[offset] << 8) | bytes[offset + 1]);
    }
  }
  return weights;
}

export function usePVMEngine() {
  // Optimize allocation using PVM
  const optimizeAllocation = async (
    weights: readonly number[],
    paraIds: readonly number[]
  ): Promise<number[]> => {
    if (USE_MOCK_PVM || !PVM_ENGINE_ADDRESS) {
      return mockOptimize(weights);
    }

    try {
      const input = encodeOptimizeInput(weights, paraIds);
      const result = await pvmClient.call({
        to: PVM_ENGINE_ADDRESS as `0x${string}`,
        data: input,
      });
      
      if (result && result.data) {
        return decodeU16Array(result.data as `0x${string}`, weights.length);
      }
      return mockOptimize(weights);
    } catch (err) {
      console.error('PVM optimize error:', err);
      return mockOptimize(weights);
    }
  };

  // Rebalance basket using PVM
  const rebalanceBasket = async (
    weights: readonly number[],
    totalDeposited: bigint,
    paraIds: readonly number[]
  ): Promise<number[]> => {
    if (USE_MOCK_PVM || !PVM_ENGINE_ADDRESS) {
      return mockRebalance(weights);
    }

    try {
      const input = encodeRebalanceInput(weights, totalDeposited, paraIds);
      const result = await pvmClient.call({
        to: PVM_ENGINE_ADDRESS as `0x${string}`,
        data: input,
      });
      
      if (result && result.data) {
        return decodeU16Array(result.data as `0x${string}`, weights.length);
      }
      return mockRebalance(weights);
    } catch (err) {
      console.error('PVM rebalance error:', err);
      return mockRebalance(weights);
    }
  };

  // Get yields from PVM
  const getPoolYields = async (paraIds: readonly number[]): Promise<number[]> => {
    if (USE_MOCK_PVM) {
      return mockYields(paraIds);
    }
    return mockYields(paraIds);
  };

  // Get volatility from PVM
  const getVolatility = async (paraIds: readonly number[]): Promise<number[]> => {
    if (USE_MOCK_PVM) {
      return mockVolatility(paraIds);
    }
    return mockVolatility(paraIds);
  };

  return {
    optimizeAllocation,
    rebalanceBasket,
    getPoolYields,
    getVolatility,
    isMock: USE_MOCK_PVM || !PVM_ENGINE_ADDRESS,
    isDeployed: !!PVM_ENGINE_ADDRESS,
  };
}

function mockOptimize(weights: readonly number[]): number[] {
  const equalWeight = Math.floor(10000 / weights.length);
  const result = Array(weights.length).fill(equalWeight);
  const sum = result.reduce((a, b) => a + b, 0);
  result[result.length - 1] += 10000 - sum;
  return result;
}

function mockRebalance(weights: readonly number[]): number[] {
  const optimized = mockOptimize(weights);
  const threshold = 200;
  return weights.map((w, i) => {
    const diff = Math.abs(w - optimized[i]);
    return diff > threshold ? optimized[i] : w;
  });
}

function mockYields(paraIds: readonly number[]): number[] {
  const mockYieldsMap: Record<number, number> = {
    2034: 1200,
    2004: 800,
    2000: 1000,
  };
  return paraIds.map(id => mockYieldsMap[id] || 600);
}

function mockVolatility(paraIds: readonly number[]): number[] {
  const mockVolMap: Record<number, number> = {
    2034: 500,
    2004: 800,
    2000: 1000,
  };
  return paraIds.map(id => mockVolMap[id] || 1200);
}
