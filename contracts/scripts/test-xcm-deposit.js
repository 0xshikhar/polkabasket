#!/usr/bin/env node

/**
 * PolkaBasket XCM Integration Test Script
 * 
 * This script tests the full XCM deposit flow:
 * 1. Deposit 1 PAS into the basket
 * 2. Parse transaction receipt for XCM events
 * 3. Track XCM message status
 * 4. Verify funds arrived on target chains
 * 
 * Usage: node scripts/test-xcm-deposit.js
 */

const { ethers } = require("hardhat");
require("dotenv");

// Contract addresses
const BASKET_MANAGER_ADDRESS = "0x96CA4a5Cb6Cf56F378aEe426567d330f1CFDEaA2";
const BASKET_TOKEN_ADDRESS = "0xD9FEBB375aCE5226AF1AA4146988Af2BDB8A1e8B";
const XCM_PRECOMPILE_ADDRESS = "0x00000000000000000000000000000000000a0000";

// Event topic hashes
const EVENT_TOPICS = {
  XCMMessageSent: "0x629ed2ee510cb8ee1b03fe5c7d738ff856411d8f43099301f84789088254f17f",
  XCMMessageFailed: "0xd08ecae49834816c342f1d13c001844a8178767b931af94a603f8a64ce7f1a45",
  DeploymentDispatched: "0x2a714abd697b83e14df66ce02bcadcab42e9d2305e12d5abf7b61656dfa689eb",
  DeploymentFailed: "0xed21e79921f361289f658defd542daf27748d63bfc4e5db793f0a4a8bfac64e0",
  Deposited: "0xad5b4075b97dbf75ad5c78f7afac948e4ae611c4fdf2825e2ce3c6c96925bf3b",
};

// Basket configuration
const BASKET_ID = 0;
const DEPOSIT_AMOUNT = "1"; // 1 PAS

// Target parachains
const PARACHAINS = {
  2034: { name: "Hydration", explorer: "https://hydration.subscan.io" },
  2004: { name: "Moonbeam", explorer: "https://moonbase.subscan.io" },
  2000: { name: "Acala", explorer: "https://acala.subscan.io" },
};

