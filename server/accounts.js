const { Keypair } = require("stellar-sdk");

/**
 * ایجاد حساب‌های تصادفی در شبکه استلار
 * @param {number} numReceivers - تعداد حساب‌های دریافتی (گیرندگان)
 * @returns {Object} - شامل کلیدهای عمومی و خصوصی صادرکننده و گیرندگان
 * @throws {Error} - اگر تعداد گیرندگان معتبر نباشد
 */
function createAccounts(numReceivers) {
  // اعتبارسنجی ورودی
  if (!Number.isInteger(numReceivers)) {
    throw new TypeError("Number of receivers must be an integer");
  }
  if (numReceivers < 1) {
    throw new RangeError("Number of receivers must be at least 1");
  }

  console.log("Creating accounts with numReceivers:", numReceivers);

  // ایجاد کلیدهای تصادفی برای صادرکننده و گیرندگان
  const issuer = Keypair.random();
  const receivers = Array.from({ length: numReceivers }, (_, index) => {
    const keypair = Keypair.random();
    return {
      id: `Receiver ${index + 1}`,
      publicKey: keypair.publicKey(),
      secretKey: keypair.secret(),
    };
  });

  return {
    issuer: {
      publicKey: issuer.publicKey(),
      secretKey: issuer.secret(),
    },
    receivers,
  };
}

module.exports = { createAccounts };
