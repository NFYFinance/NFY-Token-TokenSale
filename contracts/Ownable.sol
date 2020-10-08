pragma solidity ^0.6.10;
import "@openzeppelin/contracts/GSN/Context.sol";

contract Ownable is Context{

    address payable public owner;

    event TransferredOwnership(address _previous, address _next, uint256 _time);

    modifier onlyOwner() {
        require(_msgSender() == owner, "Owner only");
        _;
    }

    constructor() public {
        owner = _msgSender();
    }

    function transferOwnership(address payable _owner) public onlyOwner() {
        address previousOwner = owner;
        owner = _owner;
        emit TransferredOwnership(previousOwner, owner, now);
    }
}