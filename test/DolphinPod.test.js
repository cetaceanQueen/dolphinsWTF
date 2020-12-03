const { expectRevert, time } = require('@openzeppelin/test-helpers');
const eeee = artifacts.require('eeee');
const DolphinPod = artifacts.require('DolphinPod');
const MockERC20 = artifacts.require('MockERC20');

const eeeePerBlock = web3.utils.toBN('5');
const rewardDuration = web3.utils.toBN('42');
const blocksBeforeStart = web3.utils.toBN('92');
const transferAmount = web3.utils.toBN('210');
var startBlock;


contract('DolphinPod', ([alice, bob, carol, dev, minter]) => {
    beforeEach(async () => {
        this.eeee = await eeee.new({ from: dev });
        const eeeeAddr = this.eeee.address;
        startBlock = await web3.eth.getBlockNumber() + 95;
        this.pod = await DolphinPod.new(
            eeeeAddr, 
            eeeePerBlock, 
            rewardDuration, 
            blocksBeforeStart, 
            startBlock, 
            { from: dev }
            );
    });

    it('should set correct state variables', async () => {
        const eeeeAddr = await this.pod.dolphinToken();
        const blockReward = await this.pod.eeeePerBlock();
        const duration = await this.pod.durationInBlocks();
        const minStart = await this.pod.minElapsedBlocksBeforeStart();
        const setStartBlock = await this.pod.startBlock();
        const ownerAddress = await this.pod.owner();

        assert.equal(eeeeAddr.valueOf(), this.eeee.address);
        assert.equal(blockReward.valueOf().toString(), eeeePerBlock.toString());
        assert.equal(duration.valueOf().toString(), rewardDuration.toString());
        assert.equal(minStart.valueOf().toString(), blocksBeforeStart.toString());
        assert.equal(setStartBlock.valueOf().toString(), startBlock.toString());
        assert.equal(ownerAddress.valueOf(), dev);
    });

    context('With ERC/LP token added to the field', () => {
        beforeEach(async () => {
            this.stakingToken = await MockERC20.new('ERC20Token', 'ERC20', '10000000000', { from: minter });
            await this.stakingToken.transfer(alice, '1000', { from: minter });
            await this.stakingToken.transfer(bob, '1000', { from: minter });
            await this.stakingToken.transfer(carol, '1000', { from: minter });
            this.stakingToken2 = await MockERC20.new('ERC20Token2', 'ERC202', '10000000000', { from: minter });
            await this.stakingToken2.transfer(alice, '1000', { from: minter });
            await this.stakingToken2.transfer(bob, '1000', { from: minter });
            await this.stakingToken2.transfer(carol, '1000', { from: minter });
        });

        it('should allow emergency withdraw', async () => {
            // Transfer eeee to the contract  
            await this.eeee.transfer(this.pod.address, transferAmount, { from: dev });
            assert.equal((await this.eeee.balanceOf(this.pod.address)).valueOf().toString(), '210');

            await this.pod.add('1', this.stakingToken.address, true, { from: dev });

            await this.stakingToken.approve(this.pod.address, '1000', { from: bob });
            await this.pod.deposit(0, '100', { from: bob });
            assert.equal((await this.stakingToken.balanceOf(bob)).valueOf(), '900');
            await this.pod.emergencyWithdraw(0, { from: bob });
            assert.equal((await this.stakingToken.balanceOf(bob)).valueOf(), '1000');
        });
        
        it('should give out eeees only once farming has started', async () => {
            // Transfer eeee to the contract  
            await this.eeee.transfer(this.pod.address, transferAmount, { from: dev });
            await this.pod.add('1', this.stakingToken.address, true, { from: dev });
            await this.stakingToken.approve(this.pod.address, '1000', { from: bob });
            await this.pod.deposit(0, '100', { from: bob });

            assert.equal((await this.eeee.balanceOf(this.pod.address)).valueOf().toString(), '210');

            await time.advanceBlockTo(startBlock - 5);
            await this.pod.deposit(0, '0', { from: bob }); // 5 block before rewards start
            assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '0');

            await time.advanceBlockTo(startBlock - 1);
            await this.pod.deposit(0, '0', { from: bob }); // 2 block before rewards start
            assert.equal((await this.eeee.balanceOf(bob)).valueOf(), '0');

            assert.equal((await this.eeee.balanceOf(this.pod.address)).valueOf().toString(), '210');
            await this.pod.deposit(0, '0', { from: bob }); // block rewards start
            assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '5');

            await time.advanceBlockTo(startBlock + 10);
            await this.pod.deposit(0, '0', { from: bob });
            assert.equal((await web3.eth.getBlockNumber()).valueOf().toString(), (startBlock + 11).toString());
            assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '55');
            assert.equal((await this.eeee.balanceOf(this.pod.address)).valueOf().toString(), '155');
        });

        it('should allow withdrawals with the game has started', async () => {
            // Transfer eeee to the contract  
            await this.eeee.transfer(this.pod.address, transferAmount, { from: dev });
            await this.pod.add('1', this.stakingToken.address, true, { from: dev });
            await this.stakingToken.approve(this.pod.address, '1000', { from: bob });
            await this.pod.deposit(0, '100', { from: bob });

            assert.equal((await this.eeee.balanceOf(this.pod.address)).valueOf().toString(), '210');

            await this.eeee.startGame({ from : dev}); 

            await time.advanceBlockTo(startBlock - 5);
            await this.pod.deposit(0, '0', { from: bob }); // 5 block before rewards start
            assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '0');

            await time.advanceBlockTo(startBlock - 1);
            await this.pod.deposit(0, '0', { from: bob }); // 2 block before rewards start
            assert.equal((await this.eeee.balanceOf(bob)).valueOf(), '0');

            assert.equal((await this.eeee.balanceOf(this.pod.address)).valueOf().toString(), '210');
            await this.pod.deposit(0, '0', { from: bob }); // block rewards start
            assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '5');

            await time.advanceBlockTo(startBlock + 10);
            await this.pod.deposit(0, '0', { from: bob });
            assert.equal((await web3.eth.getBlockNumber()).valueOf().toString(), (startBlock + 11).toString());
            assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '55');
            assert.equal((await this.eeee.balanceOf(this.pod.address)).valueOf().toString(), '155');

        });

        it('should stop giving out eeees once farming has finished', async () => {
            // Transfer eeee to the contract  
            await this.eeee.transfer(this.pod.address, transferAmount, { from: dev });
            await this.pod.add('1', this.stakingToken.address, true, { from: dev });
            await this.stakingToken.approve(this.pod.address, '1000', { from: bob });
            await this.pod.deposit(0, '100', { from: bob });

            assert.equal((await this.eeee.balanceOf(this.pod.address)).valueOf().toString(), '210');

            await time.advanceBlockTo(startBlock - 5);
            await this.pod.deposit(0, '0', { from: bob }); // 5 block before rewards start
            assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '0');

            await time.advanceBlockTo(startBlock - 1);
            await this.pod.deposit(0, '0', { from: bob }); // 2 block before rewards start
            assert.equal((await this.eeee.balanceOf(bob)).valueOf(), '0');

            assert.equal((await this.eeee.balanceOf(this.pod.address)).valueOf().toString(), '210');
            await this.pod.deposit(0, '0', { from: bob }); // block rewards start
            assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '5');

            await time.advanceBlockTo(startBlock + 42);
            await this.pod.deposit(0, '0', { from: bob });
            assert.equal((await web3.eth.getBlockNumber()).valueOf().toString(), (startBlock + 43).toString());
            assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '210');
            assert.equal((await this.eeee.balanceOf(this.pod.address)).valueOf().toString(), '0');

            await time.advanceBlockTo(startBlock + 45);
            await this.pod.deposit(0, '0', { from: bob });
            assert.equal((await web3.eth.getBlockNumber()).valueOf().toString(), (startBlock + 46).toString());
            assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '210');
            assert.equal((await this.eeee.balanceOf(this.pod.address)).valueOf().toString(), '0');
        });

        
        it('should not distribute EEEEs if no one deposit', async () => {
            // Transfer eeee to the contract  
            await this.eeee.transfer(this.pod.address, transferAmount, { from: dev });
            await this.pod.add('1', this.stakingToken.address, true, { from: dev });
            await this.stakingToken.approve(this.pod.address, '1000', { from: bob });

            assert.equal((await this.eeee.balanceOf(this.pod.address)).valueOf().toString(), '210');

            await time.advanceBlockTo(startBlock - 5);
            await this.pod.deposit(0, '0', { from: bob }); // 5 block before rewards start
            assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '0');

            await time.advanceBlockTo(startBlock - 1);
            await this.pod.deposit(0, '0', { from: bob }); // 2 block before rewards start
            assert.equal((await this.eeee.balanceOf(bob)).valueOf(), '0');

            assert.equal((await this.eeee.balanceOf(this.pod.address)).valueOf().toString(), '210');
            await this.pod.deposit(0, '0', { from: bob }); // block rewards start
            assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '0');

            await time.advanceBlockTo(startBlock + 42);
            await this.pod.deposit(0, '0', { from: bob });
            assert.equal((await web3.eth.getBlockNumber()).valueOf().toString(), (startBlock + 43).toString());
            assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '0');
            assert.equal((await this.eeee.balanceOf(this.pod.address)).valueOf().toString(), '210');

            await time.advanceBlockTo(startBlock + 45);
            await this.pod.deposit(0, '1', { from: bob });
            assert.equal((await web3.eth.getBlockNumber()).valueOf().toString(), (startBlock + 46).toString());
            assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '0');
            assert.equal((await this.eeee.balanceOf(this.pod.address)).valueOf().toString(), '210');

            await time.advanceBlockTo(startBlock + 50);
            await this.pod.deposit(0, '1', { from: bob });
            assert.equal((await web3.eth.getBlockNumber()).valueOf().toString(), (startBlock + 51).toString());
            assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '0');
            assert.equal((await this.eeee.balanceOf(this.pod.address)).valueOf().toString(), '210');
            
        });
        

        it('should distribute EEEEs properly for each staker', async () => {
             // Transfer eeee to the contract  
             await this.eeee.transfer(this.pod.address, transferAmount, { from: dev });
             await this.pod.add('1', this.stakingToken.address, true, { from: dev });

             await this.stakingToken.approve(this.pod.address, '1000', { from: alice });
             await this.stakingToken.approve(this.pod.address, '1000', { from: bob });
             await this.stakingToken.approve(this.pod.address, '1000', { from: carol });
 
             assert.equal((await this.eeee.balanceOf(this.pod.address)).valueOf().toString(), '210');
 
             await time.advanceBlockTo(startBlock - 5);
             await this.pod.deposit(0, '10', { from: alice });
             assert.equal((await this.eeee.balanceOf(alice)).valueOf().toString(), '0');
 
             await time.advanceBlockTo(startBlock + 3);
             await this.pod.deposit(0, '0', { from: alice });
             assert.equal((await this.eeee.balanceOf(alice)).valueOf().toString(), '20');
             assert.equal((await this.eeee.balanceOf(this.pod.address)).valueOf().toString(), '190');
             await this.pod.deposit(0, '20', { from: bob });
             assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '0');
 
             await time.advanceBlockTo(startBlock + 10);
             await this.pod.deposit(0, '0', { from: alice });
             await this.pod.deposit(0, '0', { from: bob });
             await this.pod.deposit(0, '30', { from: carol });
             assert.equal((await this.eeee.balanceOf(alice)).valueOf().toString(), '35');
             assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '23');
             assert.equal((await this.eeee.balanceOf(carol)).valueOf().toString(), '0');
             assert.equal((await this.eeee.balanceOf(this.pod.address)).valueOf().toString(), '152');

             await time.advanceBlockTo(startBlock + 22);
             await this.pod.deposit(0, '10', { from: alice });
             await this.pod.deposit(0, '0', { from: bob });
             await this.pod.deposit(0, '0', { from: carol });
             assert.equal((await this.eeee.balanceOf(alice)).valueOf().toString(), '46');
             assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '44');
             assert.equal((await this.eeee.balanceOf(carol)).valueOf().toString(), '30');
             assert.equal((await this.eeee.balanceOf(this.pod.address)).valueOf().toString(), '90');

             await time.advanceBlockTo(startBlock + 30);
             await this.pod.deposit(0, '0', { from: alice });
             await this.pod.deposit(0, '0', { from: bob });
             await this.pod.withdraw(0, '30', { from: carol });
             assert.equal((await this.eeee.balanceOf(alice)).valueOf().toString(), '57');
             assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '56');
             assert.equal((await this.eeee.balanceOf(carol)).valueOf().toString(), '47');
             assert.equal((await this.eeee.balanceOf(this.pod.address)).valueOf().toString(), '50');

             await time.advanceBlockTo(startBlock + 45);
             await this.pod.deposit(0, '0', { from: alice });
             await this.pod.deposit(0, '0', { from: bob });
             assert.equal((await this.eeee.balanceOf(alice)).valueOf().toString(), '83');
             assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '80');
             assert.equal((await this.eeee.balanceOf(this.pod.address)).valueOf().toString(), '0');
        });

        it('should give proper EEEEs allocation to each pool', async () => {
            // Transfer eeee to the contract  
            await this.eeee.transfer(this.pod.address, transferAmount, { from: dev });
            await this.pod.add('1', this.stakingToken.address, true, { from: dev });
            await this.pod.add('2', this.stakingToken2.address, true, { from: dev });

            await this.stakingToken.approve(this.pod.address, '1000', { from: alice });
            await this.stakingToken.approve(this.pod.address, '1000', { from: bob });
            await this.stakingToken.approve(this.pod.address, '1000', { from: carol });
            await this.stakingToken2.approve(this.pod.address, '1000', { from: alice });
            await this.stakingToken2.approve(this.pod.address, '1000', { from: bob });
            await this.stakingToken2.approve(this.pod.address, '1000', { from: carol });


            assert.equal((await this.eeee.balanceOf(this.pod.address)).valueOf().toString(), '210');

            await time.advanceBlockTo(startBlock - 5);
            await this.pod.deposit(0, '10', { from: alice });
            assert.equal((await this.eeee.balanceOf(alice)).valueOf().toString(), '0');

            await time.advanceBlockTo(startBlock + 3);
            await this.pod.deposit(0, '0', { from: alice });
            await this.pod.deposit(1, '10', { from: alice });
            assert.equal((await this.eeee.balanceOf(alice)).valueOf().toString(), '6');
            assert.equal((await this.eeee.balanceOf(this.pod.address)).valueOf().toString(), '204');
            await this.pod.deposit(0, '20', { from: bob });
            assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '0');

            await time.advanceBlockTo(startBlock + 10);
            await this.pod.deposit(0, '0', { from: alice });
            await this.pod.deposit(0, '0', { from: bob });
            await this.pod.deposit(0, '30', { from: carol });
            await this.pod.deposit(1, '0', { from: alice });
            await this.pod.deposit(1, '0', { from: bob });
            await this.pod.deposit(1, '30', { from: carol });
            assert.equal((await this.eeee.balanceOf(alice)).valueOf().toString(), '41');
            assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '5');
            assert.equal((await this.eeee.balanceOf(carol)).valueOf().toString(), '0');
            assert.equal((await this.eeee.balanceOf(this.pod.address)).valueOf().toString(), '164');

            await expectRevert (
                this.pod.cleanUpFarm({ from: dev }),
                "farming hasn't finished yet"
            );

            await time.advanceBlockTo(startBlock + 22);
            await this.pod.deposit(0, '10', { from: alice });
            await this.pod.deposit(0, '0', { from: bob });
            await this.pod.deposit(0, '0', { from: carol });
            await this.pod.deposit(1, '0', { from: alice });
            await this.pod.deposit(1, '0', { from: bob });
            await this.pod.deposit(1, '0', { from: carol });
            assert.equal((await this.eeee.balanceOf(alice)).valueOf().toString(), '58');
            assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '12');
            assert.equal((await this.eeee.balanceOf(carol)).valueOf().toString(), '38');
            assert.equal((await this.eeee.balanceOf(this.pod.address)).valueOf().toString(), '102');

            await time.advanceBlockTo(startBlock + 30);
            await this.pod.deposit(0, '0', { from: alice });
            await this.pod.deposit(0, '0', { from: bob });
            await this.pod.withdraw(0, '30', { from: carol });
            await this.pod.deposit(1, '0', { from: alice });
            await this.pod.deposit(1, '0', { from: bob });
            await this.pod.deposit(1, '0', { from: carol });
            assert.equal((await this.eeee.balanceOf(alice)).valueOf().toString(), '68');
            assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '15');
            assert.equal((await this.eeee.balanceOf(carol)).valueOf().toString(), '62');
            assert.equal((await this.eeee.balanceOf(this.pod.address)).valueOf().toString(), '65');

            await time.advanceBlockTo(startBlock + 45);
            await this.pod.deposit(0, '0', { from: alice });
            await this.pod.deposit(0, '0', { from: bob });
            await this.pod.deposit(1, '0', { from: alice });
            await this.pod.deposit(1, '0', { from: bob });
            assert.equal((await this.eeee.balanceOf(alice)).valueOf().toString(), '83');
            assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '23');
            assert.equal((await this.eeee.balanceOf(this.pod.address)).valueOf().toString(), '42');

            // Dev should be able to sweep eeee remaining after mining is completed
            await this.pod.cleanUpFarm({ from: dev });
            assert.equal((await this.eeee.balanceOf(dev)).valueOf().toString(), '42068999999999999999832');
            assert.equal((await this.eeee.balanceOf(this.pod.address)).valueOf().toString(), '0');
        });
    });
});