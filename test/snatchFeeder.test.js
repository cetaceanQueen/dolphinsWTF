const { expectRevert, time } = require('@openzeppelin/test-helpers');
const dolphinsWTF = artifacts.require('eeee');
const snatchFeeder = artifacts.require('snatchFeeder');

contract('snatchFeeder', ([alice, bob, carol]) => {
    beforeEach(async () => {
        this.eeee = await dolphinsWTF.new({ from: alice });
        this.snatchFeeder = await snatchFeeder.new(this.eeee.address, { from: alice });
        await this.eeee.startGame({from : alice });
    });

    it('check state variables are set correctly', async () => {
        const eeeeAddress = await this.eeee.address;
        const eeee = await this.snatchFeeder._eeee();
        const cooldown = await this.snatchFeeder._coolDownTime();
        const feed = await this.snatchFeeder._feedAmount();
        const started = await this.snatchFeeder._snatchingStarted();
        assert.equal(eeee.valueOf(), eeeeAddress);
        assert.equal(cooldown.valueOf(), 3600);
        assert.equal(feed.valueOf().toString(), "21000000000000000000" );
        assert.equal(started.valueOf(), false);
    });

    it('check that funds can be deposited', async () => {
        const snatchAddress = await this.snatchFeeder.address;
        const transferAmount = web3.utils.toBN('6969000000000000000000');
        await this.eeee.approve(snatchAddress, transferAmount, { from: alice });
        await this.snatchFeeder.deposit(transferAmount, { from: alice });
        const filledFeeder = await this.snatchFeeder._feedStock();
        assert.equal(filledFeeder.valueOf().toString(), transferAmount.toString());
    });

    it('check that the dev and only the dev can start/end snatching', async () => {
        const snatchAddress = await this.snatchFeeder.address;

        await expectRevert (
            this.snatchFeeder.startSnatching({ from: alice }),
            "You must deposit eeee before starting snatching",
        );

        await expectRevert (
            this.snatchFeeder.startSnatching({ from: bob }),
            "Ownable: caller is not the owner",
        );

        const transferAmount = web3.utils.toBN('6969000000000000000000');
        await this.eeee.approve(snatchAddress, transferAmount, { from: alice });
        await this.snatchFeeder.deposit(transferAmount, { from: alice });
        await this.snatchFeeder.startSnatching({ from: alice });
        const snatchStatus = await this.snatchFeeder._snatchingStarted();
        assert.equal(snatchStatus.valueOf(), true);

        await this.snatchFeeder.endSnatching({ from: alice });
        const reSnatchStatus = await this.snatchFeeder._snatchingStarted();
        assert.equal(reSnatchStatus.valueOf(), false);
    });

    it('check that snatching can only be done when snatching is started', async () => {
        const snatchAddress = await this.snatchFeeder.address;
        const transferAmount = web3.utils.toBN('6969000000000000000000');
        await this.eeee.approve(snatchAddress, transferAmount, { from: alice });
        await this.snatchFeeder.deposit(transferAmount, { from: alice });
        
        await expectRevert (
            this.snatchFeeder.fundSnatch({ from: bob }),
            "you must wait for snatching to begin",
        );
        
        await this.snatchFeeder.startSnatching({ from: alice });
        const snatchStatus = await this.snatchFeeder._snatchingStarted();
        assert.equal(snatchStatus.valueOf(), true);
        const snatchPool = await this.eeee._snatchPool();
        await this.snatchFeeder.fundSnatch({ from: bob });

        const snatchedFeeder = await this.snatchFeeder._feedStock();
        //6969-42 = 6927
        assert.equal(snatchedFeeder.valueOf().toString(), "6948000000000000000000");

        const reSnatchPool = await this.eeee._snatchPool();
        const snatched = (reSnatchPool.valueOf() - snatchPool.valueOf());
        assert.equal(snatched.toString(), "21000000000000000000");
        //109155500000000000000'

    });
    
    it('check that snatching can be done, but only when cooled down', async () => {
        const snatchAddress = await this.snatchFeeder.address;
        const transferAmount = web3.utils.toBN('6969000000000000000000');
        await this.eeee.approve(snatchAddress, transferAmount, { from: alice });
        await this.snatchFeeder.deposit(transferAmount, { from: alice });
        await this.snatchFeeder.startSnatching({ from: alice });
        const snatchStatus = await this.snatchFeeder._snatchingStarted();
        assert.equal(snatchStatus.valueOf(), true);
        const snatchPool = await this.eeee._snatchPool();
        await time.increase(3600);

        await this.snatchFeeder.fundSnatch({ from: bob });

        const snatchedFeeder = await this.snatchFeeder._feedStock();
        assert.equal(snatchedFeeder.valueOf().toString(), "6948000000000000000000");

        const reSnatchPool = await this.eeee._snatchPool();
        const snatched = reSnatchPool.valueOf() - snatchPool.valueOf();
        assert.equal(snatched.toString(), "21000000000000000000");

        await expectRevert (
            this.snatchFeeder.fundSnatch({ from: carol }),
            "you must wait one hour for the fundSnatch feature to cooldown",
        );

    });

    it('check that snatching turns off automatically', async () => {
        const snatchAddress = await this.snatchFeeder.address;
        const transferAmount = web3.utils.toBN('10000000000000000000');
        await this.eeee.approve(snatchAddress, transferAmount, { from: alice });
        await this.snatchFeeder.deposit(transferAmount, { from: alice });
        await this.snatchFeeder.startSnatching({ from: alice });
        const snatchStatus = await this.snatchFeeder._snatchingStarted();
        assert.equal(snatchStatus.valueOf(), true);
        await this.snatchFeeder.fundSnatch({ from: bob });

        const snatchedFeeder = await this.snatchFeeder._feedStock();
        assert.equal(snatchedFeeder.valueOf().toString(), "0");

        const snatchPool = await this.eeee._snatchPool();
        assert.equal(snatchPool.valueOf().toString(), "11045000000000000000");
       
        const reSnatchStatus = await this.snatchFeeder._snatchingStarted();
        assert.equal(reSnatchStatus.valueOf(), false);
        
    });

});
