import { ApiPromise, WsProvider } from "@polkadot/api";
import { readFileSync, writeFileSync } from "fs";

const RPC_URL = process.env.RPC_URL || "wss://westend-asset-hub-rpc.polkadot.io";
const PRIVATE_KEY = process.env.PRIVATE_KEY;

async function main() {
  if (!PRIVATE_KEY) {
    console.error("Error: PRIVATE_KEY environment variable not set");
    console.log("Usage: PRIVATE_KEY=0x... node scripts/deploy.js");
    process.exit(1);
  }

  const key = PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : "0x" + PRIVATE_KEY;
  
  console.log("=".repeat(50));
  console.log("TeleBasket PVM Engine Deployment");
  console.log("=".repeat(50));
  console.log("\nConnecting to:", RPC_URL);
  
  const provider = new WsProvider(RPC_URL);
  const api = await ApiPromise.create({ 
    provider,
    noInitWarn: true 
  });

  await api.isReady;
  console.log("Connected! Chain:", (await api.rpc.system.chain()).toString());

  const { Keyring } = await import("@polkadot/keyring");
  const keyring = new Keyring({ type: "ethereum", ss58Format: 42 });
  const deployer = keyring.addFromUri(key);
  console.log("Deployer address:", deployer.address);

  const contractBlob = readFileSync("./contract.polkavm");
  console.log("\nContract size:", contractBlob.length, "bytes");

  console.log("\n1. Uploading PVM code to chain...");
  console.log("   (This uploads the Rust bytecode via revive pallet)");
  
  const uploadTx = api.tx.revive.uploadCode(
    { storageDepositLimit: null },
    contractBlob
  );

  let codeHash = null;
  let uploadSuccess = false;

  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        unsubscribe();
        reject(new Error("Transaction timeout (2 min)"));
      }, 120000);
      
      let unsubscribe = uploadTx.signAndSend(deployer, ({ events, status }) => {
        console.log("   Status:", status.type);
        
        if (status.isInBlock || status.isFinalized) {
          for (const { event } of events) {
            const section = event.section;
            const method = event.method;
            
            if (section === "revive" && method === "CodeStored") {
              codeHash = event.data[0].toString();
              console.log("   ✓ Code stored! Hash:", codeHash);
              uploadSuccess = true;
            }
            if (section === "system" && method === "ExtrinsicFailed") {
              const err = event.data.toString();
              console.log("   ✗ Extrinsic failed:", err);
              uploadSuccess = false;
            }
          }
          clearTimeout(timeout);
          unsubscribe();
          resolve();
        }
      });
    });

    if (uploadSuccess && codeHash) {
      console.log("\n2. Instantiating contract...");
      
      const instantiateTx = api.tx.revive.instantiate(
        0,
        { storageDepositLimit: null, codeHash: codeHash },
        0n,
        null,
        []
      );

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          unsubscribe();
          reject(new Error("Instantiate timeout"));
        }, 120000);
        
        let unsubscribe = instantiateTx.signAndSend(deployer, ({ events, status }) => {
          console.log("   Status:", status.type);
          
          if (status.isInBlock || status.isFinalized) {
            for (const { event } of events) {
              const section = event.section;
              const method = event.method;
              
              if (section === "contracts" && method === "Instantiated") {
                const contractAddress = event.data[1].toString();
                console.log("   ✓ Contract instantiated!");
                console.log("   Address:", contractAddress);
                
                writeFileSync("./deployed_address.json", JSON.stringify({
                  address: contractAddress,
                  codeHash: codeHash,
                  network: RPC_URL.includes("westend") ? "westend" : "paseo",
                  timestamp: new Date().toISOString()
                }, null, 2));
              }
            }
            clearTimeout(timeout);
            unsubscribe();
            resolve();
          }
        });
      });

      console.log("\n" + "=".repeat(50));
      console.log("DEPLOYMENT SUCCESSFUL!");
      console.log("=".repeat(50));
      console.log("\nPVM Engine Address:", codeHash);
      console.log("(Use this as PVM_ENGINE_CODE_HASH in config)");
      console.log("\nConfiguration:");
      console.log("  VITE_USE_MOCK_PVM=false");
      console.log("  VITE_PVM_CODE_HASH=" + codeHash);
      console.log("\nSaved to: deployed_address.json");
    } else {
      console.log("\n✗ Upload failed - check if network supports PVM contracts");
    }
    
  } catch (error) {
    console.error("\n✗ Deployment error:", error.message);
    console.log("\nNote: Westend Asset Hub may not yet support PVM contracts.");
    console.log("Check: https://status.polkadot.io/");
  }

  await api.disconnect();
  console.log("\nDisconnected. Done!");
}

main().catch(console.error);
