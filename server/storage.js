const fs = require("fs").promises;

async function saveData(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

async function logTransaction(filePath, message) {
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} - ${message}\n`;
  await fs.appendFile(filePath, logEntry);
}

module.exports = { saveData, logTransaction };
