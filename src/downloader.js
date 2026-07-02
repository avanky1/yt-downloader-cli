const { spawn } = require("child_process");
const path = require("path");
const os = require("os");
const chalk = require("chalk");
const { getYtdlpPath } = require("./ytdlp-path");

const DOWNLOADS_DIR = path.join(os.homedir(), "Downloads");
const BAR_WIDTH = 30;
const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const SPEED_BUFFER_SIZE = 5;

function renderProgressBar(percent) {
  const clamped = Math.min(100, Math.max(0, percent));
  const filled = Math.round((clamped / 100) * BAR_WIDTH);
  const empty = BAR_WIDTH - filled;
  return chalk.green("█".repeat(filled)) + chalk.gray("░".repeat(empty));
}

function formatProgress(percent, totalSize, speed, eta) {
  const bar = renderProgressBar(percent);
  const pct = chalk.cyan(String(percent).padStart(5) + "%");
  const size = chalk.white(totalSize || "???");
  const spd = chalk.yellow(speed || "---");
  const etaStr = chalk.magenta(eta || "--:--");
  return `  ${bar} ${pct}  of ${size}  at ${spd}  ETA ${etaStr}`;
}

function parseSpeedToBytes(speedStr) {
  if (!speedStr || speedStr === "---" || speedStr === "Unknown") return null;
  const match = speedStr.match(/([\d.]+)\s*(B|KiB|MiB|GiB|KB|MB|GB)/i);
  if (!match) return null;
  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = {
    b: 1,
    kib: 1024,
    mib: 1024 * 1024,
    gib: 1024 * 1024 * 1024,
    kb: 1000,
    mb: 1000000,
    gb: 1000000000,
  };
  return value * (multipliers[unit] || 1);
}

function formatBytesSpeed(bytes) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)}MiB/s`;
  } else if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(2)}KiB/s`;
  }
  return `${Math.round(bytes)}B/s`;
}

function getSmoothedSpeed(speedStr, speedBuffer) {
  const bytes = parseSpeedToBytes(speedStr);
  if (bytes === null) return speedStr;

  speedBuffer.push(bytes);
  if (speedBuffer.length > SPEED_BUFFER_SIZE) {
    speedBuffer.shift();
  }

  const avg = speedBuffer.reduce((a, b) => a + b, 0) / speedBuffer.length;
  return formatBytesSpeed(avg);
}

function isNoisyLine(line) {
  const trimmed = line.trim();
  const noisePatterns = [
    /^\[youtube\]/,
    /^\[info\]/,
    /^\[download\]\s*Destination:/,
    /^\[Merger\]/,
    /^Deleting original file/,
    /^\[download\]\s*Downloading/,
    /^\[ExtractAudio\]/,
    /^\[FixupM3u8\]/,
    /^\[Fixup\]/,
    /^\[generic\]/,
    /^\[download\]\s+\d+\.\d+%/,
  ];
  return noisePatterns.some((pattern) => pattern.test(trimmed));
}

function isHarmlessStderr(line) {
  const trimmed = line.trim();
  if (!trimmed) return true;
  const harmlessPatterns = [
    /WARNING.*cookie/i,
    /WARNING.*cache/i,
    /WARNING.*Falling back/i,
    /WARNING.*Retrying/i,
    /WARNING.*Unable to extract/i,
  ];
  return harmlessPatterns.some((p) => p.test(trimmed));
}

function startSpinner(message) {
  let frame = 0;
  const interval = setInterval(() => {
    const spinner = chalk.cyan(SPINNER_FRAMES[frame % SPINNER_FRAMES.length]);
    process.stdout.write(`\r  ${spinner} ${chalk.dim(message)}`);
    frame++;
  }, 80);
  return interval;
}

function stopSpinner(interval) {
  if (interval) {
    clearInterval(interval);
    process.stdout.write("\r" + " ".repeat(60) + "\r");
  }
}

function calculateWeights(videoSize, audioSize) {
  if (videoSize > 0 && audioSize > 0) {
    const total = videoSize + audioSize;
    return { videoWeight: videoSize / total, audioWeight: audioSize / total };
  }
  return { videoWeight: 0.95, audioWeight: 0.05 };
}

