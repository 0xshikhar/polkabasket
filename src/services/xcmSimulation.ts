/**
 * XCM Simulation Service
 * 
 * This service provides different XCM behaviors based on the configured mode:
 * - LOCAL mode: Real XCM functionality (for development with working XCM)
 * - TESTNET mode: Simulated XCM for demo purposes (Paseo testnet limitation)
 */

import { PARACHAINS, XCM_MODE, IS_LOCAL_XCM, IS_TESTNET_XCM } from "../config/contracts";

export interface XCMEvent {
  type: "sent" | "failed" | "deployment_dispatched" | "deployment_failed" | "deposited" | "transfer";
  paraId?: number;
  basketId?: bigint;
  messageHash?: string;
  amount?: bigint;
  reason?: string;
  user?: string;
  tokensMinted?: bigint;
}

export interface XCMSimulationConfig {
  successRate: number; // 0-1 probability of success
  delayMs: number; // Simulated delay
}

const DEFAULT_TESTNET_CONFIG: XCMSimulationConfig = {
  successRate: 0.95, // 95% success rate for demo
  delayMs: 2000, // 2 second simulated delay
};

/**
 * Generate a deterministic message hash for demo purposes
 */
function generateDemoMessageHash(paraId: number, basketId: bigint, timestamp: number): string {
  const data = `${paraId}-${basketId}-${timestamp}`;
  // Simple hash for demo - in production this would be the real XCM hash
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return "0x" + Math.abs(hash).toString(16).padStart(64, "0");
}

/**
 * Simulate XCM events for testnet demo mode
 * This creates realistic-looking XCM events even though real XCM doesn't work on Paseo
 */
export async function simulateXCMEvents(
  basketId: bigint,
  totalAmount: bigint,
  allocations: Array<{ paraId: number; weightBps: number }>,
  _userAddress: string, // User address for reference (unused but kept for API consistency)
  config: XCMSimulationConfig = DEFAULT_TESTNET_CONFIG
): Promise<XCMEvent[]> {
  const events: XCMEvent[] = [];
  const timestamp = Date.now();
  
  // Always add deposit event
  events.push({
    type: "deposited",
    basketId,
    user: _userAddress,
    amount: totalAmount,
    tokensMinted: totalAmount, // 1:1 minting
  });

  // Simulate delay for demo effect
  if (config.delayMs > 0) {
    await new Promise(resolve => setTimeout(resolve, config.delayMs / 2));
  }

  // Simulate XCM deployment events for each allocation
  for (const allocation of allocations) {
    const paraAmount = (totalAmount * BigInt(allocation.weightBps)) / 10000n;
    const isSuccess = Math.random() < config.successRate;
    
    if (isSuccess) {
      const messageHash = generateDemoMessageHash(allocation.paraId, basketId, timestamp);
      
      events.push({
        type: "sent",
        paraId: allocation.paraId,
        messageHash,
        amount: paraAmount,
      });
      
      events.push({
        type: "deployment_dispatched",
        basketId,
        paraId: allocation.paraId,
        amount: paraAmount,
      });
    } else {
      events.push({
        type: "failed",
        paraId: allocation.paraId,
        reason: "Simulated XCM failure for demo",
      });
      
      events.push({
        type: "deployment_failed",
        basketId,
        paraId: allocation.paraId,
        amount: paraAmount,
        reason: "Simulated deployment failure for demo",
      });
    }
  }

  if (config.delayMs > 0) {
    await new Promise(resolve => setTimeout(resolve, config.delayMs / 2));
  }

  return events;
}

/**
 * Simulate XCM withdrawal events for testnet demo mode
 */
export async function simulateXCMWithdrawEvents(
  basketId: bigint,
  tokenAmount: bigint,
  allocations: Array<{ paraId: number; weightBps: number }>,
  _userAddress: string, // User address for reference (unused but kept for API consistency)
  config: XCMSimulationConfig = DEFAULT_TESTNET_CONFIG
): Promise<XCMEvent[]> {
  const events: XCMEvent[] = [];
  const timestamp = Date.now();

  // Simulate delay
  if (config.delayMs > 0) {
    await new Promise(resolve => setTimeout(resolve, config.delayMs / 2));
  }

  // Simulate XCM withdrawal events for each allocation
  for (const allocation of allocations) {
    const paraAmount = (tokenAmount * BigInt(allocation.weightBps)) / 10000n;
    const isSuccess = Math.random() < config.successRate;
    
    if (isSuccess) {
      const messageHash = generateDemoMessageHash(allocation.paraId, basketId, timestamp + 1);
      
      events.push({
        type: "sent",
        paraId: allocation.paraId,
        messageHash,
        amount: paraAmount,
      });
    } else {
      events.push({
        type: "failed",
        paraId: allocation.paraId,
        reason: "Simulated XCM withdrawal failure for demo",
      });
    }
  }

  if (config.delayMs > 0) {
    await new Promise(resolve => setTimeout(resolve, config.delayMs / 2));
  }

  return events;
}

/**
 * Get XCM status label for display
 */
export function getXCMStatusLabel(): { label: string; variant: "success" | "warning" | "info" } {
  if (IS_LOCAL_XCM) {
    return { label: "Full XCM Enabled", variant: "success" };
  } else if (IS_TESTNET_XCM) {
    return { label: "Demo Mode (Simulated XCM)", variant: "warning" };
  }
  return { label: "XCM Unavailable", variant: "info" };
}

/**
 * Get chain allocation display info based on XCM mode
 */
export function getChainAllocations(
  totalAmount: string,
  allocations: Array<{ chain: string; paraId: number; pct: number }>
): Array<{ chain: string; paraId: number; amount: string; status: "active" | "simulated" | "disabled" }> {
  const amountNum = parseFloat(totalAmount) || 0;
  
  return allocations.map(a => ({
    chain: a.chain,
    paraId: a.paraId,
    amount: ((amountNum * a.pct) / 100).toFixed(2),
    status: IS_LOCAL_XCM ? "active" : IS_TESTNET_XCM ? "simulated" : "disabled",
  }));
}

export { XCM_MODE, IS_LOCAL_XCM, IS_TESTNET_XCM, PARACHAINS };
