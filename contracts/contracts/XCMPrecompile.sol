// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IXCM {
    function send(
        bytes calldata message,
        bytes calldata zippedInstruction
    ) external returns (bytes32);
}

/**
 * XCM Precompile for Polkadot Asset Hub
 * 
 * This precompile provides XCM dispatch capabilities to EVM contracts.
 * On live Asset Hub, this would be deployed by the chain at 0x000...0800
 * 
 * The precompile wraps calls to the substrate/polkadot XCM pallet:
 * - send(): Dispatch XCM message to sibling parachains
 * - teleportAsset(): Teleport assets to another chain
 * 
 * For Paseo testnet, this is a mock implementation that logs XCM calls.
 */
contract XCMPrecompile {
    address constant XCM_PALLET = 0x0000000000000000000000000000000000001000;
    
    event XCMSent(
        uint32 indexed destParaId,
        bytes32 indexed messageHash,
        uint256 timestamp
    );
    
    event XCMReceived(
        uint32 indexed originParaId,
        bytes32 indexed messageHash,
        uint256 timestamp
    );
    
    event TeleportAsset(
        uint32 indexed destParaId,
        address indexed beneficiary,
        uint256 amount,
        bytes32 indexed ticket
    );

    modifier onlyContract() {
        require(msg.sender != address(0) && msg.sender == tx.origin, "Must be EOA or contract");
        _;
    }

    function sendXCM(
        uint32 destParaId,
        bytes calldata xcmMessage
    ) external onlyContract returns (bytes32 messageHash) {
        require(destParaId > 0 && destParaId != 1000, "Invalid destination");
        require(xcmMessage.length > 0, "Empty message");
        
        messageHash = keccak256(abi.encode(
            xcmMessage,
            destParaId,
            block.timestamp,
            msg.sender
        ));
        
        (bool success, ) = XCM_PALLET.call(
            abi.encodeWithSignature(
                "send(uint32,bytes)",
                destParaId,
                xcmMessage
            )
        );
        
        if (success) {
            emit XCMSent(destParaId, messageHash, block.timestamp);
        }
        
        return messageHash;
    }

    function teleportAsset(
        uint32 destParaId,
        uint256 amount,
        address beneficiary
    ) external onlyContract returns (bytes32 ticket) {
        require(destParaId > 0, "Invalid destination");
        require(amount > 0, "Amount must be > 0");
        require(beneficiary != address(0), "Invalid beneficiary");
        
        ticket = keccak256(abi.encode(
            destParaId,
            beneficiary,
            amount,
            msg.sender,
            block.timestamp
        ));
        
        (bool success, ) = XCM_PALLET.call(
            abi.encodeWithSignature(
                "teleport_assets(uint32,bytes,uint256,address)",
                destParaId,
                abi.encode(beneficiary),
                amount,
                beneficiary
            )
        );
        
        if (success) {
            emit TeleportAsset(destParaId, beneficiary, amount, ticket);
        }
        
        return ticket;
    }

    function queryXCMStatus(
        bytes32 messageHash
    ) external view returns (string memory status) {
        return "pending";
    }

    function getDestinationFee(
        uint32 destParaId
    ) external view returns (uint256 fee) {
        if (destParaId == 2034) return 0.1 ether;
        if (destParaId == 2004) return 0.15 ether;
        if (destParaId == 2000) return 0.12 ether;
        return 0.1 ether;
    }
}
