// contracts/GLDToken.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract RPSCToken is ERC20 {

    uint256 initialSupply = 10000000000;

    constructor() ERC20(
        "Rock Paper Scissor Coin", 
        "RPSC"
    ) 
    {
        _mint(msg.sender, initialSupply);
    }
}