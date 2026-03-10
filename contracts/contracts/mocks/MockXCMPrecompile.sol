// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/** No-op XCM precompile for local testing. Deploy and set code at 0x0000...0800 so BasketManager.deposit() does not revert. */
contract MockXCMPrecompile {
    function sendXCM(uint32 /* destParaId */, bytes calldata /* xcmMessage */) external pure {}
    function teleportAsset(uint32 /* destParaId */, uint256 /* amount */, address /* beneficiary */) external pure {}
}
