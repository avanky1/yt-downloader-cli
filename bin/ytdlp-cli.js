#!/usr/bin/env node

const { main } = require("../src/index");

main().catch((err) => {
  console.error("\n❌ Fatal error:", err.message || err);
  process.exit(1);
});
