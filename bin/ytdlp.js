#!/usr/bin/env node

const args = process.argv.slice(2);

if (args.includes("-v") || args.includes("--version")) {
  const { version } = require("../package.json");
  console.log(version);
  process.exit(0);
}

if (args.includes("-h") || args.includes("--help")) {
  const { showHelp } = require("../src/banner");
  showHelp();
  process.exit(0);
}

const { main } = require("../src/index");

main().catch((err) => {
  console.error("\nFatal error:", err.message || err);
  process.exit(1);
});
