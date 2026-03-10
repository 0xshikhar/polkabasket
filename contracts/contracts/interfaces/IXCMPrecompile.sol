// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IXCMPrecompile {
    function sendXCM(uint32 destParaId, bytes calldata xcmMessage) external;
    function teleportAsset(uint32 destParaId, uint256 amount, address beneficiary) external;
}
