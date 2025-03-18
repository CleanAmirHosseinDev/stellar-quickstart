const {
  Horizon,
  TransactionBuilder,
  Networks,
  Operation,
  Asset,
  BASE_FEE,
} = require("stellar-sdk");

const horizonUrl = "https://horizon-testnet.stellar.org";
const friendbotUrl = "https://friendbot.stellar.org";
const server = new Horizon.Server(horizonUrl);

async function fundAccounts(accounts) {
  const publicKeys = [
    accounts.issuer.publicKey,
    ...accounts.receivers.map((r) => r.publicKey),
  ];
  await Promise.all(
    publicKeys.map((key) => fetch(`${friendbotUrl}?addr=${key}`))
  );
}

async function sendPayments(issuer, receivers, amounts) {
  const issuerAccount = await server.loadAccount(issuer.publicKey);
  const coinAsset = new Asset("COIN", issuer.publicKey);
  const transactions = [];

  for (let i = 0; i < receivers.length; i++) {
    const receiver = receivers[i];
    const amount = amounts[i].toString();

    const receiverAccount = await server.loadAccount(receiver.publicKey);
    const transaction = new TransactionBuilder(receiverAccount, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.changeTrust({
          asset: coinAsset,
          source: receiver.publicKey,
        })
      )
      .setTimeout(30)
      .build();

    transaction.sign(Keypair.fromSecret(receiver.secretKey));
    await server.submitTransaction(transaction);

    const paymentTx = new TransactionBuilder(issuerAccount, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.payment({
          destination: receiver.publicKey,
          asset: coinAsset,
          amount,
        })
      )
      .setTimeout(30)
      .build();

    paymentTx.sign(Keypair.fromSecret(issuer.secretKey));
    const result = await server.submitTransaction(paymentTx);

    transactions.push({
      amount,
      to: receiver.publicKey,
      hash: result.hash,
    });
  }
  return transactions;
}

async function getBalances(publicKeys) {
  const balances = await Promise.all(
    publicKeys.map(async (key) => {
      const account = await server.loadAccount(key);
      const balance =
        account.balances.find((b) => b.asset_code === "COIN")?.balance || "0";
      return { publicKey: key, balance };
    })
  );
  return balances;
}

module.exports = { fundAccounts, sendPayments, getBalances };
