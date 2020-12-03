const EEEE = artifacts.require('eeee');
const DolphinPod2 = artifacts.require('DolphinPodElite');

const eeeeToFarm2 = web3.utils.toBN('9000000000000000000');
const eeeePerBlock2 = web3.utils.toBN('150000000000000000');
const durationBlocks2 = web3.utils.toBN('94060');
const minElapsedBlocksBeforeStart2 = web3.utils.toBN('4600');
const orcaLevel = web3.utils.toBN('69000000000000000000');

mainnet = false;
const eeeeToken = mainnet ? '0x757b2350Cd60D5E46E1Fc3314f980f20d85cfB9f' : '0x5Ed2AFDc1AC09A9138bAB05D30811117be1ff769';




let TOKEN_WHITELIST_WEIGHTINGS = ['0x90edfee1a563c2f6c766730f902951ff48128a8c' , '69'];

module.exports = async (deployer) => {

    // Reference EEEE token
    eeeeInstance = await EEEE.at(eeeeToken);
    await eeeeInstance.pauseGame();  //reinstate

    //Plan for Mainnet 11385669 - Friday at ~11:30 GMT
    const startBlock2 = 11385669;

    console.log("farming start block will be: ", startBlock2);

    await deployer.deploy(DolphinPod2, eeeeInstance.address, eeeePerBlock2, durationBlocks2, minElapsedBlocksBeforeStart2, startBlock2, orcaLevel);
    pod2 = await DolphinPod2.deployed();

    await eeeeInstance.transfer(pod2.address, eeeeToFarm2);

    console.log(TOKEN_WHITELIST_WEIGHTINGS);

    let _addr = TOKEN_WHITELIST_WEIGHTINGS[0];
    let _weight = TOKEN_WHITELIST_WEIGHTINGS[1];

    await pod2.add(_weight, _addr, false);
    console.log(` - ${_addr} (weight=${_weight})`);

};

