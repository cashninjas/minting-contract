# BCH Minting Contract

Multi-threaded minting smart contract for the Bitcoin Cash network.

The CashScript code for the smart contract is `contract/mint.cash` and the corresponding artifact `contract/mint.json`.

The repo also includes helper functions to set up a smart contract with `minting-setup.js` and to claim payouts with `invoke-payout.js`.

## Contract Design

### Multi-threaded

The contract design is multi-threaded meaning multiple contract UTXOs running in parallel. This set up enables multiple simultaneous mint interactions. Clients can randomly pick one of the threads or an application server can manage idle/active UTXOs.

This design also means the mint is not actually sequential, i.e. NFT number 16 can be minted before NFT number 12, depending on how much each of the different threads is used.

### Practical

The minting contract is designed to be practical.
For example the smart contract separates the NFT output to the user from their change output to ensure compatibility with different CashTokens wallets.
The contract also has a separate payout function instead of having a payout output on each minting transaction, which would create thousands of small payout outputs.
Lastly, it burns the minting NFTs when the contract ends, this way there are no inactive minting NFTs remaining at the end of the contract.

### Optimized & Clean

The minting contract is optimized to be minimal in size (the redeem script is only 163 bytes).
For example, the `tokenId` is not included as a contract constructor argument which saves ~30 bytes in contract size.
The size for the different txs are as follows:

- Minting transaction, no change ~505 bytes
- Minting transaction, with change ~539 bytes
- Payout transaction, continue mint ~430 bytes
- Payout transaction, end mint ~350 bytes

The contract code itself is clean & commented as to easily be auditable and serve as an example for contract creators.
The contract is flexible, it allows for an optional change output in `mintNFT` and does not impose fixed, hardcoded miner fees.
The contract combines `burnMintingNft` functionality in a minimal way into the `payout` function.

## Installation

```
git clone git@github.com:cashninjas/minting-contract.git
npm install
```

## Usage

To set up a minting contract, configure the parameters of the mint in `mintingParams.js`:

```js
{
    tokenId: "",
    collectionSize: 10_000,
    mintPriceSats: 5_000_000,
    payoutAddres: "", // with bitcoincash: or bchtest: prefix
    numberOfThreads: 5,
    network : "chipnet"
}
```
To actually create the minting set up, configure a wallet holding some BCH and a minting NFT in `minting-setup.js`.

Then create the minting set up with

```
node minting-setup.js
```

This will create the different threads for the minting contract, each tread is a UTXO on the smart contract address with a minting NFT.
The minting NFTs each have a different starting commitment, starting from the VMnumber zero (an empty commitment).
Currently a burn transaction is required with mainnet-js to burn the initial minting nft (this will change when the code is upgraded to the CashScript advanced transaction builder).

To invoke the payouts from the minting contract, configure the wallet authorized to claim the payout in `invoke-payout.js`.

Then claim the contract payouts with

```
node invoke-payout.js
```