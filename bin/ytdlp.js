#!/usr/bin/env node

const { main } = require("../src/index");

main().catch((err) => {
  console.error("\nFatal error:", err.message || err);
  process.exit(1);
});
