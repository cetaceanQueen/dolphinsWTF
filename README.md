# dolphinsWTF
Eeee! Welcome Dolphins! 


                                       __                         
                                   _.-~  )    ____ eeee ____      
                        _..--~~~~,'   ,-/     _                   
                     .-'. . . .'   ,-','    ,' )                  
                   ,'. . . _   ,--~,-'__..-'  ,'                  
                 ,'. . .  (@)' ---~~~~      ,'                    
                /. . . . '~~             ,-'                      
               /. . . . .             ,-'                         
              ; . . . .  - .        ,'                            
             : . . . .       _     /                              
            . . . . .          `-.:                               
           . . . ./  - .          )                               
          .  . . |  _____..---.._/ ____ dolphins.wtf ____         
~---~~~~-~~---~~~~----~~~~-~~~~-~~---~~~~----~~~~~~---~~~~-~~---~~
                                                                  
!!! This code has not been audited, but has been reviewed. Hopefully it's bug free... 
If you do find bugs, remember those were features and part of the game... Don't hate the player.

'===================================================================================================================

The game is based on three sets of contracts. The main game is contained within eeee.sol. 

Token holders are given rights according to the numbers of tokens they hold. 
(Initial Levels):

Orcas (Including EEEE-WETH LP Orcas) - 69 EEEE or 0.000000000000000010 EEEE-WETH UNI-V2 LP
River Dolphins - 420.69 EEEEE
Bottlenose Dolphins - 2103.45 EEEE
Flipper - 4206.9 EEEE
Peter the Dolphin - 21034.5 EEEE

When active, the game snatches from all transfers, with the exception of transfers from the Uniswap EEEE-WETH pair (i.e. buying EEEE), or from the EEEE contract.
(*caution:* setting up other Uniswap and/or Sushiswap pairs isn't a good idea)

*snatches are additive:* if you send 100 EEEE, and the snatch rate is 1%, your wallet will transfer 101 EEEE. If you automatically try to transfer all of the EEEE in your wallet you will get an error. Manually send a lower amount. If you need to transfer all of your EEEE from a contract/wallet that does not allow you to transfer less than the full balance don't worry, there is a strategy... but you have to find it. Eeee!

Calls to most functions cost money (paid in EEEE), and after called will require the contract undergoes a "cooldown period", initially 1 hour for all special function calls (i.e. you can still transfer, approve, sell/buy).
(initial levels)
fee level 1: 1 EEEE
fee level 2: 5 EEEE

Functions:
* Snatch - Withdraw balance of snatchPool
* Start/Pause Game (fee level 1) - Starts or pauses snatching
* Allow devs to eat (fee level 1) - Allows devs to withdraw from dev fund pool (5% of all snatch fees)
* Change Snatch rate (fee level 2) - 1-10% (max 3% for Bottlenose)
* Update Cooldown (fee level 2) - 1-24 hours
* Change Thresholds (fee level 1 * amount of EEEE changed) - Change required level of EEEE held for Orcas, River * Dolphins and Bottlenose Dolphins. Careful, this can get expensive.
* Activate Anarchy (fee level 2) - Zero out dev/owner, move any unclaimed devs funds to snatchpool and stop further collection of dev funds

* Feed Dev - allows the owner address to withdraw funds from dev food bucket
* Set Function Fees - Change fees (in EEEE) for all paid functions
* SetLP - Set the Uniswap LP address and minimum LP balance to be orca


|                    | Snatch | Start/Pause Game | Allow Devs to Eat | Change Snatch Rate | Update Cooldown | Change Thresholds | Activate Anarchy | Feed Dev | Set Function Fees | Set LP |
|--------------------|--------|------------------|-------------------|--------------------|-----------------|-------------------|------------------|----------|-------------------|--------|
| Orcas              |    X   |                  |                   |                    |                 |                   |                  |          |                   |        |
| River Dolphin      |    X   |         X        |                   |                    |                 |                   |                  |          |                   |        |
| Bottlenose Dolphin |    X   |         X        |         X         |          X         |                 |                   |                  |          |                   |        |
| Flipper            |    X   |         X        |         X         |          X         |        X        |         X         |                  |          |                   |        |
| Peter the Dolphin  |    X   |         X        |         X         |          X         |        X        |         X         |         X        |          |                   |        |
| Dev/Owner          |        |                  |                   |                    |                 |                   |                  |     X    |         X         |    X   |
|--------------------|--------|------------------|-------------------|--------------------|-----------------|-------------------|------------------|----------|-------------------|--------|

This repo also contains the code for Dolphin Pods, which distributes EEEE in two phases, as well as SnatchFeeder.

Snatch Feeder allows anyone to call the contract to send 21 EEEE to the snatchPool (in main contract), and then undergoes a 1 hour cooldown. Depositing from this contract will also stop all calls to functions in the main contract (including Snatch).



This token is a worthless game token. Don't buy it. Just farm it, and snatch it, and then play games. It will be fun. 

Eeee! Let the games begin!