// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IBasketManager {
    struct AllocationConfig {
        uint32 paraId;
        address protocol;
        uint16 weightBps;
        bytes depositCall;
        bytes withdrawCall;
    }

    struct Basket {
        uint256 id;
        string name;
        address token;
        AllocationConfig[] allocations;
        uint256 totalDeposited;
        bool active;
    }

    struct UserPosition {
        uint256 basketId;
        uint256 tokenBalance;
        uint256 depositedAt;
    }

    event BasketCreated(uint256 indexed basketId, string name, address token);
    event Deposited(uint256 indexed basketId, address indexed user, uint256 amount, uint256 tokensMinted);
    event Withdrawn(uint256 indexed basketId, address indexed user, uint256 tokensBurned, uint256 amountOut);
    event DeploymentDispatched(uint256 indexed basketId, uint32 paraId, uint256 amount);
    event Rebalanced(uint256 indexed basketId, uint256 timestamp);

    function createBasket(
        string calldata name,
        string calldata symbol,
        AllocationConfig[] calldata allocations
    ) external returns (uint256 basketId);

    function deposit(uint256 basketId) external payable returns (uint256 tokensMinted);

    function withdraw(uint256 basketId, uint256 tokenAmount) external;

    function rebalance(uint256 basketId) external;

    function getBasket(uint256 basketId) external view returns (Basket memory);

    function getBasketNAV(uint256 basketId) external view returns (uint256);

    function nextBasketId() external view returns (uint256);

    function owner() external view returns (address);

    function rebalanceThresholdBps() external view returns (uint16);
}
