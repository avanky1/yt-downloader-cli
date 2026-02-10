const { spawn } = require("child_process");
const path = require("path");
const os = require("os");

const DOWNLOADS_DIR = path.join(os.homedir(), "Downloads");

function downloadVideo(url, formatId, options = {}) {
  return new Promise((resolve, reject) => {
    const outputDir = options.outputDir || DOWNLOADS_DIR;
    const outputTemplate = options.outputTemplate || "%(title)s.%(ext)s";
    const outputPath = path.join(outputDir, outputTemplate);

    const args = [
      "-f",
      formatId,
      "--no-warnings",
      "--no-playlist",
      "--newline",
      "-o",
      outputPath,
      url,
    ];

    console.log("\n📥 Starting download...\n");

    const ytdlp = spawn("yt-dlp", args);

    let lastOutputFile = "";

    ytdlp.stdout.on("data", (data) => {
      const output = data.toString();

      process.stdout.write(output);

      const destMatch = output.match(/Destination:\s*(.+)/);
      if (destMatch) {
        lastOutputFile = destMatch[1].trim();
      }

      const mergeMatch = output.match(/Merging formats into "(.+)"/);
      if (mergeMatch) {
        lastOutputFile = mergeMatch[1].trim();
      }
    });

    ytdlp.stderr.on("data", (data) => {
      const output = data.toString();
      process.stderr.write(output);
    });

    ytdlp.on("error", (err) => {
      if (err.code === "ENOENT") {
        reject(
          new Error(
            "yt-dlp is not installed or not found in PATH.\n" +
              "Install it from: https://github.com/yt-dlp/yt-dlp#installation",
          ),
        );
      } else {
        reject(new Error(`Failed to spawn yt-dlp: ${err.message}`));
      }
    });

    ytdlp.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Download failed with exit code ${code}`));
        return;
      }

      resolve(lastOutputFile || "Download completed");
    });
  });
}

function downloadVideoWithMerge(url, formatId, options = {}) {
  return new Promise((resolve, reject) => {
    const outputDir = options.outputDir || DOWNLOADS_DIR;
    const outputTemplate = options.outputTemplate || "%(title)s.%(ext)s";
    const outputPath = path.join(outputDir, outputTemplate);

    const formatSelector = `${formatId}+bestaudio[ext=m4a]/${formatId}+bestaudio/best`;

    const args = [
      "-f",
      formatSelector,
      "--no-warnings",
      "--no-playlist",
      "--newline",
      "--merge-output-format",
      "mp4",
      "--force-overwrites",
      "-o",
      outputPath,
      url,
    ];

    console.log("\n📥 Starting download...\n");

    const ytdlp = spawn("yt-dlp", args);

    let lastOutputFile = "";

    ytdlp.stdout.on("data", (data) => {
      const output = data.toString();
      process.stdout.write(output);

      const destMatch = output.match(/Destination:\s*(.+)/);
      if (destMatch) {
        lastOutputFile = destMatch[1].trim();
      }

      const mergeMatch = output.match(/Merging formats into "(.+)"/);
      if (mergeMatch) {
        lastOutputFile = mergeMatch[1].trim();
      }

      const alreadyMatch = output.match(
        /\[download\]\s*(.+)\s*has already been downloaded/,
      );
      if (alreadyMatch) {
        lastOutputFile = alreadyMatch[1].trim();
      }
    });

    ytdlp.stderr.on("data", (data) => {
      process.stderr.write(data.toString());
    });

    ytdlp.on("error", (err) => {
      if (err.code === "ENOENT") {
        reject(
          new Error(
            "yt-dlp is not installed or not found in PATH.\n" +
              "Install it from: https://github.com/yt-dlp/yt-dlp#installation",
          ),
        );
      } else {
        reject(new Error(`Failed to spawn yt-dlp: ${err.message}`));
      }
    });

    ytdlp.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Download failed with exit code ${code}`));
        return;
      }

      resolve(lastOutputFile || "Download completed");
    });
  });
}

module.exports = {
  downloadVideo,
  downloadVideoWithMerge,
};
