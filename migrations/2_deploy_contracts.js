const NFY = artifacts.require("NFY");
const Funding = artifacts.require("Funding");

module.exports = async function (deployer, networks, accounts) {

    // Owner address
    const owner = accounts[1];

    // Token details
    let tokenName = "NFY TOKEN";
    let tokenSymbol = "NFY";

    // Supply converted to 18 decimal places in constructor
    let totalSupply = 100000; // 100,000

    // Tokens before conversion to 18 decimals
    let initialLiquidityBefore = 4000; // 4,000
    let fundingSupplyBefore = 30000; // 30,000
    let rewardTokensBefore = 60000; // 60,000
    let teamTokensBefore = 6000; // 6,000

    // Tokens after being converted to 18 decimals
    initialLiquidity = web3.utils.toWei(initialLiquidityBefore.toString(), 'ether');
    fundingSupply = web3.utils.toWei(fundingSupplyBefore.toString(), 'ether');
    rewardTokens = web3.utils.toWei(rewardTokensBefore.toString(), 'ether');
    teamTokens = web3.utils.toWei(teamTokensBefore.toString(), 'ether');

    // Funding details
    const fundingLength = 604800; // 7 day

    // Days 1-4
    const tokenPrice1 = web3.utils.toWei('0.03', 'ether'); // 0.03 ether

    // Days 5-7
    const tokenPrice2 = web3.utils.toWei('0.0375', 'ether'); // 0.0375 ether

    const rewardLockLength = 1814400; // 21 days
    const teamLockLength = 2592000; // 30 days

    // Token deployment
    await deployer.deploy(NFY, tokenName, tokenSymbol, totalSupply);

    const token = await NFY.deployed();

    // Funding deployment
    await deployer.deploy(Funding, token.address, fundingLength, tokenPrice1, tokenPrice2, fundingSupply, teamTokens, teamLockLength, rewardTokens, rewardLockLength);

    const funding = await Funding.deployed()

    // Transfer ownership to secured secured account
    await token.transferOwnership(owner);
    await funding.transferOwnership(owner);

    // Send tokens to be sold to funding smart contract
    await token.transfer(funding.address, fundingSupply);

    // Send team tokens to funding smart contract
    await token.transfer(funding.address, teamTokens);

    // Send initial liquidity to owner so can add to UniSwap
    await token.transfer(owner, initialLiquidity);

    // Send reward tokens to funding address
    await token.transfer(funding.address, rewardTokens);

};