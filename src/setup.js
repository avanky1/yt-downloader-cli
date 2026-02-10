#!/usr/bin/env node

const https = require("https");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const YTDLP_RELEASES_URL =
  "https://github.com/yt-dlp/yt-dlp/releases/latest/download";

function getBinaryName() {
  const platform = process.platform;
  if (platform === "win32") return "yt-dlp.exe";
  if (platform === "darwin") return "yt-dlp_macos";
  return "yt-dlp_linux";
}

function getLocalBinaryPath() {
  const binDir = path.join(__dirname, "..", "bin");
  const binaryName = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
  return path.join(binDir, binaryName);
}

function isYtdlpInstalled() {
  try {
    execSync("yt-dlp --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);

    const request = (url) => {
      https
        .get(url, (response) => {
          if (response.statusCode === 302 || response.statusCode === 301) {
            request(response.headers.location);
            return;
          }

          if (response.statusCode !== 200) {
            reject(
              new Error(`Failed to download: HTTP ${response.statusCode}`),
            );
            return;
          }

          response.pipe(file);

          file.on("finish", () => {
            file.close();
            resolve();
          });
        })
        .on("error", (err) => {
          fs.unlink(dest, () => {});
          reject(err);
        });
    };

    request(url);
  });
}

async function setup() {
  console.log("ytpull: Checking for yt-dlp...");

  if (isYtdlpInstalled()) {
    console.log("ytpull: yt-dlp is already installed on your system.");
    return;
  }

  console.log("ytpull: yt-dlp not found. Downloading...");

  const binaryName = getBinaryName();
  const downloadUrl = `${YTDLP_RELEASES_URL}/${binaryName}`;
  const localPath = getLocalBinaryPath();

  const binDir = path.dirname(localPath);
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  try {
    await downloadFile(downloadUrl, localPath);

    if (process.platform !== "win32") {
      fs.chmodSync(localPath, 0o755);
    }

    console.log(`ytpull: yt-dlp downloaded successfully to ${localPath}`);
  } catch (err) {
    console.error(`ytpull: Failed to download yt-dlp: ${err.message}`);
    console.error("ytpull: Please install yt-dlp manually:");
    console.error("  - pip install yt-dlp");
    console.error("  - brew install yt-dlp (macOS)");
    console.error("  - winget install yt-dlp (Windows)");
    console.error("  - https://github.com/yt-dlp/yt-dlp#installation");
  }
}

module.exports = { getLocalBinaryPath, isYtdlpInstalled };

if (require.main === module) {
  setup();
}
