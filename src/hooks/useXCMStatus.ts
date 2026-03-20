import { useState, useCallback, useEffect } from "react";
import { APP_EXPLORER_URL } from "../config/contracts";

export type XCMMessageStatus = "pending" | "confirmed" | "failed";

export interface XCMMessage {
  id: string;
  fromChain: string;
  toChain: string;
  paraId: number;
  amount: string;
  status: XCMMessageStatus;
  txHash?: string;
  explorerUrl?: string;
  timestamp: number;
}

interface XCMStatusState {
  messages: XCMMessage[];
  isPolling: boolean;
}

export function useXCMStatus() {
  const [state, setState] = useState<XCMStatusState>({
    messages: [],
    isPolling: false,
  });

  const addMessage = useCallback((message: Omit<XCMMessage, "id" | "timestamp" | "status">) => {
    const newMessage: XCMMessage = {
      ...message,
      id: `xcm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      status: "pending",
    };
    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, newMessage],
    }));
    return newMessage.id;
  }, []);

  const updateMessageStatus = useCallback((
    id: string,
    status: XCMMessageStatus,
    txHash?: string
  ) => {
    setState((prev) => ({
      ...prev,
      messages: prev.messages.map((msg) =>
        msg.id === id ? { ...msg, status, txHash: txHash || msg.txHash } : msg
      ),
    }));
  }, []);

  const removeMessage = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      messages: prev.messages.filter((msg) => msg.id !== id),
    }));
  }, []);

  const clearMessages = useCallback(() => {
    setState((prev) => ({
      ...prev,
      messages: [],
    }));
  }, []);

  const getMessagesByStatus = useCallback((status: XCMMessageStatus) => {
    return state.messages.filter((msg) => msg.status === status);
  }, [state.messages]);

  const getPendingMessages = useCallback(() => getMessagesByStatus("pending"), [getMessagesByStatus]);
  const getConfirmedMessages = useCallback(() => getMessagesByStatus("confirmed"), [getMessagesByStatus]);
  const getFailedMessages = useCallback(() => getMessagesByStatus("failed"), [getMessagesByStatus]);

  return {
    messages: state.messages,
    isPolling: state.isPolling,
    pendingCount: state.messages.filter((m) => m.status === "pending").length,
    confirmedCount: state.messages.filter((m) => m.status === "confirmed").length,
    failedCount: state.messages.filter((m) => m.status === "failed").length,
    addMessage,
    updateMessageStatus,
    removeMessage,
    clearMessages,
    getPendingMessages,
    getConfirmedMessages,
    getFailedMessages,
  };
}

export function useXCMExplorer(paraId: number): string | null {
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null);

  useEffect(() => {
    const urls: Record<number, string> = {
      1000: APP_EXPLORER_URL,
      2034: "https://hydration.subscan.io",
      2004: "https://moonbase.subscan.io",
      2000: "https://acala.subscan.io",
    };
    setExplorerUrl(urls[paraId] || null);
  }, [paraId]);

  return explorerUrl;
}
