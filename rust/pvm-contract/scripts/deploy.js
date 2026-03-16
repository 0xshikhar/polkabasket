import { ApiPromise, WsProvider } from "@polkadot/api";
import { readFileSync } from "fs";

const RPC_URL = process.env.RPC_URL || "wss://westend-asset-hub-rpc.polkadot.io";
const PRIVATE_KEY = process.env.PRIVATE_KEY;

async function main() {
  if (!PRIVATE_KEY) {
    console.error("Error: PRIVATE_KEY environment variable not set");
    console.log("Usage: PRIVATE_KEY=0x... node scripts/deploy.js");
    process.exit(1);
  }

  const key = PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : "0x" + PRIVATE_KEY;
  
  console.log("Connecting to:", RPC_URL);
  const provider = new WsProvider(RPC_URL);
  const api = await ApiPromise.create({ 
    provider,
    noInitWarn: true 
  });

  // Create signer using ethereum chain spec
  const { Signature } = await import("@polkadot/types");
  const { wrapSignature } = await import("@polkadot/api/signer");
  
  // Use polkadot keyring for ECDSA
  const { Keyring } = await import("@polkadot/keyring");
  const keyring = new Keyring({ type: "ethereum", ss58Format: 42 });
  const deployer = keyring.addFromUri(key);
  console.log("Deployer address:", deployer.address);

  const contractBlob = readFileSync("./contract.polkavm");
  console.log("Contract size:", contractBlob.length, "bytes");

  // First, let's try to upload code (simpler operation)
  console.log("\n1. Uploading code to chain...");
  
  const uploadTx = api.tx.revive.uploadCode(
    { storageDepositLimit: null },
    contractBlob
  );

  try {
    const result = await new Promise((resolve, reject) => {
      let extrinsicFailed = false;
      let codeHash = null;
      
      const unsubscribe = uploadTx.signAndSend(deployer, ({ events, status }) => {
        console.log("  Status:", status.type);
        
        if (status.isInBlock || status.isFinalized) {
          for (const { event } of events) {
            console.log("  Event:", event.section + "." + event.method);
            if (event.section === "revive" && event.method === "CodeStored") {
              codeHash = event.data[0].toString();
              console.log("  ✓ Code hash:", codeHash);
            }
            if (event.section === "system" && event.method === "ExtrinsicFailed") {
              extrinsicFailed = true;
              console.log("  ✗ Failed:", event.data.toString());
            }
          }
          unsubscribe();
          resolve(codeHash);
        }
      });

      // Timeout after 2 minutes
      setTimeout(() => {
        unsubscribe();
        reject(new Error("Transaction timeout"));
      }, 120000);
    });

    console.log("\nUpload result:", result);
    
  } catch (error) {
    console.error("Upload error:", error.message);
  }

  await api.disconnect();
  console.log("\nDone!");
}

main().catch(console.error);
