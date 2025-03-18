const { Keypair } = require("stellar-sdk");

function createAccounts(numReceivers = 3) {
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
