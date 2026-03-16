export interface XCMMessage {
  id: string;
  fromChain: string;
  toChain: string;
  paraId?: number;
  amount: string;
  status: "pending" | "confirmed" | "failed";
  txHash?: string;
  explorerUrl?: string;
}

export interface XCMStatusProps {
  messages: XCMMessage[];
  onClear?: () => void;
}

export function XCMStatus({ messages, onClear }: XCMStatusProps) {
  const statusIcon = (s: string) => {
    switch (s) {
      case "confirmed":
        return "✓";
      case "failed":
        return "✗";
      default:
        return "⏳";
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "confirmed":
        return "text-green-400";
      case "failed":
        return "text-red-400";
      default:
        return "text-yellow-400";
    }
  };

  const getExplorerUrl = (msg: XCMMessage) => {
    if (msg.explorerUrl) return msg.explorerUrl;
    if (msg.paraId) {
      const explorers: Record<number, string> = {
        1000: "https://assethub-westend.subscan.io",
        2034: "https://hydration.subscan.io",
        2004: "https://moonbase.subscan.io",
        2000: "https://acala.subscan.io",
      };
      return explorers[msg.paraId];
    }
    return "https://assethub-westend.subscan.io";
  };

  const pendingCount = messages.filter(m => m.status === "pending").length;
  const confirmedCount = messages.filter(m => m.status === "confirmed").length;
  const failedCount = messages.filter(m => m.status === "failed").length;

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">XCM Message Status</h3>
        {messages.length > 0 && onClear && (
          <button
            onClick={onClear}
            className="text-xs text-gray-500 hover:text-gray-300"
          >
            Clear All
          </button>
        )}
      </div>

      {messages.length > 0 && (
        <div className="flex gap-4 mb-4 text-xs">
          <span className="text-yellow-400">⏳ {pendingCount} pending</span>
          <span className="text-green-400">✓ {confirmedCount} confirmed</span>
          <span className="text-red-400">✗ {failedCount} failed</span>
        </div>
      )}

      {messages.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-gray-400 mb-2">No XCM messages</p>
          <p className="text-gray-600 text-sm">
            Deposit or withdraw to see cross-chain status
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {messages.map((msg) => (
            <div key={msg.id} className="flex items-center justify-between bg-gray-700 rounded p-3">
              <div className="flex items-center space-x-3">
                <span className={`text-lg ${statusColor(msg.status)}`}>{statusIcon(msg.status)}</span>
                <div>
                  <p className="text-white text-sm">
                    {msg.fromChain} → {msg.toChain}
                  </p>
                  <p className="text-gray-400 text-xs">
                    {msg.amount} DOT
                    {msg.paraId && ` • Para ${msg.paraId}`}
                  </p>
                </div>
              </div>
              {msg.txHash && (
                <a
                  href={getExplorerUrl(msg)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  View ↗
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
