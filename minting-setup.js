import { Contract, ElectrumNetworkProvider } from "cashscript";
import contractArtifact from "./contract/mint.json" assert { type: "json" };
import { decodeCashAddress, binToHex, bigIntToVmNumber } from "@bitauth/libauth";
import { Wallet, TestNetWallet, TokenMintRequest } from "mainnet-js";
import { tokenId, collectionSize, mintPriceSats, payoutAddress, numberOfThreads, network } from "./mintingParams.js";

// Wallet to create minting set-up
const seedphrase = "";
const addressDerivationPath = "m/44'/145'/0'/0/0";

// Convert payoutAddress to payoutLockingBytecode
const addressInfo = decodeCashAddress(payoutAddress);
const pkhPayout = binToHex(addressInfo.payload);

// The array of parameters to use for generating the contract
// maximumCount = collectionSize-1 because count starts from zero
const contractParams = [
  BigInt(mintPriceSats),
  BigInt(numberOfThreads),
  pkhPayout,
  BigInt(collectionSize - 1),
];

// Initialise a network provider for network operations 
const provider = new ElectrumNetworkProvider(network);
const options = { provider };

console.log('creating a minting contract with the following params:\n' + contractParams);

// Instantiate a new minting contract
const contract = new Contract(contractArtifact, contractParams, options);
console.log(`P2sh32 smart contract address is ${contract.address}`);

// Create the different mintingUtxos with mainnet-js
const tokenMintRequests = [];

// New tokenMintRequest for each of the theads of the minting contract
// Thread start of with commitment number 0 (empty commit)
for (let i = 0; i < numberOfThreads; i++) {
  const newTokenMintReq = new TokenMintRequest({
    cashaddr: contract.address,
    commitment: binToHex(bigIntToVmNumber(BigInt(i))),
    capability: "minting",
    value: 1000,
  });
  tokenMintRequests.push(newTokenMintReq)
}

let walletClass = network == "mainnet" ? Wallet : TestNetWallet;

const wallet = await walletClass.fromSeed(seedphrase, addressDerivationPath);
const { txId } = await wallet.tokenMint(tokenId, tokenMintRequests);

console.log(`The txId for the minting set-up is ${txId}`);

// burning initial minting nft returned to the wallet
const burnResponse = await wallet.tokenBurn(
  {
    tokenId: tokenId,
    amount: 0,
    capability: "minting",
    commitment: "",
  },
  "burn"
);

console.log(`The txId burning initial minting nft ${burnResponse.txId}`);
