const { Keypair } = require("stellar-sdk");

function createAccounts(numReceivers) {
  if (!Number.isInteger(numReceivers) || numReceivers < 1) {
    throw new Error("Number of receivers must be a positive integer");
  }
  console.log("Creating accounts with numReceivers:", numReceivers);
  const issuer = Keypair.random();
  const receivers = Array.from({ length: numReceivers }, () =>
    Keypair.random()
  );
  return {
    issuer: { publicKey: issuer.publicKey(), secretKey: issuer.secret() },
    receivers: receivers.map((kp, i) => ({
      id: `Receiver ${i + 1}`,
      publicKey: kp.publicKey(),
      secretKey: kp.secret(),
    })),
  };
}

module.exports = { createAccounts };
