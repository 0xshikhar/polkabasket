// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IXcm
/// @notice Solidity interface for the Polkadot XCM Precompile
/// @dev Fixed address: 0x00000000000000000000000000000000000a0000
///      All messages and destinations must be SCALE-encoded XCM V5.
interface IXcm {
    /// @notice Weight struct for XCM execution cost estimation
    struct Weight {
        uint64 refTime;
        uint64 proofSize;
    }

    /// @notice Execute an XCM message locally on this chain
    /// @param message Raw SCALE-encoded XCM V5 instructions
    /// @param weight Estimated weight from weighMessage()
    function execute(bytes calldata message, Weight calldata weight) external;

    /// @notice Send an XCM message to another chain
    /// @param destination SCALE-encoded MultiLocation of target chain
    /// @param message Raw SCALE-encoded XCM V5 instructions
    function send(bytes calldata destination, bytes calldata message) external;

    /// @notice Estimate the weight required for an XCM message
    /// @param message Raw SCALE-encoded XCM V5 instructions
    /// @return weight The estimated Weight (refTime + proofSize)
    function weighMessage(bytes calldata message) external view returns (Weight memory weight);
}
