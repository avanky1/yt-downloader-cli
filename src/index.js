const {
  promptForUrl,
  isValidYouTubeUrl,
  promptForQualityWithRetry,
  promptYesNo,
} = require("./prompt");
const { fetchVideoMetadata } = require("./fetcher");
const {
  filterFormats,
  displayFormats,
  getFormatId,
  getSelectedFormat,
  formatFileSize,
} = require("./formatter");
const { downloadVideoWithMerge } = require("./downloader");
const { showBanner } = require("./banner");
const { addToHistory, isDuplicate } = require("./history");
const { showQueueProgress, showQueueSummary } = require("./queue");
const chalk = require("chalk");

function estimateTotalSize(selectedFormat, allFormats) {
  const videoSize = selectedFormat.filesize || 0;

  const audioFormats = allFormats.filter(
    (f) =>
      f.acodec && f.acodec !== "none" && (!f.vcodec || f.vcodec === "none"),
  );

  let audioSize = 0;
  const m4aAudio = audioFormats.find((f) => f.ext === "m4a");
  if (m4aAudio) {
    audioSize = m4aAudio.filesize || m4aAudio.filesize_approx || 0;
  } else if (audioFormats.length > 0) {
    audioSize =
      audioFormats[0].filesize || audioFormats[0].filesize_approx || 0;
  }

  return videoSize + audioSize;
}

async function processOneVideo(url, queueIndex, queueTotal) {
  if (queueTotal > 1) {
    showQueueProgress(queueIndex, queueTotal);
  }

  if (!isValidYouTubeUrl(url)) {
    console.error(
      "\nInvalid YouTube URL. Please provide a valid YouTube video link.",
    );
    console.error("   Examples:");
    console.error("   - https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    console.error("   - https://youtu.be/dQw4w9WgXcQ");
    return { success: false, url, error: "Invalid URL" };
  }

  console.log("\nFetching video information...");

  let metadata;
  try {
    metadata = await fetchVideoMetadata(url);
  } catch (err) {
    console.error(`\nFailed to fetch video info: ${err.message}`);
    return { success: false, url, error: err.message };
  }

  const videoTitle = metadata.title || "Unknown Title";
  const formats = metadata.formats;

  if (!formats || formats.length === 0) {
    console.error("\nNo formats found for this video.");
    return {
      success: false,
      url,
      title: videoTitle,
      error: "No formats found",
    };
  }

  const filteredFormats = filterFormats(formats);

  if (filteredFormats.length === 0) {
    console.error("\nNo suitable video formats found for this video.");
    return {
      success: false,
      url,
      title: videoTitle,
      error: "No suitable formats",
    };
  }

  displayFormats(filteredFormats, videoTitle);

  let selection;
  try {
    selection = await promptForQualityWithRetry(filteredFormats.length);
  } catch (err) {
    console.error(`\n${err.message}`);
    return { success: false, url, title: videoTitle, error: err.message };
  }

  const selectedFormat = getSelectedFormat(filteredFormats, selection);
  const formatId = getFormatId(filteredFormats, selection);

  const duplicate = isDuplicate(url, formatId);
  if (duplicate) {
    console.log(
      chalk.yellow(
        `\nThis video was already downloaded in ${selectedFormat.quality} on ${new Date(duplicate.date).toLocaleDateString()}.`,
      ),
    );
    const redownload = await promptYesNo("Download again?");
    if (!redownload) {
      console.log(chalk.dim("Skipped."));
      return {
        success: true,
        url,
        title: videoTitle,
        quality: selectedFormat.quality,
        skipped: true,
      };
    }
  }

  const estimatedSize = estimateTotalSize(selectedFormat, formats);
  if (estimatedSize > 0) {
    console.log(
      chalk.cyan(`\nEstimated file size: ${formatFileSize(estimatedSize)}`),
    );
  } else {
    console.log(chalk.dim("\nEstimated file size: Unknown"));
  }

  const proceed = await promptYesNo("Proceed with download?");
  if (!proceed) {
    console.log(chalk.dim("Download cancelled."));
    return {
      success: true,
      url,
      title: videoTitle,
      quality: selectedFormat.quality,
      skipped: true,
    };
  }

  console.log(
    `\nSelected: ${selectedFormat.quality} (${selectedFormat.ext}) - Format ID: ${formatId}`,
  );

  try {
    const outputFile = await downloadVideoWithMerge(url, formatId);

    addToHistory({
      url,
      videoTitle,
      quality: selectedFormat.quality,
      formatId,
      filePath: outputFile !== "Download completed" ? outputFile : "",
    });

    console.log("\n" + "=".repeat(60));
    console.log("Download complete!");
    if (outputFile && outputFile !== "Download completed") {
      console.log(`Saved to: ${outputFile}`);
    }
    console.log("=".repeat(60) + "\n");

    return {
      success: true,
      url,
      title: videoTitle,
      quality: selectedFormat.quality,
    };
  } catch (err) {
    console.error(`\nDownload failed: ${err.message}`);
    return { success: false, url, title: videoTitle, error: err.message };
  }
}

async function main() {
  showBanner();

  const results = [];
  let keepGoing = true;

  while (keepGoing) {
    const url = await promptForUrl();
    const result = await processOneVideo(url, results.length + 1, 1);
    results.push(result);

    keepGoing = await promptYesNo("Add another video to queue?");
  }

  if (results.length > 1) {
    showQueueSummary(results);
  }
}

module.exports = { main };
