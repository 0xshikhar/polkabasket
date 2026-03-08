// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external returns (uint256);
}

contract MockMoonbeamLending is ERC20, Ownable {
    address public immutable dotToken;
    uint256 public constant SUPPLY_RATE = 1050; // 5% APY (expressed as multiplier * 1000)
    
    mapping(address => uint256) public deposited;
    mapping(address => uint256) public depositTime;

    event Deposited(address indexed user, uint256 dotAmount, uint256 shareMinted);
    event Withdrawn(address indexed user, uint256 shareBurned, uint256 dotReturned);
    event Accrued(address indexed user, uint256 accruedAmount);

    constructor(address _dotToken) ERC20("Moonbeam DOT Lending", "moondDOT") Ownable(msg.sender) {
        dotToken = _dotToken;
    }

    function deposit(uint256 dotAmount) external returns (uint256 shareMinted) {
        require(dotAmount > 0, "Must deposit DOT");
        
        IERC20(dotToken).transferFrom(msg.sender, address(this), dotAmount);
        
        uint256 totalShares = totalSupply();
        if (totalShares == 0) {
            shareMinted = dotAmount;
        } else {
            uint256 underlying = getTotalUnderlying();
            shareMinted = (dotAmount * totalShares) / underlying;
        }
        
        deposited[msg.sender] += dotAmount;
        depositTime[msg.sender] = block.timestamp;
        _mint(msg.sender, shareMinted);
        
        emit Deposited(msg.sender, dotAmount, shareMinted);
    }

    function withdraw(uint256 shareAmount) external returns (uint256 dotReturned) {
        require(shareAmount > 0, "Must withdraw");
        require(balanceOf(msg.sender) >= shareAmount, "Insufficient shares");
        
        uint256 totalShares = totalSupply();
        uint256 underlying = getTotalUnderlying();
        
        dotReturned = (shareAmount * underlying) / totalShares;
        
        _burn(msg.sender, shareAmount);
        IERC20(dotToken).transfer(msg.sender, dotReturned);
        
        deposited[msg.sender] = 0;
        
        emit Withdrawn(msg.sender, shareAmount, dotReturned);
    }

    function getTotalUnderlying() public view returns (uint256) {
        return IERC20(dotToken).balanceOf(address(this));
    }

    function getExchangeRate() external view returns (uint256) {
        uint256 totalShares = totalSupply();
        if (totalShares == 0) return 1000;
        
        uint256 underlying = getTotalUnderlying();
        return (underlying * 1000) / totalShares;
    }

    function accrue(address user) external {
        uint256 balance = balanceOf(user);
        if (balance == 0) return;
        
        uint256 timePassed = block.timestamp - depositTime[user];
        if (timePassed == 0) return;
        
        uint256 accrued = (balance * SUPPLY_RATE * timePassed) / (1000 * 365 days);
        if (accrued > 0) {
            _mint(user, accrued);
            emit Accrued(user, accrued);
        }
    }
}
