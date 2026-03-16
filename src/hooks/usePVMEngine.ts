import { useReadContract } from 'wagmi';
import { PVM_ENGINE_ABI, USE_MOCK_PVM } from '@/config/contracts';
import { encodeAbiParameters, parseAbiParameters } from 'viem';

export function usePVMEngine() {
  // Read optimized allocation
  const { isLoading: isOptimizing } = useReadContract({
    address: undefined,
    abi: PVM_ENGINE_ABI,
    functionName: 'optimizeAllocation',
    args: ['0x'],
    query: {
      enabled: false,
    },
  });

  // Read rebalance result
  const { isLoading: isRebalancing } = useReadContract({
    address: undefined,
    abi: PVM_ENGINE_ABI,
    functionName: 'rebalanceBasket',
    args: ['0x'],
    query: {
      enabled: false,
    },
  });

  // Encode input for PVM
  const encodeRebalanceInput = (
    weights: readonly number[],
    totalDeposited: bigint,
    paraIds: readonly number[]
  ): `0x${string}` => {
    return encodeAbiParameters(
      parseAbiParameters('uint16[] weights, uint256 totalDeposited, uint32[] paraIds'),
      [weights as number[], totalDeposited, paraIds as number[]]
    );
  };

  const encodeOptimizeInput = (
    weights: readonly number[],
    paraIds: readonly number[]
  ): `0x${string}` => {
    return encodeAbiParameters(
      parseAbiParameters('uint16[] weights, uint32[] paraIds'),
      [weights as number[], paraIds as number[]]
    );
  };

  // Optimize allocation using PVM
  const optimizeAllocation = async (
    weights: readonly number[],
    paraIds: readonly number[]
  ): Promise<number[]> => {
    if (USE_MOCK_PVM) {
      // Mock implementation - return equal weights
      const equalWeight = Math.floor(10000 / weights.length);
      const result = Array(weights.length).fill(equalWeight);
      
      // Adjust last weight to ensure sum is 10000
      const sum = result.reduce((a, b) => a + b, 0);
      result[result.length - 1] += 10000 - sum;
      
      return result;
    }

    // Real PVM call
    const input = encodeOptimizeInput(weights, paraIds);
    console.log('PVM input:', input);
    return weights as number[];
  };

  // Rebalance basket using PVM
  const rebalanceBasket = async (
    weights: readonly number[],
    totalDeposited: bigint,
    paraIds: readonly number[]
  ): Promise<number[]> => {
    if (USE_MOCK_PVM) {
      // Mock implementation - simulate optimization
      const optimized = await optimizeAllocation(weights, paraIds);
      
      // Apply threshold - only change if difference > 200 bps
      const threshold = 200;
      return weights.map((w, i) => {
        const diff = Math.abs(w - optimized[i]);
        return diff > threshold ? optimized[i] : w;
      });
    }

    // Real PVM call
    const input = encodeRebalanceInput(weights, totalDeposited, paraIds);
    console.log('PVM rebalance input:', input);
    return weights as number[];
  };

  // Get yields from PVM
  const getPoolYields = async (paraIds: readonly number[]): Promise<number[]> => {
    if (USE_MOCK_PVM) {
      // Mock yields
      const mockYields: Record<number, number> = {
        2034: 1200, // Hydration: 12%
        2004: 800,  // Moonbeam: 8%
        2000: 1000, // Acala: 10%
      };
      return paraIds.map(id => mockYields[id] || 600);
    }

    // Real PVM call
    return paraIds.map(() => 0);
  };

  // Get volatility from PVM
  const getVolatility = async (paraIds: readonly number[]): Promise<number[]> => {
    if (USE_MOCK_PVM) {
      // Mock volatility
      const mockVol: Record<number, number> = {
        2034: 500,  // Hydration: 5%
        2004: 800,  // Moonbeam: 8%
        2000: 1000, // Acala: 10%
      };
      return paraIds.map(id => mockVol[id] || 1200);
    }

    // Real PVM call
    return paraIds.map(() => 0);
  };

  return {
    optimizeAllocation,
    rebalanceBasket,
    getPoolYields,
    getVolatility,
    isOptimizing,
    isRebalancing,
    isMock: USE_MOCK_PVM,
  };
}
