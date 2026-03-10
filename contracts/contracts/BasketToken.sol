// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BasketToken is ERC20, Ownable {
    address public basketManager;

    modifier onlyManager() {
        require(msg.sender == basketManager, "Not basket manager");
        _;
    }

    constructor(
        string memory name_,
        string memory symbol_,
        address manager_
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        basketManager = manager_;
    }

    function mint(address to, uint256 amount) external onlyManager {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyManager {
        _burn(from, amount);
    }

    function setManager(address newManager) external onlyOwner {
        basketManager = newManager;
    }
}
