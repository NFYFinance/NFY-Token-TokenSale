pragma solidity ^0.6.10;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Capped.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./Ownable.sol";

contract NFY is ERC20Capped, Ownable {
    using SafeMath for uint;
    using SafeERC20 for ERC20;
    using Address for address;

    // Variable that stores the address of token
    address public contractAddress = address(this);

    // Constructor will set:
    // The name of the token
    // The symbol of the token
    // The total supply of the token
    // The initial supply of the token
    // **NO NEW TOKENS WILL BE MINTED**
    constructor( string memory name, string memory symbol, uint _totalSupply) ERC20(name, symbol) ERC20Capped(_totalSupply * 10 ** 18) public {
        _mint(owner, _totalSupply * 10 ** 18);
    }

}