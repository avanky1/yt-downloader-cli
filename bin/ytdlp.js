#!/usr/bin/env node

const args = process.argv.slice(2);

if (args.includes("-v") || args.includes("--version")) {
  const { version } = require("../package.json");
  console.log(version);
  process.exit(0);
}

if (args.includes("-h") || args.includes("--help")) {
  console.log("ytpull - Download YouTube videos from the terminal\n");
  console.log("Usage: ytpull [options]\n");
  console.log("Options:");
  console.log("  -v, --version  Show version number");
  console.log("  -h, --help     Show this help message");
  process.exit(0);
}

const { main } = require("../src/index");

main().catch((err) => {
  console.error("\nFatal error:", err.message || err);
  process.exit(1);
});
