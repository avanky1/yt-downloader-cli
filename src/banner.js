const chalk = require("chalk");
const boxen = require("boxen");

const ASCII_ART = `
██╗   ██╗████████╗    ██████╗ ██╗   ██╗██╗     ██╗     
╚██╗ ██╔╝╚══██╔══╝    ██╔══██╗██║   ██║██║     ██║     
 ╚████╔╝    ██║       ██████╔╝██║   ██║██║     ██║     
  ╚██╔╝     ██║       ██╔═══╝ ██║   ██║██║     ██║     
   ██║      ██║       ██║     ╚██████╔╝███████╗███████╗
   ╚═╝      ╚═╝       ╚═╝      ╚═════╝ ╚══════╝╚══════╝`;

function showBanner() {
  console.log(chalk.cyan(ASCII_ART));
  console.log(chalk.dim("        made by avanish\n"));

  const description = boxen(
    chalk.white(
      "Interactive CLI to download YouTube videos\nwith quality selection using yt-dlp",
    ),
    {
      padding: 1,
      margin: { top: 0, bottom: 1, left: 0, right: 0 },
      borderStyle: "round",
      borderColor: "gray",
    },
  );

  console.log(description);
}

function showHelp() {
  showBanner();
  console.log(chalk.bold("Usage:") + " ytpull [options]\n");
  console.log(chalk.bold("Options:"));
  console.log("  -v, --version        Show version number");
  console.log("  -h, --help           Show this help message");
  console.log("  --history            Show download history");
  console.log("  --clear-history      Clear download history\n");
}

module.exports = { showBanner, showHelp };
