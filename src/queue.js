const chalk = require("chalk");

function showQueueProgress(current, total) {
  console.log(
    chalk.cyan(`\n[${"=".repeat(current)}${"-".repeat(total - current)}]`) +
      chalk.white(` Video ${current} of ${total}`),
  );
}

function showQueueSummary(results) {
  console.log("\n" + "=".repeat(60));
  console.log(chalk.bold("Queue Summary"));
  console.log("=".repeat(60));

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  if (successful.length > 0) {
    console.log(chalk.green(`\n✓ Successfully downloaded: ${successful.length}`));
    successful.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.title} (${r.quality})`);
    });
  }

  if (failed.length > 0) {
    console.log(chalk.red(`\n✗ Failed: ${failed.length}`));
    failed.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.url}`);
      console.log(`     Error: ${r.error}`);
    });
  }

  console.log("\n" + "=".repeat(60) + "\n");
}

module.exports = {
  showQueueProgress,
  showQueueSummary,
};
