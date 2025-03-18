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
    const numReceivers = parseInt(req.query.receivers);
    const amounts = req.query.amounts
      ? req.query.amounts.split(",").map(Number)
      : [];

    console.log("Starting payment process...");
    console.log("Raw numReceivers:", req.query.receivers);
    console.log("Parsed numReceivers:", numReceivers);
    console.log("Raw amounts:", req.query.amounts);
    console.log("Parsed amounts:", amounts);

    if (isNaN(numReceivers) || numReceivers < 1) {
      throw new Error("Number of receivers must be a positive integer");
    }

    const accounts = createAccounts(numReceivers);
    console.log("Accounts:", JSON.stringify(accounts, null, 2));

    await fundAccounts(accounts);
    await logTransaction(
      path.join(__dirname, "../data/logs.txt"),
      "Accounts funded with test XLM"
    );

    let adjustedAmounts = amounts.slice(0, numReceivers);
    if (adjustedAmounts.length < numReceivers) {
      adjustedAmounts = adjustedAmounts.concat(
        Array(numReceivers - adjustedAmounts.length).fill(0)
      );
    }
    console.log("Adjusted amounts:", adjustedAmounts);

    const transactions = await sendPayments(
      accounts.issuer,
      accounts.receivers,
      adjustedAmounts
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
    // ارسال جزئیات خطا به کلاینت
    res.status(500).json({
      error: error.message,
      details: error.response?.data || "No additional details available",
    });
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

app.post("/clear-history", async (req, res) => {
  try {
    await fs.writeFile(
      path.join(__dirname, "../data/payments.json"),
      JSON.stringify({ transactions: [] })
    );
    await fs.writeFile(path.join(__dirname, "../data/logs.txt"), "");
    res.json({ message: "History cleared successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
