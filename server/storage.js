const fs = require("fs").promises;

/**
 * ذخیره‌سازی داده‌ها در یک فایل JSON
 * @param {string} filePath - مسیر فایل
 * @param {Object} data - داده‌هایی که باید ذخیره شوند
 */
async function saveData(filePath, data) {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    console.log(`Data saved successfully to ${filePath}`);
  } catch (error) {
    console.error(`Error saving data to ${filePath}:`, error);
    throw error;
  }
}

/**
 * ثبت یک لاگ در فایل
 * @param {string} filePath - مسیر فایل لاگ
 * @param {string} message - پیام لاگ
 */
async function logTransaction(filePath, message) {
  try {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} - ${message}\n`;
    await fs.appendFile(filePath, logEntry);
    console.log(`Log entry added: ${message}`);
  } catch (error) {
    console.error(`Error logging transaction to ${filePath}:`, error);
    throw error;
  }
}

module.exports = { saveData, logTransaction };