function handleStdout(data, state) {
  const output = data.toString();
  const lines = output.split(/\r?\n/);

  for (const line of lines) {
    if (!line.trim()) continue;

    const destMatch = line.match(/Destination:\s*(.+)/);
    if (destMatch) {
      state.lastOutputFile = destMatch[1].trim();
      state.streamCount++;
    }

    const mergeMatch = line.match(/Merging formats into "(.+)"/);
    if (mergeMatch) {
      state.lastOutputFile = mergeMatch[1].trim();
      stopSpinner(state.spinnerInterval);
      state.spinnerInterval = null;
      state.isMerging = false;

      const doneLine = formatProgress(
        100,
        state.lastTotalSize || "???",
        "Done",
        "00:00",
      );
      process.stdout.write(`\r${doneLine}\n`);
      state.isProgress = false;
    }

    const alreadyMatch = line.match(
      /\[download\]\s*(.+)\s*has already been downloaded/,
    );
    if (alreadyMatch) {
      state.lastOutputFile = alreadyMatch[1].trim();
    }

    const progressMatch = line.match(
      /\[download\]\s+([\d.]+)%\s+of\s+~?([\d.]+\S+)\s+at\s+([\d.]+\S+|Unknown\s*\S*)\s+ETA\s+(\S+)/,
    );

    if (progressMatch) {
      const rawPercent = parseFloat(progressMatch[1]);
      const totalSize = progressMatch[2];
      const rawSpeed = progressMatch[3];
      const eta = progressMatch[4];

      state.lastTotalSize = totalSize;

      const smoothedSpeed = rawSpeed.startsWith("Unknown")
        ? "---"
        : getSmoothedSpeed(rawSpeed, state.speedBuffer);

      let displayPercent;
      if (state.isSingleStream) {
        displayPercent = Math.round(rawPercent);
      } else if (state.streamCount === 1) {
        displayPercent = Math.round(rawPercent * state.weights.videoWeight);
      } else if (state.streamCount >= 2) {
        const audioBase = Math.round(state.weights.videoWeight * 100);
        const audioRange = 100 - audioBase;
        displayPercent = Math.min(
          audioBase + Math.round((rawPercent / 100) * audioRange),
          99,
        );
      } else {
        displayPercent = Math.round(rawPercent);
      }

      displayPercent = Math.min(
        displayPercent,
        state.isSingleStream ? 100 : 99,
      );

      const progressLine = formatProgress(
        displayPercent,
        totalSize,
        smoothedSpeed,
        eta,
      );
      process.stdout.write(`\r${progressLine}`);

      state.isProgress = true;
      continue;
    }

    const doneMatch = line.match(/\[download\]\s+100%\s+of\s+~?([\d.]+\S+)/);
    if (doneMatch) {
      state.lastTotalSize = doneMatch[1];

      if (state.isSingleStream || state.streamCount >= 2) {
        const progressLine = formatProgress(100, doneMatch[1], "Done", "00:00");
        process.stdout.write(`\r${progressLine}\n`);
        state.isProgress = false;
      } else {
        const videoEndPercent = Math.round(state.weights.videoWeight * 100);
        const progressLine = formatProgress(
          videoEndPercent,
          doneMatch[1],
          "---",
          "--:--",
        );
        process.stdout.write(`\r${progressLine}`);

        state.spinnerInterval = startSpinner("Merging video + audio...");
        state.isMerging = true;
        state.isProgress = false;

        state.singleStreamTimer = setTimeout(() => {
          if (state.streamCount <= 1 && !state.isSingleStream) {
            state.isSingleStream = true;
            stopSpinner(state.spinnerInterval);
            state.spinnerInterval = null;
            const finalLine = formatProgress(
              100,
              doneMatch[1],
              "Done",
              "00:00",
            );
            process.stdout.write(`\r${finalLine}\n`);
          }
        }, 3000);
      }

      state.speedBuffer = [];
      continue;
    }

    if (isNoisyLine(line)) {
      continue;
    }

    if (state.isProgress) {
      process.stdout.write("\n");
      state.isProgress = false;
    }
    console.log(chalk.dim(line));
  }
}

