const {
  addToHistory,
  isDuplicate,
  loadHistory,
  clearHistory,
  displayHistory,
} = require("./src/history");
const { showQueueSummary } = require("./src/queue");
const { formatFileSize } = require("./src/formatter");
const { isValidYouTubeUrl } = require("./src/prompt");
const chalk = require("chalk");

console.log(chalk.bold("\n=== ytpull Feature Tests ===\n"));

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(chalk.green(`  ✓ ${name}`));
    passed++;
  } catch (err) {
    console.log(chalk.red(`  ✗ ${name}: ${err.message}`));
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || "Assertion failed");
}

console.log(chalk.cyan("Feature 1: Download History"));

clearHistory();

test("loadHistory returns empty array after clear", () => {
  const h = loadHistory();
  assert(Array.isArray(h), "Should be array");
  assert(h.length === 0, "Should be empty");
});

test("addToHistory saves an entry", () => {
  addToHistory({
    url: "https://youtu.be/25xVqvL5j4g",
    videoTitle: "Test Video",
    quality: "1080p",
    formatId: "137",
    filePath: "/home/user/Downloads/Test Video.mp4",
  });
  const h = loadHistory();
  assert(h.length === 1, "Should have 1 entry");
  assert(h[0].videoTitle === "Test Video", "Title should match");
  assert(h[0].quality === "1080p", "Quality should match");
  assert(h[0].url === "https://youtu.be/25xVqvL5j4g", "URL should match");
  assert(h[0].date, "Should have date");
});

test("isDuplicate detects existing entry", () => {
  const dup = isDuplicate("https://youtu.be/25xVqvL5j4g", "137");
  assert(dup, "Should find duplicate");
  assert(dup.videoTitle === "Test Video", "Duplicate title should match");
});

test("isDuplicate returns undefined for new entry", () => {
  const dup = isDuplicate("https://youtu.be/DIFFERENT", "137");
  assert(!dup, "Should not find duplicate");
});

test("isDuplicate returns undefined for same URL different format", () => {
  const dup = isDuplicate("https://youtu.be/25xVqvL5j4g", "248");
  assert(!dup, "Should not find duplicate for different format");
});

test("addToHistory supports multiple entries", () => {
  addToHistory({
    url: "https://youtu.be/SECOND",
    videoTitle: "Second Video",
    quality: "720p",
    formatId: "136",
    filePath: "",
  });
  const h = loadHistory();
  assert(h.length === 2, "Should have 2 entries");
});

test("displayHistory runs without error", () => {
  displayHistory();
});

test("clearHistory empties the history", () => {
  clearHistory();
  const h = loadHistory();
  assert(h.length === 0, "Should be empty after clear");
});

console.log(chalk.cyan("\nFeature 2: Queue System"));

test("showQueueSummary with mixed results", () => {
  showQueueSummary([
    {
      success: true,
      title: "Video A",
      quality: "1080p",
      url: "https://youtu.be/A",
    },
    {
      success: false,
      title: "Video B",
      url: "https://youtu.be/B",
      error: "Network error",
    },
    {
      success: true,
      title: "Video C",
      quality: "720p",
      url: "https://youtu.be/C",
    },
  ]);
});

test("showQueueSummary with all successful", () => {
  showQueueSummary([
    {
      success: true,
      title: "Video X",
      quality: "1080p",
      url: "https://youtu.be/X",
    },
  ]);
});

test("showQueueSummary with all failed", () => {
  showQueueSummary([
    { success: false, url: "https://youtu.be/F", error: "Not found" },
  ]);
});

console.log(chalk.cyan("\nFeature 3: File Size Preview"));

test("formatFileSize formats bytes correctly", () => {
  assert(formatFileSize(0) === "Unknown size", "0 should be Unknown");
  assert(formatFileSize(null) === "Unknown size", "null should be Unknown");
  assert(formatFileSize(500) === "500.0 B", "500 bytes");
  assert(formatFileSize(1024) === "1.0 KB", "1 KB");
  assert(formatFileSize(1048576) === "1.0 MB", "1 MB");
  assert(formatFileSize(1073741824) === "1.0 GB", "1 GB");
});

test("formatFileSize handles large video sizes", () => {
  const size = formatFileSize(157286400);
  assert(size === "150.0 MB", `Expected 150.0 MB, got ${size}`);
});

console.log(chalk.cyan("\nURL Validation"));

test("validates standard YouTube URLs", () => {
  assert(
    isValidYouTubeUrl("https://www.youtube.com/watch?v=25xVqvL5j4g"),
    "standard",
  );
  assert(isValidYouTubeUrl("https://youtu.be/25xVqvL5j4g"), "short");
  assert(
    isValidYouTubeUrl("https://www.youtube.com/shorts/25xVqvL5j4g"),
    "shorts",
  );
  assert(
    isValidYouTubeUrl("https://www.youtube.com/embed/25xVqvL5j4g"),
    "embed",
  );
});

test("rejects invalid URLs", () => {
  assert(!isValidYouTubeUrl(""), "empty");
  assert(!isValidYouTubeUrl("https://google.com"), "not youtube");
  assert(!isValidYouTubeUrl(null), "null");
  assert(!isValidYouTubeUrl("random text"), "random");
});

console.log(
  chalk.bold(`\n=== Results: ${passed} passed, ${failed} failed ===\n`),
);

clearHistory();

process.exit(failed > 0 ? 1 : 0);
