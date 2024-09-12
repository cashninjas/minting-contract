import { Network } from "cashscript";

// Configure minting params
const tokenId = "";
const collectionSize = 10_000;
const numberOfThreads = 5;
const mintPriceSats = 5_000_000;
const payoutAddress = ""; // with bitcoincash: or bchtest: prefix
const network = "chipnet" as Network;

export { tokenId, collectionSize, mintPriceSats, payoutAddress, numberOfThreads, network };