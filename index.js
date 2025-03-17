import {
  Keypair,
  Horizon,
  TransactionBuilder,
  Networks,
  Operation,
  Asset,
  BASE_FEE,
} from "stellar-sdk";

const horizonUrl = "https://horizon-testnet.stellar.org";
const friendbotUrl = "https://friendbot.stellar.org";

const issuerKeypair = Keypair.random();
const destinationKeypair = Keypair.random();

console.log(
  `issuer keys:\n${issuerKeypair.publicKey()}\n${issuerKeypair.secret()}\n`
);
console.log(
  `destination account keys:\n${destinationKeypair.publicKey()}\n${destinationKeypair.secret()}\n`
);

await fetch(friendbotUrl + `?addr=${issuerKeypair.publicKey()}`); // pre-fund the `issuer` account using friendbot
await fetch(friendbotUrl + `?addr=${destinationKeypair.publicKey()}`); // pre-fund the `destination` account using friendbot

const server = new Horizon.Server(horizonUrl);
const account = await server.loadAccount(issuerKeypair.publicKey());
const abcAsset = new Asset("ABC", issuerKeypair.publicKey());

const transaction = new TransactionBuilder(account, {
  fee: BASE_FEE,
  networkPassphrase: Networks.TESTNET,
})
  .addOperation(
    Operation.changeTrust({
      asset: abcAsset,
      source: destinationKeypair.publicKey(),
    })
  )
  .addOperation(
    Operation.payment({
      destination: destinationKeypair.publicKey(),
      asset: abcAsset,
      amount: "100",
    })
  )
  .setTimeout(30)
  .build();

transaction.sign(issuerKeypair, destinationKeypair);
const res = await server.submitTransaction(transaction);
console.log(`transaction hash:\n${res.hash}`);