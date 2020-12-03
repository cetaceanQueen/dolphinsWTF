const EEEE = artifacts.require('eeee');
const DolphinPod1 = artifacts.require('DolphinPod');

const eeeeToFarm1 = web3.utils.toBN('21000000000000000000000');
const eeeePerBlock1 = web3.utils.toBN('500000000000000000');
const durationBlocks1 = web3.utils.toBN('42000');
const minElapsedBlocksBeforeStart1 = web3.utils.toBN('10000');

const ethers = require('ethers');
const { keccak256, solidityPack, getAddress } = ethers.utils;

// switch to mainnet before deployment
const mainnet = false;
const UniswapAddress = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"; 
const wethAddress = mainnet ? "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2" : "0xc778417e063141139fce010982780140aa0cd5ab";

let TOKEN_WHITELIST_WEIGHTINGS = [
    ['0x967da4048cD07aB37855c090aAF366e4ce1b9F48' , '10'],
    ['0xf3348f43503D35cAD421864d941CD89Bc3A0b797' , '10'],
    ['0x9d47894f8becb68b9cf3428d256311affe8b068b' , '10'],
    ['0x26cf82e4ae43d31ea51e72b663d26e26a75af729' , '10'],
    ['0x9b574599822642b04d0ff7e5776df3a06f4540ba' , '10'],
    ['0x5ade7aE8660293F2ebfcEfaba91d141d72d221e8' , '1']
];

function getUniswapV2PairAddress(tokenA, tokenB) {
    const [token0, token1] = tokenA < tokenB ? [tokenA, tokenB] : [tokenB, tokenA]
    const create2Inputs = [
      '0xff',
      UniswapAddress, // UniswapV2Factory address (mainnet & rinkeby)
      keccak256(solidityPack(['address', 'address'], [token0, token1])),
      "0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f" // Hash of UniswapV2Pair bytecode
    ]
    const sanitizedInputs = `0x${create2Inputs.map(i => i.slice(2)).join('')}`
    return getAddress(`0x${keccak256(sanitizedInputs).slice(-40)}`)
  }



module.exports = async (deployer) => {

    await deployer.deploy(EEEE);
    eeeeInstance = await EEEE.deployed();

    const UniswapV2WETHEEEEPairAddr = await getUniswapV2PairAddress(
        eeeeInstance.address,
        wethAddress); //WETH
    
    console.log("Uniswap EEEE Pair address (pair not created yet) will be: ", UniswapV2WETHEEEEPairAddr);
    
    const startBlock1 = 11340117;

    console.log("farming start block will be: ", startBlock1);

    await deployer.deploy(DolphinPod1, eeeeInstance.address, eeeePerBlock1, durationBlocks1, minElapsedBlocksBeforeStart1, startBlock1);
    pod1 = await DolphinPod1.deployed();

    eeeeInstance.transfer(pod1.address, eeeeToFarm1);

    eeeeInstance.setLP(UniswapV2WETHEEEEPairAddr, '10');

    TOKEN_WHITELIST_WEIGHTINGS.splice(2,0, [UniswapV2WETHEEEEPairAddr, '69']);

    console.log(TOKEN_WHITELIST_WEIGHTINGS);

    let _addr;
    let _weight;


    for(let i = 0; i < TOKEN_WHITELIST_WEIGHTINGS.length; i++) {
        let WHITELIST_ENTRY = TOKEN_WHITELIST_WEIGHTINGS[i];
        _addr = WHITELIST_ENTRY[0];
        _weight = WHITELIST_ENTRY[1];
        await pod1.add(_weight, _addr, false);
        console.log(` - ${_addr} (weight=${_weight})`);
    }

};

