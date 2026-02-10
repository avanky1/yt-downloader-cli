const { spawn } = require("child_process");

function fetchVideoMetadata(url) {
  return new Promise((resolve, reject) => {
    const args = ["-J", "--no-warnings", "--no-playlist", url];

    const ytdlp = spawn("yt-dlp", args);

    let stdout = "";
    let stderr = "";

    ytdlp.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    ytdlp.stderr.on("data", (data) => {
      stderr += data.toString();
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
