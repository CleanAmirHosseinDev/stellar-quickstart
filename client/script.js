const BASE_URL = "http://localhost:3000";
const TIMEOUT_MS = 30000;
const transactionsPerPage = 25;

let currentPage = 1;
let totalTransactions = 0;

document
  .getElementById("paymentForm")
  .addEventListener("submit", handleFormSubmit);
document.getElementById("themeSelect").addEventListener("change", changeTheme);

window.onload = initializePage;

async function handleFormSubmit(event) {
  event.preventDefault();

  const numReceivers = document.getElementById("numReceivers").value;
  const amounts = document
    .getElementById("amounts")
    .value.split(",")
    .map((amount) => {
      return amount.replace(/,/g, "");
    });
  const output = document.getElementById("output");

  showLoader();

  try {
    const data = await fetchTransactionData(numReceivers, amounts);
    hideLoader();
    displayTransactionData(output, data);
    loadTransactionHistory();
  } catch (error) {
    hideLoader();
    showError(output, error.message);
  }
}

async function fetchTransactionData(numReceivers, amounts) {
  const response = await fetch(
    `${BASE_URL}/start?receivers=${numReceivers}&amounts=${amounts.join(",")}`
  );
  return await response.json();
}

function showLoader() {
  const overlay = document.createElement("div");
  overlay.classList.add("overlay");
  const loader = document.createElement("div");
  loader.classList.add("loader");
  overlay.appendChild(loader);
  document.body.appendChild(overlay);
}

function hideLoader() {
  const overlay = document.querySelector(".overlay");
  if (overlay) {
    document.body.removeChild(overlay);
  }
}

function showError(output, errorMessage) {
  output.innerHTML = `<p style="color: red;">❌ Error: ${errorMessage}</p>`;
}

function displayTransactionData(output, data) {
  output.innerHTML = `
    <h2>Issuer</h2>
    <p><strong>Public Key:</strong> ${data.issuer.publicKey}</p>

    <h2>Receivers</h2>
    ${generateTable(data.receivers, ["ID", "Public Key"])}

    <h2>Transactions</h2>
    ${generateTable(data.transactions, [
      "Amount",
      "To",
      "Transaction Hash",
      "Time",
      "Txn Fee",
    ])}

    <h2>Balances</h2>
    ${generateTable(data.balances, ["Public Key", "Balance"])}
  `;
}

function generateTable(data, headers) {
  return `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            ${headers.map((header) => `<th>${header}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${data
            .map(
              (row) => `
            <tr>
              ${Object.values(row)
                .map((value) => `<td>${value}</td>`)
                .join("")}
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function changeTheme(event) {
  const theme = event.target.value;
  setThemeMode(theme);
}

function setThemeMode(theme) {
  document.body.classList.remove("light-theme", "dark-theme", "dim-theme");
  document.body.classList.add(`${theme}-theme`);
  localStorage.setItem("theme", theme);
}

function formatAmounts(event) {
  const input = event.target;
  const raw = input.value;
  const parts = raw.split(",").map((p) => p.trim());

  const formatted = parts.map((part) => {
    let clean = part.replace(/[^0-9.]/g, "");

    const subparts = clean.split(".");
    if (subparts.length > 2) {
      clean = subparts[0] + "." + subparts.slice(1).join("");
    }

    if (subparts.length === 2) {
      subparts[1] = subparts[1].substring(0, 7);
      clean = subparts[0] + "." + subparts[1];
    }

    return clean;
  });

  input.value = formatted.join(", ");
}

function formatNumber(number) {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

async function loadTransactionHistory() {
  const historyDiv = document.getElementById("history");
  historyDiv.innerHTML = "Loading history...";

  try {
    const data = await fetchTransactionHistory();
    totalTransactions = data.total;
    updateHistoryUI(historyDiv, data.transactions);
  } catch (error) {
    historyDiv.innerHTML = `Error: ${error.message}`;
  }
}

async function fetchTransactionHistory() {
  const response = await fetch(
    `${BASE_URL}/history?page=${currentPage}&limit=${transactionsPerPage}`
  );
  return await response.json();
}

function updateHistoryUI(historyDiv, transactions) {
  historyDiv.innerHTML = `
    <h2>Transaction History</h2>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Amount</th>
            <th>To</th>
            <th>Hash</th>
            <th>Method</th>
            <th>Block</th>
            <th>Age</th>
            <th>Txn Fee</th>
          </tr>
        </thead>
        <tbody>
          ${transactions
            .map(
              (tx) => `
            <tr>
              <td>${formatNumber(tx.amount)}</td>
              <td>${tx.to.slice(0, 10)}...</td>
              <td>${tx.hash.slice(0, 10)}...</td>
              <td>${tx.method}</td>
              <td>${tx.block}</td>
              <td>${tx.age}</td>
              <td>${tx.txnFee}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>

    <div id="pagination">
      <p>Latest ${transactionsPerPage} from a total of ${totalTransactions} transactions</p>
      <button id="prevPage" ${currentPage === 1 ? "disabled" : ""}>Prev</button>
      <button id="nextPage" ${
        currentPage * transactionsPerPage >= totalTransactions ? "disabled" : ""
      }>Next</button>
    </div>
  `;

  document
    .getElementById("prevPage")
    .addEventListener("click", () => changePage(currentPage - 1));
  document
    .getElementById("nextPage")
    .addEventListener("click", () => changePage(currentPage + 1));
}

function changePage(page) {
  currentPage = page;
  loadTransactionHistory();
}

function initializePage() {
  const savedTheme = localStorage.getItem("theme") || "light";
  setThemeMode(savedTheme);
  document.getElementById("themeSelect").value = savedTheme;

  loadTransactionHistory();
}
