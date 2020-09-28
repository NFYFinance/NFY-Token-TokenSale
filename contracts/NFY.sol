pragma solidity ^0.6.10;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Capped.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";


contract NFY is ERC20Capped {
    using SafeMath for uint;
    using SafeERC20 for ERC20;
    using Address for address;


    address owner;

    // Modifier that requires msg.sender to be owner
    modifier onlyOwner(){
        require(msg.sender == owner);
        _;
    }

    // Variable that stores the address of token
    address public contractAddress = address(this);

    // Constructor will set:
    // The name of the token
    // The symbol of the token
    // The total supply of the token
    // The initial supply of the token
    constructor( string memory name, string memory symbol, uint _totalSupply) ERC20(name, symbol)ERC20Capped(_totalSupply * 10 ** 18) public {
        owner = msg.sender;
        _mint(owner, _totalSupply * 10 ** 18);
    }

    // Function that will allow owner to update the owner
    function updateOwner(address newOwner) external onlyOwner() {
        owner = newOwner;
    }

    // Function that allows the owner to mint new tokens
    function mint(address _mintTo, uint _toBeMinted) external onlyOwner() {
        _toBeMinted = _toBeMinted;
        _mint(_mintTo, _toBeMinted );

    }

}