function downloadVideoWithMerge(url, formatId, options = {}) {
  return new Promise((resolve, reject) => {
    const outputDir = options.outputDir || DOWNLOADS_DIR;
    const outputTemplate = options.outputTemplate || "%(title)s.%(ext)s";
    const outputPath = path.join(outputDir, outputTemplate);

    const videoSize = options.videoSize || 0;
    const audioSize = options.audioSize || 0;

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

    const formatSelector = `${formatId}+bestaudio[ext=m4a]/${formatId}+bestaudio/best`;

    const args = [
      "-f",
      formatSelector,
      "--no-warnings",
      "--newline",
      "--merge-output-format",
      "mp4",
      "--force-overwrites",
      "-o",
      outputPath,
      url,
    ];

    console.log(chalk.dim("\nStarting download...\n"));

    const ytdlp = spawn(ytdlpBin, args);

    const weights = calculateWeights(videoSize, audioSize);
    const state = {
      lastOutputFile: "",
      isProgress: false,
      streamCount: 0,
      isSingleStream: false,
      isMerging: false,
      spinnerInterval: null,
      singleStreamTimer: null,
      speedBuffer: [],
      weights,
      lastTotalSize: "",
    };

    let stderrBuffer = "";

    ytdlp.stdout.on("data", (data) => handleStdout(data, state));

    ytdlp.stderr.on("data", (data) => {
      const text = data.toString();
      if (!isHarmlessStderr(text)) {
        stderrBuffer += text;
      }
    });

    ytdlp.on("error", (err) => {
      stopSpinner(state.spinnerInterval);
      clearTimeout(state.singleStreamTimer);
      reject(new Error(`Failed to run yt-dlp: ${err.message}`));
    });

    ytdlp.on("close", (code) => {
      stopSpinner(state.spinnerInterval);
      clearTimeout(state.singleStreamTimer);

      if (state.isProgress || state.isMerging) {
        const doneLine = formatProgress(
          100,
          state.lastTotalSize || "???",
          "Done",
          "00:00",
        );
        process.stdout.write(`\r${doneLine}\n`);
      }

      if (code !== 0) {
        let errorMsg = `Download failed with exit code ${code}`;
        if (stderrBuffer.trim()) {
          errorMsg += "\n" + chalk.red(stderrBuffer.trim());
        }
        reject(new Error(errorMsg));
        return;
      }

      resolve(state.lastOutputFile || "Download completed");
    });
  });
}

function downloadPlaylist(url, formatId, options = {}) {
  return new Promise((resolve, reject) => {
    const outputDir = options.outputDir || DOWNLOADS_DIR;
    const outputTemplate =
      options.outputTemplate || "%(playlist_title)s/%(title)s.%(ext)s";
    const outputPath = path.join(outputDir, outputTemplate);

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

    // For playlist, use the selected format for all videos
    const formatSelector = `${formatId}+bestaudio[ext=m4a]/${formatId}+bestaudio/best`;

    const args = [
      "-f",
      formatSelector,
      "--no-warnings",
      "--newline",
      "--merge-output-format",
      "mp4",
      "--force-overwrites",
      "--yes-playlist",
      "-o",
      outputPath,
      url,
    ];

    console.log(chalk.dim("\nStarting playlist download...\n"));

    const ytdlp = spawn(ytdlpBin, args);

    const weights = { videoWeight: 0.95, audioWeight: 0.05 };
    const state = {
      lastOutputFile: "",
      isProgress: false,
      streamCount: 0,
      isSingleStream: false,
      isMerging: false,
      spinnerInterval: null,
      singleStreamTimer: null,
      speedBuffer: [],
      weights,
      lastTotalSize: "",
      playlistVideoNumber: 0,
    };

    let stderrBuffer = "";

    ytdlp.stdout.on("data", (data) => {
      const output = data.toString();
      const lines = output.split(/\r?\n/);

      for (const line of lines) {
        // Detect playlist video number
        const playlistMatch = line.match(
          /\[download\]\s+Downloading video (\d+)/,
        );
        if (playlistMatch) {
          state.playlistVideoNumber = parseInt(playlistMatch[1], 10);
          console.log(
            chalk.cyan(
              `\n--- Downloading video ${state.playlistVideoNumber} ---`,
            ),
          );
        }

        // Handle "Downloading thumbnail" or other info lines
        if (
          line.includes("Downloading thumbnail") ||
          line.includes("Writing thumbnail")
        ) {
          continue;
        }
      }

      // Call the original handler for progress
      handleStdout(data, state);
    });

    ytdlp.stderr.on("data", (data) => {
      const text = data.toString();
      if (!isHarmlessStderr(text)) {
        stderrBuffer += text;
      }
    });

    ytdlp.on("error", (err) => {
      stopSpinner(state.spinnerInterval);
      clearTimeout(state.singleStreamTimer);
      reject(new Error(`Failed to run yt-dlp: ${err.message}`));
    });

    ytdlp.on("close", (code) => {
      stopSpinner(state.spinnerInterval);
      clearTimeout(state.singleStreamTimer);

      if (state.isProgress || state.isMerging) {
        const doneLine = formatProgress(
          100,
          state.lastTotalSize || "???",
          "Done",
          "00:00",
        );
        process.stdout.write(`\r${doneLine}\n`);
      }

      if (code !== 0) {
        let errorMsg = `Playlist download failed with exit code ${code}`;
        if (stderrBuffer.trim()) {
          errorMsg += "\n" + chalk.red(stderrBuffer.trim());
        }
        reject(new Error(errorMsg));
        return;
      }

      resolve(state.lastOutputFile || "Playlist download completed");
    });
  });
}

module.exports = {
  downloadVideoWithMerge,
  downloadPlaylist,
};
