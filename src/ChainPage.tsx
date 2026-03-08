import { useChainId } from "@reactive-dot/react";

export function ChainPage() {
  const chainId = useChainId();

  return (
    <>
      <h1>Your app is ready</h1>
      <p className="m-2">
        Connected to chain <strong>{chainId}</strong>
      </p>
    </>
  );
}
