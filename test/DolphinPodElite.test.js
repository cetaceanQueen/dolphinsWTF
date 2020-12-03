const { expectRevert, time } = require('@openzeppelin/test-helpers');
const eeee = artifacts.require('eeee');
const DolphinPodElite = artifacts.require('DolphinPodElite');
const MockERC20 = artifacts.require('MockERC20');

const eeeePerBlock = web3.utils.toBN('5');
const rewardDuration = web3.utils.toBN('42');
const blocksBeforeStart = web3.utils.toBN('92');
const transferAmount = web3.utils.toBN('210');
var startBlock;
const orcaAmount = web3.utils.toBN('69');


contract('DolphinPodElite', ([alice, bob, carol, dan, dev, minter]) => {
    beforeEach(async () => {
        this.eeee = await eeee.new({ from: dev });
        const eeeeAddr = this.eeee.address;
        startBlock = await web3.eth.getBlockNumber() + 95;
        this.pod = await DolphinPodElite.new(
            eeeeAddr, 
            eeeePerBlock, 
            rewardDuration, 
            blocksBeforeStart, 
            startBlock, 
            orcaAmount,
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
        const orcaLevel = await this.pod.orca();

        assert.equal(eeeeAddr.valueOf(), this.eeee.address);
        assert.equal(blockReward.valueOf().toString(), eeeePerBlock.toString());
        assert.equal(duration.valueOf().toString(), rewardDuration.toString());
        assert.equal(minStart.valueOf().toString(), blocksBeforeStart.toString());
        assert.equal(setStartBlock.valueOf().toString(), startBlock.toString());
        assert.equal(orcaLevel.valueOf().toString(), orcaAmount.toString());
        assert.equal(ownerAddress.valueOf(), dev);
    });

    context('With ERC/LP token added to the field', () => {
        beforeEach(async () => {
            await this.eeee.transfer(alice, '69', { from: dev });
            await this.eeee.transfer(bob, '70', { from: dev });
            await this.eeee.transfer(carol, '100', { from: dev });
            await this.eeee.transfer(dan, '68', { from: dev });

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
            assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '70');

            await time.advanceBlockTo(startBlock - 1);
            await this.pod.deposit(0, '0', { from: bob }); // 2 block before rewards start
            assert.equal((await this.eeee.balanceOf(bob)).valueOf(), '70');

            assert.equal((await this.eeee.balanceOf(this.pod.address)).valueOf().toString(), '210');
            await this.pod.deposit(0, '0', { from: bob }); // block rewards start
            assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '75');

            await time.advanceBlockTo(startBlock + 10);
            await this.pod.deposit(0, '0', { from: bob });
            assert.equal((await web3.eth.getBlockNumber()).valueOf().toString(), (startBlock + 11).toString());
            assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '125');
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
            assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '70');

            await time.advanceBlockTo(startBlock - 1);
            await this.pod.deposit(0, '0', { from: bob }); // 2 block before rewards start
            assert.equal((await this.eeee.balanceOf(bob)).valueOf(), '70');

            assert.equal((await this.eeee.balanceOf(this.pod.address)).valueOf().toString(), '210');
            await this.pod.deposit(0, '0', { from: bob }); // block rewards start
            assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '75');

            await time.advanceBlockTo(startBlock + 10);
            await this.pod.deposit(0, '0', { from: bob });
            assert.equal((await web3.eth.getBlockNumber()).valueOf().toString(), (startBlock + 11).toString());
            assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '125');
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
            assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '70');

            await time.advanceBlockTo(startBlock - 1);
            await this.pod.deposit(0, '0', { from: bob }); // 2 block before rewards start
            assert.equal((await this.eeee.balanceOf(bob)).valueOf(), '70');

            assert.equal((await this.eeee.balanceOf(this.pod.address)).valueOf().toString(), '210');
            await this.pod.deposit(0, '0', { from: bob }); // block rewards start
            assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '75');

            await time.advanceBlockTo(startBlock + 42);
            await this.pod.deposit(0, '0', { from: bob });
            assert.equal((await web3.eth.getBlockNumber()).valueOf().toString(), (startBlock + 43).toString());
            assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '280');
            assert.equal((await this.eeee.balanceOf(this.pod.address)).valueOf().toString(), '0');

            await time.advanceBlockTo(startBlock + 45);
            await this.pod.deposit(0, '0', { from: bob });
            assert.equal((await web3.eth.getBlockNumber()).valueOf().toString(), (startBlock + 46).toString());
            assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '280');
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
            assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '70');

            await time.advanceBlockTo(startBlock - 1);
            await this.pod.deposit(0, '0', { from: bob }); // 2 block before rewards start
            assert.equal((await this.eeee.balanceOf(bob)).valueOf(), '70');

            assert.equal((await this.eeee.balanceOf(this.pod.address)).valueOf().toString(), '210');
            await this.pod.deposit(0, '0', { from: bob }); // block rewards start
            assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '70');

            await time.advanceBlockTo(startBlock + 42);
            await this.pod.deposit(0, '0', { from: bob });
            assert.equal((await web3.eth.getBlockNumber()).valueOf().toString(), (startBlock + 43).toString());
            assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '70');
            assert.equal((await this.eeee.balanceOf(this.pod.address)).valueOf().toString(), '210');

            await time.advanceBlockTo(startBlock + 45);
            await this.pod.deposit(0, '1', { from: bob });
            assert.equal((await web3.eth.getBlockNumber()).valueOf().toString(), (startBlock + 46).toString());
            assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '70');
            assert.equal((await this.eeee.balanceOf(this.pod.address)).valueOf().toString(), '210');

            await time.advanceBlockTo(startBlock + 50);
            await this.pod.deposit(0, '1', { from: bob });
            assert.equal((await web3.eth.getBlockNumber()).valueOf().toString(), (startBlock + 51).toString());
            assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '70');
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
             assert.equal((await this.eeee.balanceOf(alice)).valueOf().toString(), '69');
 
             await time.advanceBlockTo(startBlock + 3);
             await this.pod.deposit(0, '0', { from: alice });
             assert.equal((await this.eeee.balanceOf(alice)).valueOf().toString(), '89');
             assert.equal((await this.eeee.balanceOf(this.pod.address)).valueOf().toString(), '190');
             await this.pod.deposit(0, '20', { from: bob });
             assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '70');
 
             await time.advanceBlockTo(startBlock + 10);
             await this.pod.deposit(0, '0', { from: alice });
             await this.pod.deposit(0, '0', { from: bob });
             await this.pod.deposit(0, '30', { from: carol });
             assert.equal((await this.eeee.balanceOf(alice)).valueOf().toString(), '104');
             assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '93');
             assert.equal((await this.eeee.balanceOf(carol)).valueOf().toString(), '100');
             assert.equal((await this.eeee.balanceOf(this.pod.address)).valueOf().toString(), '152');

             await time.advanceBlockTo(startBlock + 22);
             await this.pod.deposit(0, '10', { from: alice });
             await this.pod.deposit(0, '0', { from: bob });
             await this.pod.deposit(0, '0', { from: carol });
             assert.equal((await this.eeee.balanceOf(alice)).valueOf().toString(), '115');
             assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '114');
             assert.equal((await this.eeee.balanceOf(carol)).valueOf().toString(), '130');
             assert.equal((await this.eeee.balanceOf(this.pod.address)).valueOf().toString(), '90');

             await time.advanceBlockTo(startBlock + 30);
             await this.pod.deposit(0, '0', { from: alice });
             await this.pod.deposit(0, '0', { from: bob });
             await this.pod.withdraw(0, '30', { from: carol });
             assert.equal((await this.eeee.balanceOf(alice)).valueOf().toString(), '126');
             assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '126');
             assert.equal((await this.eeee.balanceOf(carol)).valueOf().toString(), '147');
             assert.equal((await this.eeee.balanceOf(this.pod.address)).valueOf().toString(), '50');

             await time.advanceBlockTo(startBlock + 45);
             await this.pod.deposit(0, '0', { from: alice });
             await this.pod.deposit(0, '0', { from: bob });
             assert.equal((await this.eeee.balanceOf(alice)).valueOf().toString(), '152');
             assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '150');
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
            assert.equal((await this.eeee.balanceOf(alice)).valueOf().toString(), '69');

            await time.advanceBlockTo(startBlock + 3);
            await this.pod.deposit(0, '0', { from: alice });
            await this.pod.deposit(1, '10', { from: alice });
            assert.equal((await this.eeee.balanceOf(alice)).valueOf().toString(), '75');
            assert.equal((await this.eeee.balanceOf(this.pod.address)).valueOf().toString(), '204');
            await this.pod.deposit(0, '20', { from: bob });
            assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '70');

            await time.advanceBlockTo(startBlock + 10);
            await this.pod.deposit(0, '0', { from: alice });
            await this.pod.deposit(0, '0', { from: bob });
            await this.pod.deposit(0, '30', { from: carol });
            await this.pod.deposit(1, '0', { from: alice });
            await this.pod.deposit(1, '0', { from: bob });
            await this.pod.deposit(1, '30', { from: carol });
            assert.equal((await this.eeee.balanceOf(alice)).valueOf().toString(), '110');
            assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '75');
            assert.equal((await this.eeee.balanceOf(carol)).valueOf().toString(), '100');
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
            assert.equal((await this.eeee.balanceOf(alice)).valueOf().toString(), '127');
            assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '82');
            assert.equal((await this.eeee.balanceOf(carol)).valueOf().toString(), '138');
            assert.equal((await this.eeee.balanceOf(this.pod.address)).valueOf().toString(), '102');

            await time.advanceBlockTo(startBlock + 30);
            await this.pod.deposit(0, '0', { from: alice });
            await this.pod.deposit(0, '0', { from: bob });
            await this.pod.withdraw(0, '30', { from: carol });
            await this.pod.deposit(1, '0', { from: alice });
            await this.pod.deposit(1, '0', { from: bob });
            await this.pod.deposit(1, '0', { from: carol });
            assert.equal((await this.eeee.balanceOf(alice)).valueOf().toString(), '137');
            assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '85');
            assert.equal((await this.eeee.balanceOf(carol)).valueOf().toString(), '162');
            assert.equal((await this.eeee.balanceOf(this.pod.address)).valueOf().toString(), '65');

            await time.advanceBlockTo(startBlock + 45);
            await this.pod.deposit(0, '0', { from: alice });
            await this.pod.deposit(1, '0', { from: alice });
            assert.equal((await this.eeee.balanceOf(alice)).valueOf().toString(), '152');
            assert.equal((await this.eeee.balanceOf(bob)).valueOf().toString(), '85');
            assert.equal((await this.eeee.balanceOf(this.pod.address)).valueOf().toString(), '50');

            // Dev should be able to sweep eeee remaining after mining is completed | Pick up 8 unclaimed from Bob
            await this.pod.cleanUpFarm({ from: dev });
            assert.equal((await this.eeee.balanceOf(dev)).valueOf().toString(), '42068999999999999999533');
            assert.equal((await this.eeee.balanceOf(this.pod.address)).valueOf().toString(), '0');
        });
    });
});