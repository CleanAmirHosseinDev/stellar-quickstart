document
  .getElementById("paymentForm")
  .addEventListener("submit", async (event) => {
    event.preventDefault();
    const numReceivers = document.getElementById("numReceivers").value;
    const amounts = document
      .getElementById("amounts")
      .value.split(",")
      .map(Number);
    const output = document.getElementById("output");
    output.innerHTML = "Processing payments...";

    try {
      const response = await fetch(
        `http://localhost:3000/start?receivers=${numReceivers}&amounts=${amounts.join(
          ","
        )}`
      );
      const data = await response.json();

      output.innerHTML = `
      <h2>Issuer</h2>
      <p>Public Key: ${data.issuer.publicKey}</p>
      <h2>Receivers</h2>
      ${data.receivers.map((r) => `<p>${r.id}: ${r.publicKey}</p>`).join("")}
      <h2>Transactions</h2>
      ${data.transactions
        .map((t) => `<p>Sent ${t.amount} COIN to ${t.to} - Hash: ${t.hash}</p>`)
        .join("")}
      <h2>Balances</h2>
      ${data.balances
        .map((b) => `<p>${b.publicKey}: ${b.balance} COIN</p>`)
        .join("")}
    `;
    } catch (error) {
      output.innerHTML = `Error: ${error.message}`;
    }
  });

async function showHistory() {
  console.log("Show History clicked!");
  const historyDiv = document.getElementById("history");
  historyDiv.innerHTML = "Loading history...";

  try {
    const response = await fetch("http://localhost:3000/history");
    const data = await response.json();

    historyDiv.innerHTML = `
      <h2>Transaction History</h2>
      ${data.transactions
        .map((t) => `<p>Sent ${t.amount} COIN to ${t.to} - Hash: ${t.hash}</p>`)
        .join("")}
    `;
  } catch (error) {
    historyDiv.innerHTML = `Error: ${error.message}`;
  }
}
