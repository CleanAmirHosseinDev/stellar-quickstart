const express = require("express");
const { createAccounts } = require("./accounts");
const { fundAccounts, sendPayments, getBalances } = require("./transactions");
const { saveData, logTransaction } = require("./storage");
const path = require("path");
const fs = require("fs").promises;

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, "../client")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../client", "index.html"));
});

app.get("/favicon.ico", (req, res) => res.status(204).end());

app.get("/start", async (req, res) => {
  try {
    const numReceivers = parseInt(req.query.receivers) || 3;
    const amounts = req.query.amounts
      ? req.query.amounts.split(",").map(Number)
      : [50, 30, 20];

    console.log("Starting payment process...");
    console.log("Num Receivers:", numReceivers);
    console.log("Amounts:", amounts);

    const accounts = createAccounts(numReceivers);
    await fundAccounts(accounts);
    await logTransaction(
      path.join(__dirname, "../data/logs.txt"),
      "Accounts funded with test XLM"
    );

    const transactions = await sendPayments(
      accounts.issuer,
      accounts.receivers,
      amounts.length === numReceivers
        ? amounts
        : amounts
            .slice(0, numReceivers)
            .concat(Array(numReceivers - amounts.length).fill(0))
    );
    await logTransaction(
      path.join(__dirname, "../data/logs.txt"),
      "Payments completed"
    );

    const balances = await getBalances([
      accounts.issuer.publicKey,
      ...accounts.receivers.map((r) => r.publicKey),
    ]);

    const data = {
      issuer: accounts.issuer,
      receivers: accounts.receivers,
      transactions,
      balances,
    };
    await saveData(path.join(__dirname, "../data/payments.json"), data);

    res.json(data);
  } catch (error) {
    console.error("Error in /start:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/history", async (req, res) => {
  try {
    const data = await fs.readFile(
      path.join(__dirname, "../data/payments.json"),
      "utf8"
    );
    res.json(JSON.parse(data));
  } catch (error) {
    res.status(500).json({ error: "No history available" });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
