interface XCMMessage {
  id: string;
  fromChain: string;
  toChain: string;
  amount: string;
  status: "pending" | "confirmed" | "failed";
  txHash?: string;
  explorerUrl?: string;
}

interface XCMStatusProps {
  messages: XCMMessage[];
}

export function XCMStatus({ messages }: XCMStatusProps) {
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

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-xl font-bold mb-4 text-white">XCM Message Status</h3>
      {messages.length === 0 ? (
        <p className="text-gray-400">No XCM messages</p>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <div key={msg.id} className="flex items-center justify-between bg-gray-700 rounded p-3">
              <div className="flex items-center space-x-3">
                <span className={`text-lg ${statusColor(msg.status)}`}>{statusIcon(msg.status)}</span>
                <div>
                  <p className="text-white text-sm">
                    {msg.fromChain} → {msg.toChain}
                  </p>
                  <p className="text-gray-400 text-xs">{msg.amount} DOT</p>
                </div>
              </div>
              {msg.explorerUrl && (
                <a
                  href={msg.explorerUrl}
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
