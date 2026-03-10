// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IPVMEngine {
    function optimizeAllocation(bytes calldata input) external view returns (bytes memory);
    function rebalanceBasket(bytes calldata input) external view returns (bytes memory);
}
