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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * تأمین اعتبار حساب‌ها با استفاده از Friendbot
 * @param {Object} accounts - شامل کلیدهای عمومی و خصوصی صادرکننده و گیرندگان
 */
async function fundAccounts(accounts) {
  console.log("Funding accounts:", accounts);
  const publicKeys = [
    accounts.issuer.publicKey,
    ...accounts.receivers.map((r) => r.publicKey),
  ];

  const fundResponses = await Promise.all(
    publicKeys.map(async (key) => {
      try {
        await server.loadAccount(key);
        console.log(`Account ${key} already exists and is funded.`);
        return true;
      } catch (error) {
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
      }
    })
  );

  if (!fundResponses.every((status) => status)) {
    throw new Error("Failed to fund one or more accounts with Friendbot");
  }
}

/**
 * بررسی وجود Trustline برای یک دارایی
 * @param {string} receiverPublicKey - کلید عمومی حساب گیرنده
 * @param {Asset} asset - دارایی مورد بررسی
 * @returns {Promise<boolean>} - آیا Trustline وجود دارد یا نه
 */
async function hasTrustline(receiverPublicKey, asset) {
  const account = await server.loadAccount(receiverPublicKey);
  return account.balances.some(
    (b) =>
      b.asset_code === asset.getCode() && b.asset_issuer === asset.getIssuer()
  );
}

/**
 * ارسال پرداخت‌ها به حساب‌های گیرنده
 * @param {Object} issuer - اطلاعات صادرکننده
 * @param {Array} receivers - لیست گیرندگان
 * @param {Array} amounts - مقادیر پرداختی
 * @param {string} assetCode - کد دارایی (پیش‌فرض: "COIN")
 * @returns {Promise<Array>} - لیست تراکنش‌های انجام شده
 */
async function sendPayments(issuer, receivers, amounts, assetCode = "COIN") {
  console.log("Sending payments with amounts:", amounts);
  const issuerAccount = await server.loadAccount(issuer.publicKey);
  console.log("Issuer account loaded:", issuerAccount.id);
  const asset = new Asset(assetCode, issuer.publicKey); // استفاده از assetCode
  const transactions = [];

  for (const [i, receiver] of receivers.entries()) {
    const amount = amounts[i].toString();
    console.log(
      `Processing payment to ${receiver.publicKey} for ${amount} ${assetCode}`
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

    if (!(await hasTrustline(receiver.publicKey, asset))) {
      const trustTx = new TransactionBuilder(receiverAccount, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          Operation.changeTrust({
            asset: asset,
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
        await delay(5000); // تأخیر 5 ثانیه
      } catch (error) {
        console.error(
          `Trust tx failed for ${receiver.publicKey}:`,
          error.response?.data || error
        );
        throw error;
      }
    }

    const paymentTx = new TransactionBuilder(issuerAccount, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.payment({
          destination: receiver.publicKey,
          asset: asset,
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

/**
 * دریافت موجودی حساب‌ها
 * @param {Array} publicKeys - لیست کلیدهای عمومی حساب‌ها
 * @returns {Promise<Array>} - لیست موجودی‌ها
 */
async function getBalances(publicKeys) {
  const balances = await Promise.all(
    publicKeys.map(async (key) => {
      const account = await server.loadAccount(key);
      const coinBalance =
        account.balances.find((b) => b.asset_code === "COIN")?.balance || "0";
      const nativeBalance =
        account.balances.find((b) => b.asset_type === "native")?.balance || "0";
      const propertyBalance =
        account.balances.find((b) => b.asset_code === "PROPERTY")?.balance ||
        "0";
      return {
        publicKey: key,
        COIN: coinBalance,
        XLM: nativeBalance,
        PROPERTY: propertyBalance,
      };
    })
  );
  return balances;
}

/**
 * ایجاد یک دارایی جدید (توکن‌سازی ملک)
 * @param {string} issuerSecret - کلید خصوصی صادرکننده
 * @param {string} assetCode - کد دارایی (مثلاً "PROPERTY")
 * @param {string} amount - مقدار دارایی برای صدور
 * @returns {Promise<Object>} - نتیجه تراکنش
 */
async function createPropertyAsset(issuerSecret, assetCode, amount) {
  const issuerKeypair = Keypair.fromSecret(issuerSecret);
  const issuerAccount = await server.loadAccount(issuerKeypair.publicKey());

  // ایجاد دارایی جدید
  const asset = new Asset(assetCode, issuerKeypair.publicKey());

  // ایجاد تراکنش برای صدور دارایی
  const transaction = new TransactionBuilder(issuerAccount, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.payment({
        destination: issuerKeypair.publicKey(), // واریز به حساب خود صادرکننده
        asset: asset,
        amount: amount,
      })
    )
    .setTimeout(30)
    .build();

  transaction.sign(issuerKeypair);
  const result = await server.submitTransaction(transaction);
  return result;
}

/**
 * واریز توکن‌های ملک به یک حساب
 * @param {string} issuerSecret - کلید خصوصی صادرکننده
 * @param {string} destinationPublicKey - کلید عمومی حساب مقصد
 * @param {string} assetCode - کد دارایی (مثلاً "PROPERTY")
 * @param {string} amount - مقدار دارایی برای واریز
 * @returns {Promise<Object>} - نتیجه تراکنش
 */
async function depositPropertyToken(
  issuerSecret,
  destinationPublicKey,
  assetCode,
  amount
) {
  const issuerKeypair = Keypair.fromSecret(issuerSecret);
  const issuerAccount = await server.loadAccount(issuerKeypair.publicKey());

  // ایجاد دارایی
  const asset = new Asset(assetCode, issuerKeypair.publicKey());

  // ایجاد تراکنش واریز
  const transaction = new TransactionBuilder(issuerAccount, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.payment({
        destination: destinationPublicKey,
        asset: asset,
        amount: amount,
      })
    )
    .setTimeout(30)
    .build();

  transaction.sign(issuerKeypair);
  const result = await server.submitTransaction(transaction);
  return result;
}

/**
 * برداشت توکن‌های ملک از یک حساب
 * @param {string} sourceSecret - کلید خصوصی حساب مبدأ
 * @param {string} issuerPublicKey - کلید عمومی صادرکننده
 * @param {string} assetCode - کد دارایی (مثلاً "PROPERTY")
 * @param {string} amount - مقدار دارایی برای برداشت
 * @returns {Promise<Object>} - نتیجه تراکنش
 */
async function withdrawPropertyToken(
  sourceSecret,
  issuerPublicKey,
  assetCode,
  amount
) {
  const sourceKeypair = Keypair.fromSecret(sourceSecret);
  const sourceAccount = await server.loadAccount(sourceKeypair.publicKey());

  // ایجاد دارایی
  const asset = new Asset(assetCode, issuerPublicKey);

  // ایجاد تراکنش برداشت
  const transaction = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.payment({
        destination: issuerPublicKey, // واریز به حساب صادرکننده
        asset: asset,
        amount: amount,
      })
    )
    .setTimeout(30)
    .build();

  transaction.sign(sourceKeypair);
  const result = await server.submitTransaction(transaction);
  return result;
}

module.exports = {
  fundAccounts,
  sendPayments,
  getBalances,
  createPropertyAsset,
  depositPropertyToken,
  withdrawPropertyToken,
};
