import { Contract, ElectrumNetworkProvider } from "cashscript";
import contractArtifact from "./contract/mint.json" assert { type: "json" };
import { decodeCashAddress, binToHex } from "@bitauth/libauth";
import { collectionSize, mintPriceSats, payoutAddress, numberOfThreads, network } from "./mintingParams.js";

export function generateContract(){
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

    console.log('Generating a minting contract with the following params:\n' + contractParams);

    // Instantiate a new minting contract
    const contract = new Contract(contractArtifact, contractParams, options);
    console.log(`P2sh32 smart contract address is ${contract.address}`);

    return contract
}