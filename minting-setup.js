import { binToHex, bigIntToVmNumber } from "@bitauth/libauth";
import { ElectrumNetworkProvider, SignatureTemplate, TransactionBuilder } from "cashscript";
import { Wallet, TestNetWallet } from "mainnet-js";
import { tokenId, numberOfThreads, network } from "./mintingParams.js";
import { generateContract } from "./generateContract.js";
import 'dotenv/config';

// Get seedphrase + addressDerivationPath for minting-setup from .env file
const seedphraseSetup = process.env.SEEDPHRASE_SETUP;
const addressDerivationPath = process.env.DERIVATIONPATH_SETUP;

// Initialise wallet
let walletClass = network == "mainnet" ? Wallet : TestNetWallet;
const wallet = await walletClass.fromSeed(seedphraseSetup, addressDerivationPath);
const signatureTemplate = new SignatureTemplate(wallet.privateKey);

// Generate contract object
const contract = generateContract();

// Create the different mintingThreads with CashScript transaction builder
const mintingThreads = [];
for (let i = 0; i < numberOfThreads; i++) {
  const commitmentThread = binToHex(bigIntToVmNumber(BigInt(i)));
  const nftDetails = { capability: 'minting', commitment: commitmentThread }
  const tokenDetails = { amount: 0n, category: tokenId, nft: nftDetails };
  const threadOutput = { to: contract.address, amount: 1000n, token: tokenDetails };
  mintingThreads.push(threadOutput);
}

// Use the selected inputs for the transaction
const provider = new ElectrumNetworkProvider(network);
const walletUtxos = await provider.getUtxos(wallet.address);
const mintingUtxo = walletUtxos.find(utxo => utxo?.token?.category == tokenId && utxo?.token?.nft.capability == 'minting');
const fundingUtxo = walletUtxos.find(utxo => !utxo.token && utxo.satoshis >= 5000n);
const inputsMint = [ mintingUtxo, fundingUtxo ];
console.log(inputsMint);

const transactionBuilder = new TransactionBuilder({ provider })
  .addInputs(inputsMint, signatureTemplate.unlockP2PKH())
  .addOutputs(mintingThreads)
  .setMaxFee(2000n)

const changeAmount = mintingUtxo.satoshis + fundingUtxo.satoshis - 1100n * BigInt(numberOfThreads) - 500n;
if(changeAmount > 2000n) transactionBuilder.addOutput({to: wallet.address, amount: changeAmount});
try {
  const { txid } = await transactionBuilder.send();
  console.log(`The txId for the minting set-up is ${txid}`);
} catch (error) {
  console.log(error)
}
