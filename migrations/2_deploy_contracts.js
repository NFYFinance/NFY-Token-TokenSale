const NFY = artifacts.require("NFY");
const Funding = artifacts.require("Funding");

module.exports = async function (deployer, networks, accounts) {

    // Owner address
    const owner = "0x112FeBab12AAA6B29BD2632E9c4f3F98B2A1fE29";

    // Token details
    const tokenName = "Non Fungible Yearn";
    const tokenSymbol = "NFY";
    const totalSupply = 100000; // 100,000
    const initialLiquidity = 4000; // 4,000
    const fundingSupply = 30000; // 30,000
    const rewardTokens = 60000 // 60,000
    const teamTokens = 6000 // 6,000

    // Funding details
    const fundingLength = 604800; // 7 day

    // Days 1-4
    const tokenPrice1 = web3.utils.toWei('0.03', 'ether'); // 0.03 ether

    // Days 5-7
    const tokenPrice2 = web3.utils.toWei('0.0375', 'ether'); // 0.0375 ether

    const teamLockLength = 1814400 ; // 21 days

    // Token deployment
    await deployer.deploy(NFY, tokenName, tokenSymbol, totalSupply);

    const token = await NFY.deployed();

    // Funding deployment
    await deployer.deploy(Funding, token.address, fundingLength, tokenPrice1, tokenPrice2, fundingSupply, teamTokens, teamLockLength);

    const funding = await Funding.deployed()

    await token.transferOwnership(owner);
    await funding.transferOwnership(owner);

    // Send tokens to be sold to funding smart contract
    await token.transfer(funding.address, web3.utils.toWei(fundingSupply.toString(), 'ether'));

    // Send team tokens to funding smart contract
    await token.transfer(funding.address, web3.utils.toWei(teamTokens.toString(), 'ether'));

    // Send initial liquidity to owner so can add to UniSwap
    await token.transfer(owner, web3.utils.toWei(initialLiquidity.toString(), 'ether'));

};