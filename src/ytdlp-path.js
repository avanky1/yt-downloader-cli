const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function getYtdlpPath() {
  const localBinaryName =
    process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
  const localPath = path.join(__dirname, "..", "bin", localBinaryName);

  if (fs.existsSync(localPath)) {
    return localPath;
  }

  try {
    execSync("yt-dlp --version", { stdio: "ignore" });
    return "yt-dlp";
  } catch {
    return null;
  }
}

module.exports = { getYtdlpPath };
