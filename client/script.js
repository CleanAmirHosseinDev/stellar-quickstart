const BASE_URL = "http://localhost:3000";
const COIN_NAME = "COIN";
const TIMEOUT_MS = 30000; 

function displayMessage(element, message, isError = false) {
  const html = isError
    ? `<span style="color: red;">Error: ${message}</span>`
    : message.includes("Processing") ||
      message.includes("Loading") ||
      message.includes("Clearing")
    ? `<span class="loading">${message}</span>`
    : message;
  element.innerHTML = html;
}

function validateInputs(numReceiversInput, amountsInput) {
  const numReceivers = parseInt(numReceiversInput, 10);
  const amounts = amountsInput
    .split(",")
    .map((num) => parseFloat(num.trim()))
    .filter((num) => !isNaN(num) && num > 0);

  if (isNaN(numReceivers) || numReceivers < 1) {
    return {
      valid: false,
      error: "Number of receivers must be a positive integer (e.g., 1).",
    };
  }

  if (amounts.length === 0) {
    return {
      valid: false,
      error: "Please enter at least one valid positive amount (e.g., 50).",
    };
  }

  if (amounts.length > numReceivers) {
    return {
      valid: false,
      error: `Too many amounts (${amounts.length}) for ${numReceivers} receivers.`,
    };
  }

  return { valid: true, numReceivers, amounts };
}

function formatOutput(data) {
  return `
    <div class="result-section">
      <h2>Issuer</h2>
      <p><strong>Public Key:</strong> ${data.issuer.publicKey}</p>
      <h2>Receivers</h2>
      ${data.receivers
        .map((r) => `<p><strong>${r.id}:</strong> ${r.publicKey}</p>`)
        .join("")}
      <h2>Transactions</h2>
      ${data.transactions
        .map(
          (t) =>
            `<p>Sent <strong>${t.amount} ${COIN_NAME}</strong> to ${t.to.slice(
              0,
              10
            )}... - <strong>Hash:</strong> ${t.hash.slice(0, 10)}...</p>`
        )
        .join("")}
      <h2>Balances</h2>
      ${data.balances
        .map(
          (b) =>
            `<p>${b.publicKey.slice(0, 10)}...: <strong>${
              b.balance
            } ${COIN_NAME}</strong></p>`
        )
        .join("")}
    </div>
  `;
}

function formatHistory(data) {
  return `
    <div class="history-section">
      <h2>Transaction History</h2>
      ${
        data.transactions.length === 0
          ? "<p>No transactions in history.</p>"
          : `
          <table border="1" style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <thead>
              <tr style="background-color: #007bff; color: white;">
                <th style="padding: 8px;">Amount (${COIN_NAME})</th>
                <th style="padding: 8px;">To (Shortened)</th>
                <th style="padding: 8px;">Hash (Shortened)</th>
              </tr>
            </thead>
            <tbody>
              ${data.transactions
                .map(
                  (t) => `
                  <tr>
                    <td style="padding: 8px;">${t.amount}</td>
                    <td style="padding: 8px;">${t.to.slice(0, 10)}...</td>
                    <td style="padding: 8px;">${t.hash.slice(0, 10)}...</td>
                  </tr>
                `
                )
                .join("")}
            </tbody>
          </table>
        `
      }
    </div>
  `;
}

document
  .getElementById("paymentForm")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    const numReceiversInput = document.getElementById("numReceivers").value;
    const amountsInput = document.getElementById("amounts").value;
    const output = document.getElementById("output");

    if (!numReceiversInput || !amountsInput) {
      displayMessage(output, "Please fill in both fields.", true);
      return;
    }

    const validation = validateInputs(numReceiversInput, amountsInput);
    if (!validation.valid) {
      displayMessage(output, validation.error, true);
      return;
    }

    const { numReceivers, amounts } = validation;
    displayMessage(
      output,
      "Processing payments... This may take a moment due to network requests."
    );

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(
        `${BASE_URL}/start?receivers=${numReceivers}&amounts=${amounts.join(
          ","
        )}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `Server error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(`${data.error} - ${JSON.stringify(data.details)}`);
      }

      output.innerHTML = formatOutput(data);
    } catch (error) {
      const errorMessage =
        error.name === "AbortError"
          ? "Request timed out. Please try again later."
          : error.message || "Something went wrong. Check the server logs.";
      displayMessage(output, errorMessage, true);
    }
  });

async function showHistory() {
  const historyDiv = document.getElementById("history");
  displayMessage(historyDiv, "Loading history...");

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(`${BASE_URL}/history`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(
        `Server error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    historyDiv.innerHTML = formatHistory(data);
  } catch (error) {
    const errorMessage =
      error.name === "AbortError"
        ? "Request timed out. Please try again later."
        : error.message || "Failed to load history. Check the server logs.";
    displayMessage(historyDiv, errorMessage, true);
  }
}

async function clearHistory() {
  const historyDiv = document.getElementById("history");
  displayMessage(historyDiv, "Clearing history...");

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(`${BASE_URL}/clear-history`, {
      method: "POST",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(
        `Server error: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();
    displayMessage(historyDiv, result.message);
  } catch (error) {
    const errorMessage =
      error.name === "AbortError"
        ? "Request timed out. Please try again later."
        : error.message || "Failed to clear history. Check the server logs.";
    displayMessage(historyDiv, errorMessage, true);
  }
}
