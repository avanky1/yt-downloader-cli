const { spawn } = require("child_process");
const { getYtdlpPath } = require("./ytdlp-path");

function fetchVideoMetadata(url) {
  return new Promise((resolve, reject) => {
    const ytdlpBin = getYtdlpPath();

    if (!ytdlpBin) {
      reject(
        new Error(
          "yt-dlp is not installed.\n" +
            "Run: npm install -g ytpull (to auto-download yt-dlp)\n" +
            "Or install manually: pip install yt-dlp",
        ),
      );
      return;
    }

    const args = ["-J", "--no-warnings", "--no-playlist", url];

    const ytdlp = spawn(ytdlpBin, args);

    let stdout = "";
    let stderr = "";

    ytdlp.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    ytdlp.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    ytdlp.on("error", (err) => {
      reject(new Error(`Failed to run yt-dlp: ${err.message}`));
    });

    ytdlp.on("close", (code) => {
      if (code !== 0) {
        const errorMsg = stderr.trim() || `yt-dlp exited with code ${code}`;
        reject(new Error(`yt-dlp error: ${errorMsg}`));
        return;
      }

      try {
        const metadata = JSON.parse(stdout);
        resolve(metadata);
      } catch (parseErr) {
        reject(
          new Error(`Failed to parse yt-dlp JSON output: ${parseErr.message}`),
        );
      }
    });
  });
}

module.exports = {
  fetchVideoMetadata,
};
