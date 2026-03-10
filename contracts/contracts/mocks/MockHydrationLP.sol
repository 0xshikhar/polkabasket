// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockHydrationLP is ERC20, Ownable {
    address public immutable dotToken;
    uint256 public constant EXCHANGE_RATE = 1000; // 1 DOT = 1000 LP tokens

    event Deposited(address indexed user, uint256 dotAmount, uint256 lpMinted);
    event Withdrawn(address indexed user, uint256 lpBurned, uint256 dotReturned);

    constructor(address _dotToken) ERC20("Hydration DOT LP", "hydDOT") Ownable(msg.sender) {
        dotToken = _dotToken;
    }

    function addLiquidity(uint256 dotAmount) external returns (uint256 lpMinted) {
        require(dotAmount > 0, "Must deposit DOT");
        
        IERC20(dotToken).transferFrom(msg.sender, address(this), dotAmount);
        
        lpMinted = dotAmount * EXCHANGE_RATE;
        _mint(msg.sender, lpMinted);
        
        emit Deposited(msg.sender, dotAmount, lpMinted);
    }

    function removeLiquidity(uint256 lpAmount) external returns (uint256 dotReturned) {
        require(lpAmount > 0, "Must burn LP");
        require(balanceOf(msg.sender) >= lpAmount, "Insufficient LP");
        
        dotReturned = lpAmount / EXCHANGE_RATE;
        require(dotReturned > 0, "Amount too small");
        
        _burn(msg.sender, lpAmount);
        IERC20(dotToken).transfer(msg.sender, dotReturned);
        
        emit Withdrawn(msg.sender, lpAmount, dotReturned);
    }

    function getAmountOut(uint256 lpAmount) external pure returns (uint256) {
        return lpAmount / EXCHANGE_RATE;
    }
}
