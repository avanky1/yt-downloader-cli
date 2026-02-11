const fs = require("fs");
const path = require("path");
const os = require("os");
const chalk = require("chalk");

const HISTORY_DIR = path.join(os.homedir(), ".ytpull");
const HISTORY_FILE = path.join(HISTORY_DIR, "history.json");

function ensureHistoryDir() {
  if (!fs.existsSync(HISTORY_DIR)) {
    fs.mkdirSync(HISTORY_DIR, { recursive: true });
  }
}

function loadHistory() {
  ensureHistoryDir();
  if (!fs.existsSync(HISTORY_FILE)) {
    return [];
  }
  try {
    const data = fs.readFileSync(HISTORY_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveHistory(history) {
  ensureHistoryDir();
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), "utf-8");
}

function addToHistory(entry) {
  const history = loadHistory();
  history.push({
    url: entry.url,
    videoTitle: entry.videoTitle,
    quality: entry.quality,
    formatId: entry.formatId,
    filePath: entry.filePath || "",
    date: new Date().toISOString(),
  });
  saveHistory(history);
}

function isDuplicate(url, formatId) {
  const history = loadHistory();
  return history.find(
    (entry) => entry.url === url && entry.formatId === formatId,
  );
}

function displayHistory() {
  const history = loadHistory();
  if (history.length === 0) {
    console.log(chalk.yellow("\nNo download history found.\n"));
    return;
  }

  console.log("\n" + chalk.bold("Download History"));
  console.log("=".repeat(70));

  history.forEach((entry, index) => {
    const num = (index + 1).toString().padStart(3, " ");
    const date = new Date(entry.date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    console.log(
      `\n  ${chalk.cyan(num)}. ${chalk.white(entry.videoTitle || "Unknown")}`,
    );
    console.log(`       Quality: ${entry.quality}  |  Date: ${date}`);
    console.log(`       URL: ${chalk.dim(entry.url)}`);
    if (entry.filePath) {
      console.log(`       File: ${chalk.dim(entry.filePath)}`);
    }
  });

  console.log("\n" + "=".repeat(70));
  console.log(chalk.dim(`  Total: ${history.length} downloads\n`));
}

function clearHistory() {
  saveHistory([]);
  console.log(chalk.green("\nDownload history cleared.\n"));
}

module.exports = {
  loadHistory,
  saveHistory,
  addToHistory,
  isDuplicate,
  displayHistory,
  clearHistory,
};
