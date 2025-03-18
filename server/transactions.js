const {
  Horizon,
  TransactionBuilder,
  Networks,
  Operation,
  Asset,
  BASE_FEE,
  Keypair,
} = require("stellar-sdk");

const horizonUrl = "https://horizon-testnet.stellar.org";
const friendbotUrl = "https://friendbot.stellar.org";
const server = new Horizon.Server(horizonUrl);

async function fundAccounts(accounts) {
  console.log("Funding accounts:", accounts);
  const publicKeys = [
    accounts.issuer.publicKey,
    ...accounts.receivers.map((r) => r.publicKey),
  ];
  const fundResponses = await Promise.all(
    publicKeys.map(async (key) => {
      const response = await fetch(`${friendbotUrl}?addr=${key}`);
      const result = await response.json();
      console.log(
        `Friendbot response for ${key}:`,
        JSON.stringify(result, null, 2)
      );
      if (!response.ok) {
        throw new Error(
          `Friendbot failed for ${key}: ${JSON.stringify(result)}`
        );
      }
      return response.ok;
    })
  );
  if (!fundResponses.every((status) => status)) {
    throw new Error("Failed to fund one or more accounts with Friendbot");
  }
}

async function sendPayments(issuer, receivers, amounts) {
  console.log("Sending payments with amounts:", amounts);
  const issuerAccount = await server.loadAccount(issuer.publicKey);
  console.log("Issuer account loaded:", issuerAccount.id);
  const coinAsset = new Asset("COIN", issuer.publicKey);
  const transactions = [];

  for (const [i, receiver] of receivers.entries()) {
    const amount = amounts[i].toString();
    console.log(
      `Processing payment to ${receiver.publicKey} for ${amount} COIN`
    );

    let receiverAccount;
    try {
      receiverAccount = await server.loadAccount(receiver.publicKey);
      console.log(`Receiver account loaded: ${receiver.publicKey}`);
    } catch (error) {
      console.error(
        `Failed to load receiver account ${receiver.publicKey}:`,
        error
      );
      throw error;
    }

    const trustTx = new TransactionBuilder(receiverAccount, {
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

    trustTx.sign(Keypair.fromSecret(receiver.secretKey));
    try {
      const trustResult = await server.submitTransaction(trustTx);
      console.log(
        `Trust tx succeeded for ${receiver.publicKey}:`,
        trustResult.hash
      );
      await new Promise((resolve) => setTimeout(resolve, 5000)); // تأخیر 5 ثانیه
    } catch (error) {
      console.error(
        `Trust tx failed for ${receiver.publicKey}:`,
        error.response?.data || error
      );
      throw error;
    }

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
    try {
      const paymentResult = await server.submitTransaction(paymentTx);
      console.log(
        `Payment tx succeeded for ${receiver.publicKey}:`,
        paymentResult.hash
      );
      transactions.push({
        amount,
        to: receiver.publicKey,
        hash: paymentResult.hash,
      });
    } catch (error) {
      console.error(
        `Payment tx failed for ${receiver.publicKey}:`,
        error.response?.data || error
      );
      throw error;
    }
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
