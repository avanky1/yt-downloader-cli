const readline = require("readline");

function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function promptForUrl() {
  return new Promise((resolve) => {
    const rl = createReadlineInterface();

    rl.question("\nPaste a YouTube video URL: ", (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function isValidYouTubeUrl(url) {
  if (!url || typeof url !== "string") {
    return false;
  }

  const patterns = [
    /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
    /^https?:\/\/youtu\.be\/[\w-]+/,
    /^https?:\/\/(www\.)?youtube\.com\/shorts\/[\w-]+/,
    /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/,
  ];

  return patterns.some((pattern) => pattern.test(url));
}

function promptForQuality(maxOption) {
  return new Promise((resolve) => {
    const rl = createReadlineInterface();

    rl.question(`\nSelect quality (1-${maxOption}): `, (answer) => {
      rl.close();
      const selection = parseInt(answer.trim(), 10);
      resolve(selection);
    });
  });
}

function isValidSelection(selection, maxOption) {
  return !isNaN(selection) && selection >= 1 && selection <= maxOption;
}

async function promptForQualityWithRetry(maxOption, maxRetries = 3) {
  let attempts = 0;

  while (attempts < maxRetries) {
    const selection = await promptForQuality(maxOption);

    if (isValidSelection(selection, maxOption)) {
      return selection;
    }

    attempts++;
    const remaining = maxRetries - attempts;

    if (remaining > 0) {
      console.log(
        `\nInvalid selection. Please enter a number between 1 and ${maxOption}. (${remaining} attempts remaining)`,
      );
    }
  }

  throw new Error("Maximum retry attempts exceeded. Please restart the CLI.");
}

function promptYesNo(question) {
  return new Promise((resolve) => {
    const rl = createReadlineInterface();
    rl.question(`\n${question} (y/n): `, (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      resolve(normalized === "y" || normalized === "yes");
    });
  });
}

module.exports = {
  promptForUrl,
  isValidYouTubeUrl,
  promptForQuality,
  isValidSelection,
  promptForQualityWithRetry,
  promptYesNo,
};
