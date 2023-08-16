import { Contract, ElectrumNetworkProvider, SignatureTemplate } from "cashscript";
import contractArtifact from "./contract/mint.json" assert { type: "json" };
import { decodeCashAddress, binToHex, hexToBin, vmNumberToBigInt } from "@bitauth/libauth";
import { Wallet, TestNetWallet } from "mainnet-js";
import { tokenId, collectionSize, mintPriceSats, payoutAddress, numberOfThreads, network } from "./mintingParams.js";

// Wallet authorized to call payout function
const seedphrase = "";
const addressDerivationPath = "m/44'/145'/0'/0/0";

// Instantiate wallet
const walletClass = network == "mainnet" ? Wallet : TestNetWallet;
const wallet = await walletClass.fromSeed(seedphrase, addressDerivationPath);
const signatureTemplate = new SignatureTemplate(wallet.privateKeyWif);

// Check if the right wallet is configured to invoke payouts
if (wallet.address != payoutAddress) throw new Error("Provided wallet does not match Payout wallet (addresses don't match)")

// Convert payoutAddress to payoutLockingBytecode
const addressInfo = decodeCashAddress(payoutAddress);
const pkhPayout = binToHex(addressInfo.payload);

// The array of parameters to use for generating the contract
const contractParams = [
  BigInt(mintPriceSats),
  BigInt(numberOfThreads),
  pkhPayout,
  BigInt(collectionSize),
];

// Initialise a network provider for network operations 
const provider = new ElectrumNetworkProvider(network);
const options = { provider };

// Instantiate a new minting contract
const contract = new Contract(contractArtifact, contractParams, options);

console.log(`P2sh32 smart contract address is ${contract.address}`);
console.log('Total balance contracts:', await contract.getBalance());

const contractUtxos = await contract.getUtxos()

for (const contractUtxo of contractUtxos) {
  // Filter UTXOs on smart contract address
  const isMintingUtxo = contractUtxo?.token?.category == tokenId && contractUtxo?.token?.nft?.capability == "minting";
  if (!isMintingUtxo) continue

  const payoutAmount = contractUtxo.satoshis - 2000n;
  if (payoutAmount < 1000) continue
  const tokenDetails = contractUtxo.token;

  try {
    const transaction = contract.functions
      .payout(signatureTemplate, signatureTemplate.getPublicKey())
      .from(contractUtxo)
      .withoutChange()
    // Check commitment to see minting contract is ongoing
    const contractCommitment = vmNumberToBigInt(hexToBin(contractUtxo?.token?.nft?.commitment))
    // If mint is ongoing, need to recreate minting contract at payout
    if (contractCommitment <= BigInt(collectionSize)) transaction.to(contract.tokenAddress, 1000n, tokenDetails);
    transaction.to(payoutAddress, payoutAmount);
    const { txid } = await transaction.send();
    console.log(`Payout transaction of ${payoutAmount} satoshis succesfully sent! \ntxid: ${txid}`);
  } catch (error) { console.log(error) }
}
