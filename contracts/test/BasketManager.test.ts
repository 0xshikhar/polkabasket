import { expect } from "chai";
import { ethers } from "hardhat";
import { BasketManager, BasketToken } from "../typechain-types";

const XCM_PRECOMPILE_ADDRESS = "0x0000000000000000000000000000000000000800";

describe("BasketManager", function () {
  let basketManager: BasketManager;
  let owner: any;
  let user: any;

  before(async function () {
    const MockXCM = await ethers.getContractFactory("MockXCMPrecompile");
    const mockXCM = await MockXCM.deploy();
    await mockXCM.waitForDeployment();
    const code = await ethers.provider.send("eth_getCode", [await mockXCM.getAddress()]);
    await ethers.provider.send("hardhat_setCode", [XCM_PRECOMPILE_ADDRESS, code]);
  });

  const ALLOCATIONS = [
    {
      paraId: 2034,
      protocol: "0x0000000000000000000000000000000000000001",
      weightBps: 4000,
      depositCall: "0x",
      withdrawCall: "0x",
    },
    {
      paraId: 2004,
      protocol: "0x0000000000000000000000000000000000000002",
      weightBps: 3000,
      depositCall: "0x",
      withdrawCall: "0x",
    },
    {
      paraId: 2000,
      protocol: "0x0000000000000000000000000000000000000003",
      weightBps: 3000,
      depositCall: "0x",
      withdrawCall: "0x",
    },
  ];

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();
    const BasketManagerFactory = await ethers.getContractFactory("BasketManager");
    basketManager = await BasketManagerFactory.deploy();
    await basketManager.waitForDeployment();
  });

  describe("createBasket", function () {
    it("should create a new basket with correct parameters", async function () {
      const tx = await basketManager.createBasket(
        "xDOT Liquidity Basket",
        "xDOT-LIQ",
        ALLOCATIONS
      );
      const receipt = await tx.wait();

      const basketId = await basketManager.nextBasketId();
      expect(basketId).to.equal(1n);

      const basket = await basketManager.getBasket(0);
      expect(basket.name).to.equal("xDOT Liquidity Basket");
      expect(basket.active).to.equal(true);
      expect(basket.totalDeposited).to.equal(0n);
    });

    it("should reject invalid allocations (not summing to 10000)", async function () {
      const invalidAllocations = [
        {
          paraId: 2034,
          protocol: "0x0000000000000000000000000000000000000001",
          weightBps: 5000,
          depositCall: "0x",
          withdrawCall: "0x",
        },
      ];

      await expect(
        basketManager.createBasket("Test", "TEST", invalidAllocations)
      ).to.be.revertedWith("Weights must sum to 10000 bps");
    });

    it("should increment basket IDs correctly", async function () {
      await basketManager.createBasket("Basket 1", "B1", ALLOCATIONS);
      await basketManager.createBasket("Basket 2", "B2", ALLOCATIONS);

      const basketId = await basketManager.nextBasketId();
      expect(basketId).to.equal(2n);
    });
  });

  describe("deposit", function () {
    beforeEach(async function () {
      await basketManager.createBasket("xDOT Liquidity Basket", "xDOT-LIQ", ALLOCATIONS);
    });

    it("should accept deposits and mint tokens 1:1", async function () {
      const depositAmount = ethers.parseEther("10");

      const tx = await basketManager.deposit(0, { value: depositAmount });
      await tx.wait();

      const basket = await basketManager.getBasket(0);
      expect(basket.totalDeposited).to.equal(depositAmount);
    });

    it("should reject zero deposits", async function () {
      await expect(basketManager.deposit(0, { value: 0 })).to.be.revertedWith(
        "Must deposit > 0"
      );
    });

    it("should reject deposits to inactive baskets", async function () {
      const invalidBasketId = 999;
      await expect(
        basketManager.deposit(invalidBasketId, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Basket not active");
    });
  });

  describe("getBasketNAV", function () {
    beforeEach(async function () {
      await basketManager.createBasket("xDOT Liquidity Basket", "xDOT-LIQ", ALLOCATIONS);
    });

    it("should return correct NAV after deposit", async function () {
      const depositAmount = ethers.parseEther("100");
      await basketManager.deposit(0, { value: depositAmount });

      const nav = await basketManager.getBasketNAV(0);
      expect(nav).to.equal(depositAmount);
    });

    it("should return 0 for non-existent baskets", async function () {
      const nav = await basketManager.getBasketNAV(999);
      expect(nav).to.equal(0n);
    });
  });

  describe("owner", function () {
    it("should set correct owner", async function () {
      expect(await basketManager.owner()).to.equal(owner.address);
    });

    it("should only allow owner to create baskets", async function () {
      const basketManagerUser = basketManager.connect(user);
      await expect(
        basketManagerUser.createBasket("Test", "TEST", ALLOCATIONS)
      ).to.be.revertedWith("Not owner");
    });
  });
});
