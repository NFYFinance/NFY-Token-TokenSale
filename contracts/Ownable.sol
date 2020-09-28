pragma solidity ^0.6.10;

contract Ownable {

    address payable public owner;

    event TransferredOwnership(address _previous, address _next, uint256 _time);

    modifier onlyOwner() {
        require(msg.sender == owner, "Owner only");
        _;
    }

    constructor() public {
        owner = msg.sender;
    }

    function transferOwnership(address payable _owner) public onlyOwner() {
        address previousOwner = owner;
        owner = _owner;
        emit TransferredOwnership(previousOwner, owner, now);
    }
}