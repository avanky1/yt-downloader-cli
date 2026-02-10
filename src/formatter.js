const QUALITY_PRIORITIES = [
  "2160p",
  "1440p",
  "1080p",
  "720p",
  "480p",
  "360p",
  "240p",
  "144p",
];

function filterFormats(formats) {
  if (!Array.isArray(formats) || formats.length === 0) {
    return [];
  }

  const videoFormats = formats.filter((f) => {
    const hasVideo = f.vcodec && f.vcodec !== "none";
    const hasResolution = f.height || f.resolution;
    const notStoryboard = !f.format_note?.toLowerCase().includes("storyboard");

    return hasVideo && hasResolution && notStoryboard;
  });

  const qualityMap = new Map();

  for (const format of videoFormats) {
    const height =
      format.height || extractHeightFromResolution(format.resolution);
    if (!height) continue;

    const qualityKey = `${height}p`;
    const existing = qualityMap.get(qualityKey);

    if (!existing || shouldReplaceFormat(existing, format)) {
      qualityMap.set(qualityKey, {
        format_id: format.format_id,
        ext: format.ext || "mp4",
        height: height,
        quality: qualityKey,
        hasAudio: format.acodec && format.acodec !== "none",
        filesize: format.filesize || format.filesize_approx || 0,
        tbr: format.tbr || 0,
        format_note: format.format_note || "",
        vcodec: format.vcodec || "unknown",
        acodec: format.acodec || "none",
      });
    }
  }

  const sortedFormats = Array.from(qualityMap.values()).sort(
    (a, b) => b.height - a.height,
  );

  return sortedFormats;
}

function extractHeightFromResolution(resolution) {
  if (!resolution || typeof resolution !== "string") {
    return null;
  }
  const match = resolution.match(/(\d+)x(\d+)/);
  return match ? parseInt(match[2], 10) : null;
}

function shouldReplaceFormat(existing, candidate) {
  const candidateHasAudio = candidate.acodec && candidate.acodec !== "none";
  const existingHasAudio = existing.hasAudio;

  if (candidateHasAudio && !existingHasAudio) {
    return true;
  }
  if (!candidateHasAudio && existingHasAudio) {
    return false;
  }

  const candidateIsMp4 = candidate.ext === "mp4";
  const existingIsMp4 = existing.ext === "mp4";

  if (candidateIsMp4 && !existingIsMp4) {
    return true;
  }
  if (!candidateIsMp4 && existingIsMp4) {
    return false;
  }

  const candidateTbr = candidate.tbr || 0;
  const existingTbr = existing.tbr || 0;

  return candidateTbr > existingTbr;
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) {
    return "Unknown size";
  }

  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

function displayFormats(formats, videoTitle) {
  console.log("\n" + "=".repeat(60));
  console.log(`${videoTitle}`);
  console.log("=".repeat(60));
  console.log("\nAvailable qualities (all include audio):\n");

  formats.forEach((format, index) => {
    const num = (index + 1).toString().padStart(2, " ");
    const quality = format.quality.padEnd(6, " ");
    const ext = "mp4".padEnd(4, " ");
    const size = formatFileSize(format.filesize);

    console.log(`  ${num}. ${quality} | ${ext} | ${size}`);
  });

  console.log("\n" + "-".repeat(60));
}

function getFormatId(formats, selection) {
  const index = selection - 1;
  if (index < 0 || index >= formats.length) {
    throw new Error(`Invalid selection: ${selection}`);
  }
  return formats[index].format_id;
}

function getSelectedFormat(formats, selection) {
  const index = selection - 1;
  if (index < 0 || index >= formats.length) {
    throw new Error(`Invalid selection: ${selection}`);
  }
  return formats[index];
}

module.exports = {
  filterFormats,
  displayFormats,
  getFormatId,
  getSelectedFormat,
  formatFileSize,
};