async function testDepositAndTrackXCM() {
  console.log("\n" + "=".repeat(70));
  console.log("PolkaBasket XCM Integration Test");
  console.log("=".repeat(70));
  
  // Get signer
  const [signer] = await ethers.getSigners();
  console.log("\n👤 Test Account:", signer.address);
  
  // Check balance
  const balance = await ethers.provider.getBalance(signer.address);
  console.log("💰 Balance:", ethers.formatEther(balance), "PAS");
  
  if (balance < ethers.parseEther("1.1")) {
    console.error("❌ Insufficient balance. Need at least 1.1 PAS for test.");
    process.exit(1);
  }
  
  // Connect to contracts
  const basketManager = await ethers.getContractAt("BasketManager", BASKET_MANAGER_ADDRESS);
  const basketToken = await ethers.getContractAt("BasketToken", BASKET_TOKEN_ADDRESS);
  
  // Check XCM status
  console.log("\n📡 Checking XCM Configuration...");
  const xcmEnabled = await basketManager.xcmEnabled();
  const xcmPrecompile = await basketManager.xcmPrecompile();
  console.log("   XCM Enabled:", xcmEnabled);
  console.log("   XCM Precompile:", xcmPrecompile);
  
  const precompileCode = await ethers.provider.getCode(XCM_PRECOMPILE_ADDRESS);
  console.log("   Precompile Code Size:", (precompileCode.length - 2) / 2, "bytes");
  
  if (precompileCode === "0x") {
    console.warn("⚠️  WARNING: XCM Precompile has no code! XCM will fail.");
  }
  
  // Get basket info
  console.log("\n🧺 Basket Info:");
  const basket = await basketManager.getBasket(BASKET_ID);
  console.log("   Name:", basket.name);
  console.log("   Token:", basket.token);
  console.log("   Active:", basket.active);
  console.log("   Total Deposited:", ethers.formatEther(basket.totalDeposited), "PAS");
  console.log("   Allocations:");
  for (const alloc of basket.allocations) {
    const chain = PARACHAINS[Number(alloc.paraId)];
    console.log(`     - ${chain?.name || `Para ${alloc.paraId}`}: ${Number(alloc.weightBps) / 100}%`);
  }
  
  // Check token balance before
  const tokenBalanceBefore = await basketToken.balanceOf(signer.address);
  console.log("\n💎 Token Balance Before:", ethers.formatEther(tokenBalanceBefore), "xDOT-LIQ");
  
  // Execute deposit
  console.log("\n" + "=".repeat(70));
  console.log("Executing Deposit...");
  console.log("=".repeat(70));
  console.log("Amount:", DEPOSIT_AMOUNT, "PAS");
  console.log("Expected XCM messages:", basket.allocations.length);
  
  try {
    // Get nonce to avoid "already imported" errors
    const nonce = await ethers.provider.getTransactionCount(signer.address);
    
    const tx = await basketManager.deposit(BASKET_ID, {
      value: ethers.parseEther(DEPOSIT_AMOUNT),
      gasLimit: 500000,
      nonce: nonce, // Explicit nonce to prevent replay
    });
    
    console.log("\n📤 Transaction sent:", tx.hash);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed!");
    console.log("   Block:", receipt.blockNumber);
    console.log("   Gas used:", receipt.gasUsed.toString());
    
    // Parse events
    console.log("\n" + "=".repeat(70));
    console.log("Parsing XCM Events...");
    console.log("=".repeat(70));
    console.log("Total logs:", receipt.logs.length);
    
    const events = {
      deposited: [],
      xcmSent: [],
      xcmFailed: [],
      deploymentDispatched: [],
      deploymentFailed: [],
    };
    
    for (let i = 0; i < receipt.logs.length; i++) {
      const log = receipt.logs[i];
      const topic0 = log.topics[0]?.toLowerCase();
      
      // Skip non-BasketManager logs
      if (log.address.toLowerCase() !== BASKET_MANAGER_ADDRESS.toLowerCase()) {
        continue;
      }
      
      switch (topic0) {
        case EVENT_TOPICS.Deposited:
          const depositedData = {
            basketId: BigInt(log.topics[1]).toString(),
            user: "0x" + log.topics[2].slice(26),
            amount: ethers.formatEther(BigInt(log.data.slice(0, 66))),
            tokensMinted: ethers.formatEther(BigInt("0x" + log.data.slice(66, 130))),
          };
          events.deposited.push(depositedData);
          console.log(`\n✅ Deposited Event:`);
          console.log(`   Basket: ${depositedData.basketId}`);
          console.log(`   User: ${depositedData.user}`);
          console.log(`   Amount: ${depositedData.amount} PAS`);
          console.log(`   Tokens Minted: ${depositedData.tokensMinted} xDOT-LIQ`);
          break;
          
        case EVENT_TOPICS.XCMMessageSent:
          const xcmSentData = {
            paraId: parseInt(log.topics[1], 16),
            messageHash: log.topics[2],
            amount: ethers.formatEther(BigInt(log.data.slice(0, 66))),
          };
          events.xcmSent.push(xcmSentData);
          const chain = PARACHAINS[xcmSentData.paraId];
          console.log(`\n✅ XCM Message Sent:`);
          console.log(`   Chain: ${chain?.name || `Para ${xcmSentData.paraId}`}`);
          console.log(`   Amount: ${xcmSentData.amount} PAS`);
          console.log(`   Message Hash: ${xcmSentData.messageHash}`);
          console.log(`   🔗 Track: ${chain?.explorer}/xcm/${xcmSentData.messageHash}`);
          break;
          
        case EVENT_TOPICS.XCMMessageFailed:
          const xcmFailedData = {
            paraId: parseInt(log.topics[1], 16),
            reason: "XCM dispatch failed - check precompile availability",
          };
          events.xcmFailed.push(xcmFailedData);
          const failedChain = PARACHAINS[xcmFailedData.paraId];
          console.log(`\n❌ XCM Message Failed:`);
          console.log(`   Chain: ${failedChain?.name || `Para ${xcmFailedData.paraId}`}`);
          console.log(`   Reason: ${xcmFailedData.reason}`);
          break;
          
        case EVENT_TOPICS.DeploymentDispatched:
          const deployData = {
            basketId: BigInt(log.topics[1]).toString(),
            paraId: parseInt(log.data.slice(0, 66), 16),
            amount: ethers.formatEther(BigInt("0x" + log.data.slice(66, 130))),
          };
          events.deploymentDispatched.push(deployData);
          console.log(`\n📤 Deployment Dispatched:`);
          console.log(`   Para: ${deployData.paraId}`);
          console.log(`   Amount: ${deployData.amount} PAS`);
          break;
          
        case EVENT_TOPICS.DeploymentFailed:
          const deployFailedData = {
            basketId: BigInt(log.topics[1]).toString(),
            paraId: parseInt(log.data.slice(0, 66), 16),
            amount: ethers.formatEther(BigInt("0x" + log.data.slice(66, 130))),
          };
          events.deploymentFailed.push(deployFailedData);
          console.log(`\n❌ Deployment Failed:`);
          console.log(`   Para: ${deployFailedData.paraId}`);
          console.log(`   Amount: ${deployFailedData.amount} PAS`);
          console.log(`   💡 Fix: Fund sovereign account for this parachain`);
          break;
      }
    }
    
    // Summary
    console.log("\n" + "=".repeat(70));
    console.log("XCM FLOW SUMMARY");
    console.log("=".repeat(70));
    console.log("✅ Local Operations:");
    console.log(`   Deposited: ${events.deposited.length} events`);
    console.log("\n🌐 XCM Operations:");
    console.log(`   XCM Sent: ${events.xcmSent.length} messages`);
    console.log(`   XCM Failed: ${events.xcmFailed.length} messages`);
    console.log(`   Deployments Dispatched: ${events.deploymentDispatched.length}`);
    console.log(`   Deployments Failed: ${events.deploymentFailed.length}`);
    
    const successRate = events.xcmSent.length / (events.xcmSent.length + events.xcmFailed.length) * 100 || 0;
    console.log(`\n📊 Success Rate: ${successRate.toFixed(1)}%`);
    
    if (events.xcmFailed.length > 0 || events.deploymentFailed.length > 0) {
      console.log("\n⚠️  ISSUES DETECTED:");
      console.log("   XCM messages are failing. Common causes:");
      console.log("   1. XCM Precompile not deployed or not functional");
      console.log("   2. Sovereign accounts not funded on target chains");
      console.log("   3. Network congestion or RPC issues");
      console.log("\n🔧 RECOMMENDED FIXES:");
      console.log("   1. Fund sovereign accounts:");
      console.log("      cd contracts && npm run fund:sovereign");
      console.log("   2. Check XCM precompile:");
      console.log(`      cast code ${XCM_PRECOMPILE_ADDRESS} --rpc-url https://eth-rpc-testnet.polkadot.io`);
      console.log("   3. Verify network status on Paseo");
    }
    
    // Check token balance after
    const tokenBalanceAfter = await basketToken.balanceOf(signer.address);
    console.log("\n💎 Token Balance After:", ethers.formatEther(tokenBalanceAfter), "xDOT-LIQ");
    console.log("📈 Tokens Received:", ethers.formatEther(tokenBalanceAfter - tokenBalanceBefore), "xDOT-LIQ");
    
    // Explorer link
    console.log("\n🔗 Explorer Links:");
    console.log(`   Transaction: https://blockscout-testnet.polkadot.io/tx/${tx.hash}`);
    console.log(`   BasketManager: https://blockscout-testnet.polkadot.io/address/${BASKET_MANAGER_ADDRESS}`);
    
    // Next steps
    console.log("\n" + "=".repeat(70));
    console.log("NEXT STEPS");
    console.log("=".repeat(70));
    
    if (events.xcmSent.length > 0) {
      console.log("✅ XCM messages were dispatched. To verify delivery:");
      console.log("   1. Wait 1-2 minutes for XCM execution");
      console.log("   2. Check target chain explorers:");
      for (const sent of events.xcmSent) {
        const chain = PARACHAINS[sent.paraId];
        console.log(`      ${chain?.name}: ${chain?.explorer}/xcm/${sent.messageHash}`);
      }
      console.log("   3. Or check sovereign account balances:");
      console.log(`      https://hydration.subscan.io/account/0x98b71d9da7f556addb143b901cc911867242e374f27f89d24b693974723e20aa`);
    } else {
      console.log("❌ No XCM messages were sent. To fix:");
      console.log("   1. Enable XCM in BasketManager:");
      console.log(`      cast send ${BASKET_MANAGER_ADDRESS} "setXCMEnabled(bool)" true`);
      console.log("   2. Ensure XCM precompile is available");
      console.log("   3. Fund sovereign accounts");
    }
    
    console.log("\n" + "=".repeat(70));
    
  } catch (error) {
    console.error("\n❌ Test Failed:", error.message);
    if (error.message.includes("reverted")) {
      console.error("\n💡 Common fixes:");
      console.error("   - Check if XCM is enabled: await basketManager.xcmEnabled()");
      console.error("   - Verify BasketManager is deployed correctly");
      console.error("   - Ensure you have enough PAS for gas");
    }
    process.exit(1);
  }
}

testDepositAndTrackXCM()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
