const {
  promptForUrl,
  isValidYouTubeUrl,
  promptForQualityWithRetry,
} = require("./prompt");
const { fetchVideoMetadata } = require("./fetcher");
const {
  filterFormats,
  displayFormats,
  getFormatId,
  getSelectedFormat,
} = require("./formatter");
const { downloadVideoWithMerge } = require("./downloader");

async function main() {
  console.log("\n🎬 yt-dlp Video Downloader CLI");
  console.log("─".repeat(40));

  const url = await promptForUrl();

  if (!isValidYouTubeUrl(url)) {
    console.error(
      "\n❌ Invalid YouTube URL. Please provide a valid YouTube video link.",
    );
    console.error("   Examples:");
    console.error("   - https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    console.error("   - https://youtu.be/dQw4w9WgXcQ");
    process.exit(1);
  }

  console.log("\n⏳ Fetching video information...");

  let metadata;
  try {
    metadata = await fetchVideoMetadata(url);
  } catch (err) {
    console.error(`\n❌ Failed to fetch video info: ${err.message}`);
    process.exit(1);
  }

  const videoTitle = metadata.title || "Unknown Title";
  const formats = metadata.formats;

  if (!formats || formats.length === 0) {
    console.error("\n❌ No formats found for this video.");
    process.exit(1);
  }

  const filteredFormats = filterFormats(formats);

  if (filteredFormats.length === 0) {
    console.error("\n❌ No suitable video formats found for this video.");
    process.exit(1);
  }

  displayFormats(filteredFormats, videoTitle);

  let selection;
  try {
    selection = await promptForQualityWithRetry(filteredFormats.length);
  } catch (err) {
    console.error(`\n❌ ${err.message}`);
    process.exit(1);
  }

  const selectedFormat = getSelectedFormat(filteredFormats, selection);
  const formatId = getFormatId(filteredFormats, selection);

  console.log(
    `\n✅ Selected: ${selectedFormat.quality} (${selectedFormat.ext}) - Format ID: ${formatId}`,
  );

  try {
    const outputFile = await downloadVideoWithMerge(url, formatId);

    console.log("\n" + "═".repeat(60));
    console.log("✅ Download complete!");
    if (outputFile && outputFile !== "Download completed") {
      console.log(`📁 Saved to: ${outputFile}`);
    }
    console.log("═".repeat(60) + "\n");
  } catch (err) {
    console.error(`\n❌ Download failed: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { main };
