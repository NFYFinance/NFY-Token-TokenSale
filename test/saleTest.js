const Funding = artifacts.require("Funding");
const NFY = artifacts.require("NFY");
const truffleAssert = require("truffle-assertions");
const helper = require('./utils/utils.js');

const SECONDS_IN_DAY = 86400;

contract("Funding", async function(accounts){

    let investment;
    let auditable;
    let nonOwnerAddress;
    let nonOwnerAddress2;
    let user;
    let user2;
    let user3;
    let rewardAddress;
    let owner;
    let donation;
    let fundingLength;
    let tokenPrice1;
    let tokenPrice2;
    let rewardLockLength;
    let teamLockLength;


    // Token details
    let tokenName = "NFY TOKEN";
    let tokenSymbol = "NFY";

    // Supply converted to 18 decimal places in constructor
    let totalSupply = 100000; // 100,000

    before(async function(){
        token = await NFY.deployed();
        owner = await accounts[1];
        nonOwnerAddress = await accounts[2];
        nonOwnerAddress2 = await accounts[3];
        user = await accounts[4];
        user2 = await accounts[5];
        user3 = await accounts[6];
        user4 = await accounts[7];
        rewardAddress = await accounts[8];
        investment = parseFloat(await web3.utils.toWei('2', 'ether'));

        // Supply converted to 18 decimal places in constructor
        let totalSupply = 100000; // 100,000

        // Tokens before conversion to 18 decimals
        let initialLiquidityBefore = 4000; // 4,000
        let fundingSupplyBefore = 30000; // 30,000
        let rewardTokensBefore = 60000; // 60,000
        let teamTokensBefore = 6000; // 6,000

        // Will be 100, set for testing
        let softCapBefore = 10;

        // Tokens after being converted to 18 decimals
        initialLiquidity = web3.utils.toWei(initialLiquidityBefore.toString(), 'ether');
        fundingSupply = web3.utils.toWei(fundingSupplyBefore.toString(), 'ether');
        rewardTokens = web3.utils.toWei(rewardTokensBefore.toString(), 'ether');
        teamTokens = web3.utils.toWei(teamTokensBefore.toString(), 'ether');
        softCap = web3.utils.toWei(softCapBefore.toString(), 'ether');

        // Funding details
        fundingLength = 604800; // 7 day

        // Days 1-4
        tokenPrice1 = web3.utils.toWei('0.03', 'ether'); // 0.03 ether

        // Days 5-7
        tokenPrice2 = web3.utils.toWei('0.0375', 'ether'); // 0.0375 ether

        rewardLockLength = 1814400; // 21 days
        teamLockLength = 2592000; // 30 days

    });

    beforeEach(async function() {

        token = await NFY.new(tokenName, tokenSymbol, totalSupply);

        funding = await Funding.new(token.address, fundingLength, tokenPrice1, tokenPrice2, softCap, fundingSupply, teamTokens, teamLockLength, rewardTokens, rewardLockLength);

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
    });


    describe('#startFunding()', async function() {

        it('should NOT let a non-owner to start funding', async function() {
            await truffleAssert.fails(funding.startFunding({from: nonOwnerAddress}), truffleAssert.ErrorType.REVERT);
        });

        it('should let the owner start funding', async function() {
            await truffleAssert.passes(funding.startFunding({from: owner}));
        });

        it('should set endFunding to the current block time - length of funding', async function() {
            await funding.startFunding({from: owner});
            const start = await funding.startTime();
            const end = await funding.endFunding();
            assert.strictEqual(BigInt(start), BigInt(end) - BigInt(fundingLength));
        });

        it('should set teamUnlockTime to the current block time - team lock length', async function() {
            await funding.startFunding({from: owner});
            const start = await funding.startTime();
            const end = await funding.teamUnlockTime();
            assert.strictEqual(BigInt(start), BigInt(end) - BigInt(teamLockLength));
        });

        it('should set rewardUnlockTime to the current block time - reward lock length', async function() {
            await funding.startFunding({from: owner});
            const start = await funding.startTime();
            const end = await funding.rewardUnlockTime();
            assert.strictEqual(BigInt(start), BigInt(end) - BigInt(rewardLockLength));
        });

        it('should NOT allow funding to be started once it is over', async function() {
            await funding.startFunding({from: owner});
            await helper.advanceTimeAndBlock(SECONDS_IN_DAY * 8);
            await truffleAssert.fails(funding.startFunding({from: owner}), truffleAssert.ErrorType.REVERT);
        });

    });

    describe('#buyTokens()', async function() {
        it('should NOT allow someone to buy if funding has not started', async function() {
            await truffleAssert.fails(funding.buyTokens({from: user, value: investment }), truffleAssert.ErrorType.REVERT);
        });

        it('should allow someone to buy if funding has started', async function() {
            await truffleAssert.passes(funding.startFunding({from: owner}));
            await truffleAssert.passes(funding.buyTokens({from: user, value: investment }));
        });

        it('should NOT allow someone to buy tokens if funding is over', async function() {
            await funding.startFunding({from: owner});
            await helper.advanceTimeAndBlock(SECONDS_IN_DAY * 8);
            await truffleAssert.fails(funding.buyTokens({from: user, value: investment }), truffleAssert.ErrorType.REVERT);
        });

        it('should NOT allow someone to buy if they are trying to invest less than 0.1 ETH', async function() {
            await truffleAssert.passes(funding.startFunding({from: owner}));
            await truffleAssert.fails(funding.buyTokens({from: user, value: web3.utils.toWei('0.05', 'ether')}), truffleAssert.ErrorType.REVERT);
        });

        it('should NOT allow someone to buy if they are trying to invest more than 50 ETH', async function() {
            await truffleAssert.passes(funding.startFunding({from: owner}));
            await truffleAssert.fails(funding.buyTokens({from: user, value: web3.utils.toWei('51', 'ether')}), truffleAssert.ErrorType.REVERT);
        });

        it('should change price if after 5 days', async function() {
            await funding.startFunding({from: owner});
            await funding.buyTokens({from: user, value: web3.utils.toWei('5', 'ether')});
            await helper.advanceTimeAndBlock(SECONDS_IN_DAY * 5);
            await funding.buyTokens({from: user4, value: web3.utils.toWei('5', 'ether')});
            await helper.advanceTimeAndBlock(SECONDS_IN_DAY * 3);
            await funding.claimTokens({from: user});
            await funding.claimTokens({from: user4});
            const firstBuyer = await token.balanceOf(user);
            const secondBuyer = await token.balanceOf(user4);
            assert(firstBuyer > secondBuyer);
        });

        it('should add purchased tokens to tokens sold', async function() {
            await funding.startFunding({from: owner});
            const balanceBefore = await funding.tokensSold();
            await funding.buyTokens({from: user, value: investment});
            const balanceAfter = await funding.tokensSold();
            assert(balanceBefore < balanceAfter );
        });

        it('should remove purchased tokens to tokens available', async function() {
            await funding.startFunding({from: owner});
            const balanceBefore = await funding.tokensAvailable();
            await funding.buyTokens({from: user, value: investment});
            const balanceAfter = await funding.tokensAvailable();
            assert(balanceBefore > balanceAfter );
        });

        it('should add ETH sent to ethRaised', async function() {
            await funding.startFunding({from: owner});
            const balanceBefore = await funding.ethRaised();
            await funding.buyTokens({from: user, value: investment});
            const balanceAfter = await funding.ethRaised();
            assert.strictEqual(BigInt(balanceBefore), BigInt(balanceAfter) - BigInt(investment));
        });

        it('should have softCapMet bool as false if soft cap not reached', async function() {
            await funding.startFunding({from: owner});
            await funding.buyTokens({from: user, value: investment});
            assert.strictEqual(await funding.softCapMet(), false);
        });

        it('should have softCapMet bool as true if soft cap is reached', async function() {
            await funding.startFunding({from: owner});
            await funding.buyTokens({from: user, value: web3.utils.toWei('5', 'ether')});
            await funding.buyTokens({from: user2, value: web3.utils.toWei('5', 'ether')});
            assert.strictEqual(await funding.softCapMet(), true);
        });

    });

    describe('#claimTokens()', async function() {
        it('should NOT allow claim of tokens if funding is not over and soft cap is not met', async function() {
            await funding.startFunding({from: owner});
            await funding.buyTokens({from: user, value: investment});
            await truffleAssert.fails(funding.claimTokens({from: user}), truffleAssert.ErrorType.REVERT);
        });

        it('should NOT allow claim of tokens if funding is not over and soft cap is met', async function() {
            await funding.startFunding({from: owner});
            await funding.buyTokens({from: user3, value: web3.utils.toWei('5', 'ether')});
            await funding.buyTokens({from: user2, value: web3.utils.toWei('5', 'ether')});
            assert.strictEqual(await funding.softCapMet(), true);
            await truffleAssert.fails(funding.claimTokens({from: user2}), truffleAssert.ErrorType.REVERT);
        });

        it('should let user withdraw tokens if soft cap and time are met and user invested', async function() {
            await (funding.startFunding({from: owner}));
            await funding.buyTokens({from: user, value: web3.utils.toWei('10', 'ether')});
            const balanceBefore = await token.balanceOf(user);
            await helper.advanceTimeAndBlock(SECONDS_IN_DAY * 8);
            await truffleAssert.passes(funding.claimTokens({from: user}));
            const balanceAfter = await token.balanceOf(user);
            assert(balanceAfter > balanceBefore);
        });

        it('should NOT let user withdraw tokens if soft cap and time are met and user already claimed investment', async function() {
            await (funding.startFunding({from: owner}));
            await funding.buyTokens({from: user, value: web3.utils.toWei('10', 'ether')});
            await helper.advanceTimeAndBlock(SECONDS_IN_DAY * 8);
            await truffleAssert.passes(funding.claimTokens({from: user}));
            await truffleAssert.fails(funding.claimTokens({from: user}), truffleAssert.ErrorType.REVERT);
        });

        it('should NOT let user withdraw tokens if soft cap and time are met and user has not invested', async function() {
            await (funding.startFunding({from: owner}));
            await funding.buyTokens({from: user, value: web3.utils.toWei('10', 'ether')});
            await helper.advanceTimeAndBlock(SECONDS_IN_DAY * 8);
            await truffleAssert.fails(funding.claimTokens({from: user2}), truffleAssert.ErrorType.REVERT);
            await truffleAssert.passes(funding.claimTokens({from: user}));
        });

    });

    describe('#investorGetBackEth()', async function() {
        it('should NOT let investors get ETH back is funding is still active', async function() {
            await funding.startFunding({from: owner});
            await funding.buyTokens({from: user3, value: investment});
            await truffleAssert.fails(funding.investorGetBackEth({from: user3}), truffleAssert.ErrorType.REVERT);
        });

        it('should NOT let user withdraw eth if soft cap and time are met', async function() {
            await (funding.startFunding({from: owner}));
            await funding.buyTokens({from: user, value: web3.utils.toWei('10', 'ether')});
            await helper.advanceTimeAndBlock(SECONDS_IN_DAY * 8);
            await truffleAssert.fails(funding.investorGetBackEth({from: user}), truffleAssert.ErrorType.REVERT);
            await truffleAssert.passes(funding.claimTokens({from: user}));
        });

        it('should let user withdraw eth if soft cap is not met and funding ended', async function() {
            await (funding.startFunding({from: owner}));
            await funding.buyTokens({from: user, value: web3.utils.toWei('2', 'ether')});
            await helper.advanceTimeAndBlock(SECONDS_IN_DAY * 8);
            await truffleAssert.passes(funding.investorGetBackEth({from: user}));
            await truffleAssert.fails(funding.claimTokens({from: user}), truffleAssert.ErrorType.REVERT);
        });

        it('should let user withdraw eth if already withdrew', async function() {
            await (funding.startFunding({from: owner}));
            await funding.buyTokens({from: user, value: web3.utils.toWei('2', 'ether')});
            await helper.advanceTimeAndBlock(SECONDS_IN_DAY * 8);
            await truffleAssert.passes(funding.investorGetBackEth({from: user}));
            await truffleAssert.fails(funding.investorGetBackEth({from: user}), truffleAssert.ErrorType.REVERT);
            await truffleAssert.fails(funding.claimTokens({from: user}), truffleAssert.ErrorType.REVERT);
        });

        it('should let user withdraw eth if did not invest', async function() {
            await (funding.startFunding({from: owner}));
            await funding.buyTokens({from: user, value: web3.utils.toWei('2', 'ether')});
            await helper.advanceTimeAndBlock(SECONDS_IN_DAY * 8);
            await truffleAssert.fails(funding.investorGetBackEth({from: user2}), truffleAssert.ErrorType.REVERT);
            await truffleAssert.passes(funding.investorGetBackEth({from: user}));
            await truffleAssert.fails(funding.claimTokens({from: user}), truffleAssert.ErrorType.REVERT);
        });

    });

    describe('#withdrawTeamTokens()', async function() {
        it('should NOT let team get team tokens if funding is still active', async function() {
            await funding.startFunding({from: owner});
            await truffleAssert.fails(funding.withdrawTeamTokens({from: owner}), truffleAssert.ErrorType.REVERT);
        });

        it('should NOT let team withdraw team tokens if soft cap is met and less than 30 days', async function() {
            await (funding.startFunding({from: owner}));
            await funding.buyTokens({from: user, value: web3.utils.toWei('10', 'ether')});
            await helper.advanceTimeAndBlock(SECONDS_IN_DAY * 29);
            await truffleAssert.fails(funding.withdrawTeamTokens({from: owner}), truffleAssert.ErrorType.REVERT);
        });

        it('should NOT let team withdraw team tokens if soft cap is NOT met and before 30 days', async function() {
            await (funding.startFunding({from: owner}));
            await funding.buyTokens({from: user, value: web3.utils.toWei('2', 'ether')});
            await helper.advanceTimeAndBlock(SECONDS_IN_DAY * 29);
            await truffleAssert.fails(funding.withdrawTeamTokens({from: owner}), truffleAssert.ErrorType.REVERT);
        });

       it('should NOT let team withdraw team tokens if soft cap is NOT met and after 30 days', async function() {
            await (funding.startFunding({from: owner}));
            await funding.buyTokens({from: user, value: web3.utils.toWei('2', 'ether')});
            await helper.advanceTimeAndBlock(SECONDS_IN_DAY * 31);
            await truffleAssert.fails(funding.withdrawTeamTokens({from: owner}), truffleAssert.ErrorType.REVERT);
        });

        it('should let team withdraw team tokens if soft cap is met and after 30 days', async function() {
            await (funding.startFunding({from: owner}));
            await funding.buyTokens({from: user, value: web3.utils.toWei('10', 'ether')});
            await helper.advanceTimeAndBlock(SECONDS_IN_DAY * 31);
            await truffleAssert.passes(funding.withdrawTeamTokens({from: owner}));
        });

        it('should NOT let non team wallet withdraw team tokens if soft cap is met and after 30 days', async function() {
            await (funding.startFunding({from: owner}));
            await funding.buyTokens({from: user2, value: web3.utils.toWei('10', 'ether')});
            await helper.advanceTimeAndBlock(SECONDS_IN_DAY * 31);
            await truffleAssert.fails(funding.withdrawTeamTokens({from: nonOwnerAddress}), truffleAssert.ErrorType.REVERT);
        });

    });

    describe('#withdrawEth()', async function() {
        it('should NOT let team withdraw ETH if soft cap is NOT met and before 7 days', async function() {
            await (funding.startFunding({from: owner}));
            await funding.buyTokens({from: user2, value: web3.utils.toWei('2', 'ether')});
            await helper.advanceTimeAndBlock(SECONDS_IN_DAY * 6);
            await truffleAssert.fails(funding.withdrawEth({from: owner}), truffleAssert.ErrorType.REVERT);
        });

        it('should NOT let team withdraw ETH if soft cap is met and before 7 days', async function() {
            await (funding.startFunding({from: owner}));
            await funding.buyTokens({from: user2, value: web3.utils.toWei('10', 'ether')});
            await helper.advanceTimeAndBlock(SECONDS_IN_DAY * 6);
            await truffleAssert.fails(funding.withdrawEth({from: owner}), truffleAssert.ErrorType.REVERT);
        });

        it('should NOT let team withdraw ETH if soft cap is NOT met and after 7 days', async function() {
            await (funding.startFunding({from: owner}));
            await funding.buyTokens({from: user2, value: web3.utils.toWei('2', 'ether')});
            await helper.advanceTimeAndBlock(SECONDS_IN_DAY * 8);
            await truffleAssert.fails(funding.withdrawEth({from: owner}), truffleAssert.ErrorType.REVERT);
        });

        it('should let team withdraw ETH if soft cap is met and after 7 days', async function() {
            await (funding.startFunding({from: owner}));
            await funding.buyTokens({from: user2, value: web3.utils.toWei('10', 'ether')});
            await helper.advanceTimeAndBlock(SECONDS_IN_DAY * 8);
            await truffleAssert.passes(funding.withdrawEth({from: owner}));
        });

        it('should NOT let team withdraw ETH already withdrawn', async function() {
            await (funding.startFunding({from: owner}));
            await funding.buyTokens({from: user2, value: web3.utils.toWei('10', 'ether')});
            await helper.advanceTimeAndBlock(SECONDS_IN_DAY * 8);
            await truffleAssert.passes(funding.withdrawEth({from: owner}));
            await truffleAssert.fails(funding.withdrawEth({from: owner}), truffleAssert.ErrorType.REVERT);
        });

        it('should NOT let non team address withdraw ETH if soft cap is met and after 7 days', async function() {
            await (funding.startFunding({from: owner}));
            await funding.buyTokens({from: user2, value: web3.utils.toWei('10', 'ether')});
            await helper.advanceTimeAndBlock(SECONDS_IN_DAY * 8);
            await truffleAssert.fails(funding.withdrawEth({from: nonOwnerAddress}), truffleAssert.ErrorType.REVERT);
        });

        it('should NOT let non team address withdraw ETH if soft cap is met and before 7 days', async function() {
            await (funding.startFunding({from: owner}));
            await funding.buyTokens({from: user2, value: web3.utils.toWei('10', 'ether')});
            await helper.advanceTimeAndBlock(SECONDS_IN_DAY * 6);
            await truffleAssert.fails(funding.withdrawEth({from: nonOwnerAddress}), truffleAssert.ErrorType.REVERT);
        });

        it('should NOT let non team address withdraw ETH if soft cap is NOT met and after 7 days', async function() {
            await (funding.startFunding({from: owner}));
            await funding.buyTokens({from: user2, value: web3.utils.toWei('2', 'ether')});
            await helper.advanceTimeAndBlock(SECONDS_IN_DAY * 8);
            await truffleAssert.fails(funding.withdrawEth({from: nonOwnerAddress}), truffleAssert.ErrorType.REVERT);
        });

        it('should NOT let non team address withdraw ETH if soft cap is NOT met and before 7 days', async function() {
            await (funding.startFunding({from: owner}));
            await funding.buyTokens({from: user3, value: web3.utils.toWei('2', 'ether')});
            await helper.advanceTimeAndBlock(SECONDS_IN_DAY * 6);
            await truffleAssert.fails(funding.withdrawEth({from: nonOwnerAddress}), truffleAssert.ErrorType.REVERT);
        });

    });

    describe('#transferRewardTokens()', async function() {
        it('should NOT let team send reward tokens if soft cap is NOT met and BEFORE 21 days', async function() {
            await (funding.startFunding({from: owner}));
            await funding.buyTokens({from: user3, value: web3.utils.toWei('2', 'ether')});
            await helper.advanceTimeAndBlock(SECONDS_IN_DAY * 20);
            await truffleAssert.fails(funding.transferRewardTokens(rewardAddress, {from: owner}), truffleAssert.ErrorType.REVERT);
        });

        it('should NOT let team send reward tokens if soft cap is NOT met and AFTER 21 days', async function() {
            await (funding.startFunding({from: owner}));
            await funding.buyTokens({from: user3, value: web3.utils.toWei('2', 'ether')});
            await helper.advanceTimeAndBlock(SECONDS_IN_DAY * 22);
            await truffleAssert.fails(funding.transferRewardTokens(rewardAddress, {from: owner}), truffleAssert.ErrorType.REVERT);
        });

        it('should NOT let team send reward tokens if soft cap met and BEFORE 21 days', async function() {
            await (funding.startFunding({from: owner}));
            await funding.buyTokens({from: user3, value: web3.utils.toWei('10', 'ether')});
            await helper.advanceTimeAndBlock(SECONDS_IN_DAY * 20);
            await truffleAssert.fails(funding.transferRewardTokens(rewardAddress, {from: owner}), truffleAssert.ErrorType.REVERT);
        });

        it('should NOT let non team address send reward tokens if soft cap is NOT met and BEFORE 21 days', async function() {
            await (funding.startFunding({from: owner}));
            await funding.buyTokens({from: user3, value: web3.utils.toWei('2', 'ether')});
            await helper.advanceTimeAndBlock(SECONDS_IN_DAY * 20);
            await truffleAssert.fails(funding.transferRewardTokens(rewardAddress, {from: nonOwnerAddress}), truffleAssert.ErrorType.REVERT);
        });

        it('should NOT let non team address send reward tokens if soft cap is NOT met and AFTER 21 days', async function() {
            await (funding.startFunding({from: owner}));
            await funding.buyTokens({from: user3, value: web3.utils.toWei('2', 'ether')});
            await helper.advanceTimeAndBlock(SECONDS_IN_DAY * 22);
            await truffleAssert.fails(funding.transferRewardTokens(rewardAddress, {from: nonOwnerAddress}), truffleAssert.ErrorType.REVERT);
        });

        it('should NOT let non team address send reward tokens if soft cap met and BEFORE 21 days', async function() {
            await (funding.startFunding({from: owner}));
            await funding.buyTokens({from: user3, value: web3.utils.toWei('10', 'ether')});
            await helper.advanceTimeAndBlock(SECONDS_IN_DAY * 22);
            await truffleAssert.fails(funding.transferRewardTokens(rewardAddress, {from: nonOwnerAddress}), truffleAssert.ErrorType.REVERT);
        });

        it('should let team send reward tokens if soft cap met and after 21 days', async function() {
            await (funding.startFunding({from: owner}));
            await funding.buyTokens({from: user3, value: web3.utils.toWei('10', 'ether')});
            await helper.advanceTimeAndBlock(SECONDS_IN_DAY * 22);
            await truffleAssert.passes(funding.transferRewardTokens(rewardAddress, {from: owner}));
        });

        it('should update reward address balance if tokens get sent', async function() {
            await (funding.startFunding({from: owner}));
            await funding.buyTokens({from: user3, value: web3.utils.toWei('10', 'ether')});
            const balanceBefore = await token.balanceOf(rewardAddress);
            await helper.advanceTimeAndBlock(SECONDS_IN_DAY * 22);
            await truffleAssert.passes(funding.transferRewardTokens(rewardAddress, {from: owner}));
            const balanceAfter = await token.balanceOf(rewardAddress);
            assert(balanceAfter > balanceBefore);

        });


        it('should NOT let team send reward tokens if reward tokens already sent', async function() {
            await (funding.startFunding({from: owner}));
            await funding.buyTokens({from: user3, value: web3.utils.toWei('10', 'ether')});
            await helper.advanceTimeAndBlock(SECONDS_IN_DAY * 22);
            await truffleAssert.passes(funding.transferRewardTokens(rewardAddress, {from: owner}));
            await truffleAssert.fails(funding.transferRewardTokens(rewardAddress, {from: owner}), truffleAssert.ErrorType.REVERT);
        });
    });

    describe('#burnUnSoldTokens()', async function() {
        it('should NOT burn tokens if funding still active', async function() {
            await funding.startFunding({from: owner});
            await funding.buyTokens({from: user3, value: investment});
            await truffleAssert.fails(funding.burnUnSoldTokens({from: owner}), truffleAssert.ErrorType.REVERT);
        });

        it('should burn remaining tokens if funding is over', async function() {
            await funding.startFunding({from: owner});
            await funding.buyTokens({from: user3, value: web3.utils.toWei('10', 'ether')});
            await helper.advanceTimeAndBlock(SECONDS_IN_DAY * 8);
            await truffleAssert.passes(funding.burnUnSoldTokens({from: owner}));
        });

        it('should still let investors withdraw tokens if unsold tokens are burned', async function() {
            await funding.startFunding({from: owner});
            await funding.buyTokens({from: user3, value: web3.utils.toWei('10', 'ether')});
            await helper.advanceTimeAndBlock(SECONDS_IN_DAY * 8);
            await truffleAssert.passes(funding.burnUnSoldTokens({from: owner}));
            await truffleAssert.passes(funding.claimTokens({from: user3}));
        });

        it('should still let team withdraw tokens if unsold tokens are burned', async function() {
            await funding.startFunding({from: owner});
            await funding.buyTokens({from: user3, value: web3.utils.toWei('10', 'ether')});
            await helper.advanceTimeAndBlock(SECONDS_IN_DAY * 31);
            await truffleAssert.passes(funding.burnUnSoldTokens({from: owner}));
            await truffleAssert.passes(funding.withdrawTeamTokens({from: owner}));
        });

        it('should still let team withdraw ETH if unsold tokens are burned', async function() {
            await funding.startFunding({from: owner});
            await funding.buyTokens({from: user4, value: web3.utils.toWei('10', 'ether')});
            await helper.advanceTimeAndBlock(SECONDS_IN_DAY * 31);
            await truffleAssert.passes(funding.burnUnSoldTokens({from: owner}));
            await truffleAssert.passes(funding.withdrawEth({from: owner}));
        });

        it('should still let team and investors withdraw tokens if unsold tokens are burned', async function() {
            await funding.startFunding({from: owner});
            await funding.buyTokens({from: user4, value: web3.utils.toWei('10', 'ether')});
            await helper.advanceTimeAndBlock(SECONDS_IN_DAY * 31);
            await truffleAssert.passes(funding.burnUnSoldTokens({from: owner}));
            await truffleAssert.passes(funding.claimTokens({from: user4}));
            await truffleAssert.passes(funding.withdrawTeamTokens({from: owner}));
        });
    });

});