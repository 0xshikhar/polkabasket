// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BasketToken.sol";
import "./interfaces/IXCMPrecompile.sol";
import "./interfaces/IPVMEngine.sol";

contract BasketManager {
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

    uint256 public nextBasketId;
    mapping(uint256 => Basket) public baskets;
    mapping(address => UserPosition[]) public userPositions;

    address public constant XCM_PRECOMPILE = 0x0000000000000000000000000000000000000800;
    address public constant PVM_ENGINE = 0x0000000000000000000000000000000000000900;

    address public owner;
    uint16 public rebalanceThresholdBps = 200;

    event BasketCreated(uint256 indexed basketId, string name, address token);
    event Deposited(uint256 indexed basketId, address indexed user, uint256 amount, uint256 tokensMinted);
    event Withdrawn(uint256 indexed basketId, address indexed user, uint256 tokensBurned, uint256 amountOut);
    event DeploymentDispatched(uint256 indexed basketId, uint32 paraId, uint256 amount);
    event Rebalanced(uint256 indexed basketId, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function createBasket(
        string calldata name,
        string calldata symbol,
        AllocationConfig[] calldata allocations
    ) external onlyOwner returns (uint256 basketId) {
        _validateAllocations(allocations);

        basketId = nextBasketId++;
        BasketToken token = new BasketToken(name, symbol, address(this));

        Basket storage b = baskets[basketId];
        b.id = basketId;
        b.name = name;
        b.token = address(token);
        b.active = true;
        for (uint i = 0; i < allocations.length; i++) {
            b.allocations.push(allocations[i]);
        }

        emit BasketCreated(basketId, name, address(token));
    }

    function deposit(uint256 basketId) external payable returns (uint256 tokensMinted) {
        Basket storage b = baskets[basketId];
        require(b.active, "Basket not active");
        require(msg.value > 0, "Must deposit > 0");

        tokensMinted = msg.value;
        BasketToken(b.token).mint(msg.sender, tokensMinted);
        b.totalDeposited += msg.value;

        _executeDeployment(basketId, msg.value);

        emit Deposited(basketId, msg.sender, msg.value, tokensMinted);
    }

    function withdraw(uint256 basketId, uint256 tokenAmount) external {
        Basket storage b = baskets[basketId];
        require(b.active, "Basket not active");

        BasketToken(b.token).burn(msg.sender, tokenAmount);

        uint256 share = (tokenAmount * 1e18) / BasketToken(b.token).totalSupply();

        for (uint i = 0; i < b.allocations.length; i++) {
            uint256 withdrawAmount = (b.totalDeposited * b.allocations[i].weightBps * share) / (10000 * 1e18);
            _dispatchXCMWithdraw(b.allocations[i], withdrawAmount, msg.sender);
        }

        b.totalDeposited -= tokenAmount;
        emit Withdrawn(basketId, msg.sender, tokenAmount, tokenAmount);
    }

    function rebalance(uint256 basketId) external {
        Basket storage b = baskets[basketId];
        require(b.active, "Basket not active");

        bytes memory engineInput = _encodeRebalanceInput(b);
        bytes memory engineOutput = _callPVMEngine(engineInput);

        uint16[] memory newWeights = abi.decode(engineOutput, (uint16[]));

        for (uint i = 0; i < b.allocations.length; i++) {
            if (_absDiff(b.allocations[i].weightBps, newWeights[i]) > rebalanceThresholdBps) {
                b.allocations[i].weightBps = newWeights[i];
            }
        }

        emit Rebalanced(basketId, block.timestamp);
    }

    function _executeDeployment(uint256 basketId, uint256 totalAmount) internal {
        Basket storage b = baskets[basketId];
        for (uint i = 0; i < b.allocations.length; i++) {
            AllocationConfig memory alloc = b.allocations[i];
            uint256 allocAmount = (totalAmount * alloc.weightBps) / 10000;
            _dispatchXCMDeposit(alloc, allocAmount);
            emit DeploymentDispatched(basketId, alloc.paraId, allocAmount);
        }
    }

    function _dispatchXCMDeposit(AllocationConfig memory alloc, uint256 amount) internal {
        bytes memory xcmMessage = abi.encode(
            alloc.paraId,
            amount,
            alloc.depositCall
        );
        IXCMPrecompile(XCM_PRECOMPILE).sendXCM(alloc.paraId, xcmMessage);
    }

    function _dispatchXCMWithdraw(
        AllocationConfig memory alloc,
        uint256 amount,
        address recipient
    ) internal {
        bytes memory xcmMessage = abi.encode(
            alloc.paraId,
            amount,
            alloc.withdrawCall,
            recipient
        );
        IXCMPrecompile(XCM_PRECOMPILE).sendXCM(alloc.paraId, xcmMessage);
    }

    function _callPVMEngine(bytes memory input) internal view returns (bytes memory) {
        (bool success, bytes memory result) = PVM_ENGINE.staticcall(input);
        require(success, "PVM engine call failed");
        return result;
    }

    function _encodeRebalanceInput(Basket storage b) internal view returns (bytes memory) {
        uint16[] memory weights = new uint16[](b.allocations.length);
        for (uint i = 0; i < b.allocations.length; i++) {
            weights[i] = b.allocations[i].weightBps;
        }
        return abi.encode(weights, b.totalDeposited);
    }

    function _validateAllocations(AllocationConfig[] calldata allocations) internal pure {
        uint256 totalWeight;
        for (uint i = 0; i < allocations.length; i++) {
            totalWeight += allocations[i].weightBps;
        }
        require(totalWeight == 10000, "Weights must sum to 10000 bps");
    }

    function _absDiff(uint16 a, uint16 b) internal pure returns (uint16) {
        return a > b ? a - b : b - a;
    }

    function getBasket(uint256 basketId) external view returns (Basket memory) {
        return baskets[basketId];
    }

    function getBasketNAV(uint256 basketId) external view returns (uint256) {
        return baskets[basketId].totalDeposited;
    }
}
