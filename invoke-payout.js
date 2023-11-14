import { SignatureTemplate } from "cashscript";
import { hexToBin, vmNumberToBigInt } from "@bitauth/libauth";
import { Wallet, TestNetWallet } from "mainnet-js";
import { tokenId, collectionSize, payoutAddress, network } from "./mintingParamsNinjas.js";
import { generateContract } from "./generateContract.js";
import 'dotenv/config';

// Get seedphrase + addressDerivationPath for invoke-payout from .env file
const seedphrasePayout = process.env.SEEDPHRASE_PAYOUT;
const addressDerivationPath = process.env.DERIVATIONPATH_PAYOUT;

// Instantiate wallet
const walletClass = network == "mainnet" ? Wallet : TestNetWallet;
const wallet = await walletClass.fromSeed(seedphrasePayout, addressDerivationPath);
const signatureTemplate = new SignatureTemplate(wallet.privateKeyWif);

// Check if the right wallet is configured to invoke payouts
if (wallet.address != payoutAddress) throw new Error("Provided wallet does not match Payout wallet (addresses don't match)")

const contract = generateContract();
console.log('Total balance contracts:', await contract.getBalance());

const contractUtxos = await contract.getUtxos();

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
