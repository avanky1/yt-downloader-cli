const {
  promptForUrl,
  isValidYouTubeUrl,
  isPlaylistUrl,
  promptPlaylistOrSingle,
  promptForQualityWithRetry,
  promptYesNo,
} = require("./prompt");
const { fetchVideoMetadata, fetchPlaylistInfo } = require("./fetcher");
const {
  filterFormats,
  displayFormats,
  getFormatId,
  getSelectedFormat,
  formatFileSize,
} = require("./formatter");
const { downloadVideoWithMerge, downloadPlaylist } = require("./downloader");
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
    chalk.dim(`\nSelected: ${selectedFormat.quality} (${selectedFormat.ext})`),
  );

  const videoSize = selectedFormat.filesize || 0;
  const audioFormats = formats.filter(
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

  try {
    const outputFile = await downloadVideoWithMerge(url, formatId, {
      videoSize,
      audioSize,
    });

    addToHistory({
      url,
      videoTitle,
      quality: selectedFormat.quality,
      formatId,
      filePath: outputFile !== "Download completed" ? outputFile : "",
    });

    if (outputFile && outputFile !== "Download completed") {
      console.log(
        chalk.green("\n  ✓ Saved to: ") + chalk.white(outputFile) + "\n",
      );
    } else {
      console.log(chalk.green("\n  ✓ Download complete!\n"));
    }

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

async function processPlaylist(url) {
  // Check if URL contains playlist parameter
  if (!isPlaylistUrl(url)) {
    // Not a playlist, process as single video
    return processOneVideo(url, 1, 1);
  }

  // Ask user if they want to download playlist or single video
  const choice = await promptPlaylistOrSingle();

  if (choice === "single") {
    // Process just the single video from the URL
    return processOneVideo(url, 1, 1);
  }

  // It's a playlist - get playlist info
  console.log("\nFetching playlist information...");

  let playlistInfo;
  try {
    playlistInfo = await fetchPlaylistInfo(url);
  } catch (err) {
    console.error(`\nFailed to fetch playlist info: ${err.message}`);
    return { success: false, url, error: err.message };
  }

  console.log(chalk.cyan(`\nPlaylist: ${playlistInfo.title}`));
  console.log(chalk.cyan(`Videos: ${playlistInfo.videoCount}\n`));

  // Get quality options from the first video
  console.log("Fetching quality options from first video...");
  let metadata;
  try {
    metadata = await fetchVideoMetadata(url);
  } catch (err) {
    console.error(`\nFailed to fetch video info: ${err.message}`);
    return { success: false, url, error: err.message };
  }

  const formats = metadata.formats;
  if (!formats || formats.length === 0) {
    console.error("\nNo formats found for this video.");
    return { success: false, url, error: "No formats found" };
  }

  const filteredFormats = filterFormats(formats);
  if (filteredFormats.length === 0) {
    console.error("\nNo suitable video formats found.");
    return { success: false, url, error: "No suitable formats" };
  }

  displayFormats(filteredFormats, "Playlist Quality Selection");

  let selection;
  try {
    selection = await promptForQualityWithRetry(filteredFormats.length);
  } catch (err) {
    console.error(`\n${err.message}`);
    return { success: false, url, error: err.message };
  }

  const selectedFormat = getSelectedFormat(filteredFormats, selection);
  const formatId = getFormatId(filteredFormats, selection);

  console.log(
    chalk.dim(`\nSelected: ${selectedFormat.quality} for all ${playlistInfo.videoCount} videos`),
  );

  const proceed = await promptYesNo("Proceed with playlist download?");
  if (!proceed) {
    console.log(chalk.dim("Playlist download cancelled."));
    return {
      success: true,
      url,
      title: playlistInfo.title,
      quality: selectedFormat.quality,
      skipped: true,
    };
  }

  try {
    const outputFile = await downloadPlaylist(url, formatId);

    // Add to history (use playlist URL as reference)
    addToHistory({
      url,
      videoTitle: playlistInfo.title,
      quality: selectedFormat.quality,
      formatId,
      filePath: "",
    });

    console.log(chalk.green("\n  ✓ Playlist download complete!\n"));

    return {
      success: true,
      url,
      title: playlistInfo.title,
      quality: selectedFormat.quality,
      videoCount: playlistInfo.videoCount,
    };
  } catch (err) {
    console.error(`\nPlaylist download failed: ${err.message}`);
    return { success: false, url, title: playlistInfo.title, error: err.message };
  }
}

async function main() {
  showBanner();

  const results = [];
  let keepGoing = true;

  while (keepGoing) {
    const url = await promptForUrl();
    // Check if URL might be a playlist and handle accordingly
    const result = await processPlaylist(url);
    results.push(result);

    keepGoing = await promptYesNo("Add another video to queue?");
  }

  if (results.length > 1) {
    showQueueSummary(results);
  }
}

module.exports = { main };

