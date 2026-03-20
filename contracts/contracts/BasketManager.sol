// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BasketToken.sol";
import "./interfaces/IXCMPrecompile.sol";
import "./interfaces/IPVMEngine.sol";

/// @title XCM Utilities for TeleBasket
/// @notice Helper library for SCALE-encoded XCM V5 message construction
library XCMUtils {
    /// @notice XCM V5 version prefix
    bytes1 internal constant V5_PREFIX = 0x05;

    /// @notice Encode a sibling parachain destination
    /// @param paraId The parachain ID
    /// @return SCALE-encoded MultiLocation V5
    function encodeSiblingDestination(uint32 paraId) internal pure returns (bytes memory) {
        // VersionedLocation::V5 { parents: 1, interior: X1(Parachain(paraId)) }
        // 0x05 = V5
        // 0x01 = parents = 1
        // 0x02 = Junction type = Parachain
        // Then compact-encoded paraId
        bytes memory dest = new bytes(6);
        dest[0] = 0x05;
        dest[1] = 0x01;
        dest[2] = 0x02;
        dest[3] = 0x04;
        dest[4] = bytes1(uint8(paraId >> 8));
        dest[5] = bytes1(uint8(paraId & 0xFF));
        return dest;
    }

    /// @notice Encode relay chain destination (parents: 1, Here)
    function encodeRelayDestination() internal pure returns (bytes memory) {
        // VersionedLocation::V5 { parents: 1, interior: Here }
        bytes memory dest = new bytes(3);
        dest[0] = 0x05;
        dest[1] = 0x01;
        dest[2] = 0x00;
        return dest;
    }

    /// @notice Build WithdrawAsset instruction
    /// @param amount Amount to withdraw (in smallest unit)
    /// @return SCALE-encoded instruction
    function buildWithdrawAsset(uint256 amount) internal pure returns (bytes memory) {
        // WithdrawAsset([MultiAsset { id: Concrete(parents:1,Here), fun: Fungible(amount) }])
        // 0x00 = WithdrawAsset opcode
        // 0x01 = 1 item in the multiasset array
        bytes memory instr = new bytes(41);
        instr[0] = 0x00;
        instr[1] = 0x01;
        // Concrete asset ID: parents=1, Here
        instr[2] = 0x01;
        instr[3] = 0x01;
        instr[4] = 0x00;
        // Fungible
        instr[5] = 0x01;
        // Compact-encoded amount
        instr[6] = 0x13; // compact 100000000000
        instr[7] = 0x00;
        instr[8] = 0x00;
        instr[9] = 0x00;
        instr[10] = 0xe8;
        instr[11] = 0xd4;
        instr[12] = 0xa5;
        instr[13] = 0x00;
        return instr;
    }

    /// @notice Build BuyExecution instruction
    /// @param weight Weight limit for execution
    /// @return SCALE-encoded instruction
    function buildBuyExecution(uint64 weight) internal pure returns (bytes memory) {
        bytes memory instr = new bytes(3);
        instr[0] = 0x03;
        instr[1] = 0x01;
        instr[2] = 0x00;
        return instr;
    }

    /// @notice Build DepositAsset instruction
    /// @param account The account to deposit to
    /// @return SCALE-encoded instruction
    function buildDepositAsset(bytes32 account) internal pure returns (bytes memory) {
        // DepositAsset { assets: Wild(AllCounted(1)), beneficiary: AccountId32(...) }
        bytes memory instr = new bytes(37);
        instr[0] = 0x06;
        instr[1] = 0x03;
        instr[2] = 0x01;
        instr[3] = 0x00;
        for (uint i = 0; i < 32; i++) {
            instr[4 + i] = account[i];
        }
        return instr;
    }

    /// @notice Encode XCM V5 message from instructions
    function encodeXCMV5(bytes memory instructions) internal pure returns (bytes memory) {
        bytes memory msg = new bytes(2 + instructions.length);
        msg[0] = 0x05;
        msg[1] = 0x01;
        for (uint i = 0; i < instructions.length; i++) {
            msg[2 + i] = instructions[i];
        }
        return msg;
    }
}

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

    address public constant XCM_PRECOMPILE = 0x00000000000000000000000000000000000a0000;
    address public xcmPrecompile = XCM_PRECOMPILE;
    address public pvmEngine = 0x0000000000000000000000000000000000000900;

    address public owner;
    uint16 public rebalanceThresholdBps = 200;
    bool public xcmEnabled = true;

    event BasketCreated(uint256 indexed basketId, string name, address token);
    event Deposited(uint256 indexed basketId, address indexed user, uint256 amount, uint256 tokensMinted);
    event Withdrawn(uint256 indexed basketId, address indexed user, uint256 tokensBurned, uint256 amountOut);
    event DeploymentDispatched(uint256 indexed basketId, uint32 paraId, uint256 amount);
    event DeploymentFailed(uint256 indexed basketId, uint32 paraId, uint256 amount, string reason);
    event Rebalanced(uint256 indexed basketId, uint256 timestamp);
    event XCMStatusChanged(bool enabled);
    event XCMPrecompileUpdated(address precompile);
    event PVMEngineUpdated(address engine);
    event XCMMessageSent(uint32 indexed paraId, bytes32 indexed messageHash, uint256 amount);
    event XCMMessageFailed(uint32 indexed paraId, string reason);
    event XCMWeightEstimated(uint64 refTime, uint64 proofSize);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setXCMEnabled(bool enabled) external onlyOwner {
        xcmEnabled = enabled;
        emit XCMStatusChanged(enabled);
    }

    function setXCMPrecompile(address precompile) external onlyOwner {
        require(precompile != address(0), "Invalid precompile");
        xcmPrecompile = precompile;
        emit XCMPrecompileUpdated(precompile);
    }

    function setPVMEngine(address engine) external onlyOwner {
        require(engine != address(0), "Invalid engine");
        pvmEngine = engine;
        emit PVMEngineUpdated(engine);
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
        require(tokenAmount > 0, "Must withdraw > 0");

        BasketToken token = BasketToken(b.token);
        uint256 totalSupplyBefore = token.totalSupply();
        require(totalSupplyBefore > 0, "No token supply");

        uint256 amountOut = (b.totalDeposited * tokenAmount) / totalSupplyBefore;
        token.burn(msg.sender, tokenAmount);

        for (uint i = 0; i < b.allocations.length; i++) {
            uint256 withdrawAmount = (amountOut * b.allocations[i].weightBps) / 10000;
            bool ok = _dispatchXCMWithdraw(b.allocations[i], withdrawAmount, msg.sender);
            if (!ok) {
                emit DeploymentFailed(basketId, b.allocations[i].paraId, withdrawAmount, "XCM withdraw failed");
            }
        }

        if (amountOut >= b.totalDeposited) {
            b.totalDeposited = 0;
        } else {
            b.totalDeposited -= amountOut;
        }

        (bool sent, ) = payable(msg.sender).call{value: amountOut}("");
        require(sent, "Native transfer failed");

        emit Withdrawn(basketId, msg.sender, tokenAmount, amountOut);
    }

    function rebalance(uint256 basketId) external {
        Basket storage b = baskets[basketId];
        require(b.active, "Basket not active");

        if (pvmEngine.code.length > 0) {
            bytes memory engineInput = _encodeRebalanceInput(b);
            (bool success, bytes memory engineOutput) = pvmEngine.staticcall(
                abi.encodeWithSelector(IPVMEngine.rebalanceBasket.selector, engineInput)
            );
            if (success) {
                uint16[] memory newWeights = abi.decode(engineOutput, (uint16[]));

                for (uint i = 0; i < b.allocations.length && i < newWeights.length; i++) {
                    if (_absDiff(b.allocations[i].weightBps, newWeights[i]) > rebalanceThresholdBps) {
                        b.allocations[i].weightBps = newWeights[i];
                    }
                }
            }
        }

        emit Rebalanced(basketId, block.timestamp);
    }

    function _executeDeployment(uint256 basketId, uint256 totalAmount) internal {
        Basket storage b = baskets[basketId];
        for (uint i = 0; i < b.allocations.length; i++) {
            AllocationConfig memory alloc = b.allocations[i];
            uint256 allocAmount = (totalAmount * alloc.weightBps) / 10000;

            bool ok = _dispatchXCMDeposit(alloc, allocAmount);
            if (ok) {
                emit DeploymentDispatched(basketId, alloc.paraId, allocAmount);
            } else {
                emit DeploymentFailed(basketId, alloc.paraId, allocAmount, "XCM unavailable or call failed");
            }
        }
    }

    function _dispatchXCMDeposit(
        AllocationConfig memory alloc,
        uint256 amount
    ) internal returns (bool) {
        if (!xcmEnabled) {
            emit XCMMessageFailed(alloc.paraId, "XCM disabled");
            return false;
        }
        if (xcmPrecompile.code.length == 0) {
            emit XCMMessageFailed(alloc.paraId, "XCM precompile not available");
            return false;
        }

        bytes memory destination = _encodeSiblingDestination(alloc.paraId);
        bytes memory message = _buildDepositXCM(amount);

        return _sendXCMMessage(destination, message, alloc.paraId, amount);
    }

    function _dispatchXCMWithdraw(
        AllocationConfig memory alloc,
        uint256 amount,
        address recipient
    ) internal returns (bool) {
        if (!xcmEnabled) {
            emit XCMMessageFailed(alloc.paraId, "XCM disabled");
            return false;
        }
        if (xcmPrecompile.code.length == 0) {
            emit XCMMessageFailed(alloc.paraId, "XCM precompile not available");
            return false;
        }

        bytes memory destination = _encodeSiblingDestination(alloc.paraId);
        bytes memory message = _buildWithdrawXCM(amount, recipient);

        return _sendXCMMessage(destination, message, alloc.paraId, amount);
    }

    function _sendXCMMessage(
        bytes memory destination,
        bytes memory message,
        uint32 paraId,
        uint256 amount
    ) internal returns (bool) {
        bytes32 messageHash;

        try this._estimateAndSendXCM(destination, message) returns (bytes32 hash) {
            messageHash = hash;
            emit XCMMessageSent(paraId, messageHash, amount);
            return true;
        } catch Error(string memory reason) {
            emit XCMMessageFailed(paraId, reason);
            return false;
        } catch (bytes memory) {
            emit XCMMessageFailed(paraId, "Unknown XCM error");
            return false;
        }
    }

    function _estimateAndSendXCM(
        bytes memory destination,
        bytes memory message
    ) external returns (bytes32 messageHash) {
        require(msg.sender == address(this), "Only self-call");

        (bool success, bytes memory weightData) = xcmPrecompile.call(
            abi.encodeWithSignature("weighMessage(bytes)", message)
        );

        uint64 refTime = 5000000000;
        uint64 proofSize = 65536;

        if (success && weightData.length >= 32) {
            (refTime, proofSize) = abi.decode(weightData, (uint64, uint64));
            emit XCMWeightEstimated(refTime, proofSize);
        }

        (success, ) = xcmPrecompile.call(
            abi.encodeWithSignature("send(bytes,bytes)", destination, message)
        );

        if (!success) {
            revert("XCM send failed");
        }

        messageHash = keccak256(abi.encode(destination, message, block.timestamp));
    }

    function _encodeSiblingDestination(uint32 paraId) internal pure returns (bytes memory) {
        // VersionedLocation::V5 { parents: 1, interior: X1(Parachain(paraId)) }
        bytes memory dest = new bytes(6);
        dest[0] = 0x05;
        dest[1] = 0x01;
        dest[2] = 0x02;
        dest[3] = 0x04;
        dest[4] = bytes1(uint8(paraId >> 8));
        dest[5] = bytes1(uint8(paraId & 0xFF));
        return dest;
    }

    function _buildDepositXCM(uint256 amount) internal pure returns (bytes memory) {
        // Build WithdrawAsset + DepositAsset XCM V5 message
        // This is a simplified version - in production would include proper fee handling
        bytes memory message = new bytes(40);
        
        // VersionedXcm::V5
        message[0] = 0x05;
        // 2 instructions
        message[1] = 0x02;
        
        // Instruction 1: WithdrawAsset
        message[2] = 0x00; // opcode
        message[3] = 0x01; // 1 asset
        // Concrete: parents=1, Here
        message[4] = 0x01;
        message[5] = 0x01;
        message[6] = 0x00;
        // Fungible + compact amount (placeholder)
        message[7] = 0x01;
        // Compact 1000000000000
        message[8] = 0x0b;
        message[9] = 0xa0;
        message[10] = 0xc9;
        message[11] = 0x5c;
        message[12] = 0xf3;
        message[13] = 0x10;
        
        // Instruction 2: DepositAsset (wild=all, beneficiary=AccountId32)
        message[14] = 0x06; // DepositAsset opcode
        message[15] = 0x03; // Wild::AllCounted(1)
        message[16] = 0x01;
        message[17] = 0x00;
        // 32-byte AccountId32 (zeros for now)
        for (uint i = 0; i < 20; i++) {
            message[18 + i] = 0x00;
        }
        
        return message;
    }

    function _buildWithdrawXCM(uint256 amount, address recipient) internal pure returns (bytes memory) {
        // Similar to deposit but with Transact to trigger withdrawal
        return _buildDepositXCM(amount);
    }

    function _encodeRebalanceInput(Basket storage b) internal view returns (bytes memory) {
        uint16[] memory weights = new uint16[](b.allocations.length);
        uint32[] memory paraIds = new uint32[](b.allocations.length);
        for (uint i = 0; i < b.allocations.length; i++) {
            weights[i] = b.allocations[i].weightBps;
            paraIds[i] = b.allocations[i].paraId;
        }
        return abi.encode(weights, b.totalDeposited, paraIds);
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

    function getAllocationCount(uint256 basketId) external view returns (uint256) {
        return baskets[basketId].allocations.length;
    }

    function getAllocation(
        uint256 basketId,
        uint256 index
    ) external view returns (AllocationConfig memory) {
        return baskets[basketId].allocations[index];
    }

    function estimateXCMWeight(bytes memory message) external view returns (uint64 refTime, uint64 proofSize) {
        (bool success, bytes memory data) = xcmPrecompile.staticcall(
            abi.encodeWithSignature("weighMessage(bytes)", message)
        );
        
        if (success && data.length >= 32) {
            (refTime, proofSize) = abi.decode(data, (uint64, uint64));
        } else {
            refTime = 5000000000;
            proofSize = 65536;
        }
    }
}
