// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockPVMEngine {
    uint256 public constant MAX_WEIGHT_BPS = 5000;
    uint256 public constant MIN_WEIGHT_BPS = 1000;

    function optimizeAllocation(bytes calldata input) external pure returns (bytes memory) {
        if (input.length < 4) return "";

        uint256 n = toUint256(input[0]);
        
        uint256[] memory yields = new uint256[](n);
        for (uint256 i = 0; i < n; i++) {
            yields[i] = 800 + (i * 200);
        }

        uint256 totalYield = 0;
        for (uint256 i = 0; i < n; i++) {
            totalYield += yields[i];
        }

        if (totalYield == 0) return "";

        uint256[] memory weights = new uint256[](n);
        for (uint256 i = 0; i < n; i++) {
            uint256 rawWeight = (yields[i] * 10000) / totalYield;
            weights[i] = rawWeight > MAX_WEIGHT_BPS ? MAX_WEIGHT_BPS : 
                        (rawWeight < MIN_WEIGHT_BPS ? MIN_WEIGHT_BPS : rawWeight);
        }

        uint256 totalWeight = 0;
        for (uint256 i = 0; i < n; i++) {
            totalWeight += weights[i];
        }

        if (totalWeight != 10000 && n > 0) {
            weights[0] = weights[0] + (10000 - totalWeight);
        }

        bytes memory output = new bytes(n * 2);
        for (uint256 i = 0; i < n; i++) {
            output[i * 2] = bytes1(uint8(weights[i]));
            output[i * 2 + 1] = bytes1(uint8(weights[i] >> 8));
        }

        return output;
    }

    function rebalanceBasket(bytes calldata input) external pure returns (bytes memory) {
        if (input.length < 6) return "";

        uint256 n = toUint256(input[0]);
        uint256 expectedLen = 4 + n * 4 + 2;
        if (input.length < expectedLen) return "";

        uint256[] memory currentWeights = new uint256[](n);
        uint256[] memory targetWeights = new uint256[](n);
        
        for (uint256 i = 0; i < n; i++) {
            currentWeights[i] = toUint256(input[4 + i * 2]) | (toUint256(input[4 + i * 2 + 1]) << 8);
        }
        
        for (uint256 i = 0; i < n; i++) {
            targetWeights[i] = toUint256(input[4 + n * 2 + i * 2]) | (toUint256(input[4 + n * 2 + i * 2 + 1]) << 8);
        }

        uint256 threshold = toUint256(input[4 + n * 4]) | (toUint256(input[4 + n * 4 + 1]) << 8);

        bool needsRebalance = false;
        for (uint256 i = 0; i < n; i++) {
            uint256 drift = currentWeights[i] > targetWeights[i] 
                ? currentWeights[i] - targetWeights[i] 
                : targetWeights[i] - currentWeights[i];
            if (drift > threshold) {
                needsRebalance = true;
                break;
            }
        }

        bytes memory output = new bytes(1 + n * 2);
        output[0] = bytes1(needsRebalance ? 1 : 0);

        uint256[] memory outputWeights = needsRebalance ? targetWeights : currentWeights;
        for (uint256 i = 0; i < n; i++) {
            output[1 + i * 2] = bytes1(uint8(outputWeights[i]));
            output[1 + i * 2 + 1] = bytes1(uint8(outputWeights[i] >> 8));
        }

        return output;
    }

    function riskAdjustedYield(bytes calldata input) external pure returns (bytes memory) {
        if (input.length < 4) return "";

        uint256 n = toUint256(input[0]);
        if (input.length < 4 + n * 8) return "";

        uint256[] memory yields = new uint256[](n);
        uint256[] memory volatilities = new uint256[](n);
        
        for (uint256 i = 0; i < n; i++) {
            yields[i] = toUint256(input[4 + i * 4]) 
                      | (toUint256(input[4 + i * 4 + 1]) << 8)
                      | (toUint256(input[4 + i * 4 + 2]) << 16)
                      | (toUint256(input[4 + i * 4 + 3]) << 24);
        }
        
        for (uint256 i = 0; i < n; i++) {
            volatilities[i] = toUint256(input[4 + n * 4 + i * 4]) 
                             | (toUint256(input[4 + n * 4 + i * 4 + 1]) << 8)
                             | (toUint256(input[4 + n * 4 + i * 4 + 2]) << 16)
                             | (toUint256(input[4 + n * 4 + i * 4 + 3]) << 24);
        }

        uint256[] memory scores = new uint256[](n);
        for (uint256 i = 0; i < n; i++) {
            uint256 volFactor = 10000 + volatilities[i];
            scores[i] = (yields[i] * 10000) / volFactor;
        }

        bytes memory output = new bytes(n * 8);
        for (uint256 i = 0; i < n; i++) {
            output[i * 8] = bytes1(0);
            output[i * 8 + 1] = bytes1(0);
            output[i * 8 + 2] = bytes1(0);
            output[i * 8 + 3] = bytes1(uint8(i));
            output[i * 8 + 4] = bytes1(uint8(scores[i]));
            output[i * 8 + 5] = bytes1(uint8(scores[i] >> 8));
            output[i * 8 + 6] = bytes1(uint8(scores[i] >> 16));
            output[i * 8 + 7] = bytes1(uint8(scores[i] >> 24));
        }

        return output;
    }

    function toUint256(bytes1 b) internal pure returns (uint256) {
        return uint256(uint8(b));
    }
}
