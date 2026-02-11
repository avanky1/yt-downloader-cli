# ytpull

Download YouTube videos from the terminal.

## Installation

```bash
npm install -g ytpull
```

This will:

1. Install the `ytpull` CLI command globally
2. Automatically download `yt-dlp` if it's not already on your system

### Requirements

- **Node.js** >= 14.0.0
- **ffmpeg** (recommended) — needed for merging video + audio into MP4
  - Windows: `winget install ffmpeg`
  - macOS: `brew install ffmpeg`
  - Linux: `sudo apt install ffmpeg`

### Verify Installation

```bash
ytpull -v
```

## Usage

```bash
ytpull
```

1. Paste a YouTube URL
2. Pick a quality from the list
3. See estimated file size before downloading
4. Confirm to proceed
5. Video downloads to your `Downloads` folder as MP4
6. Add more videos to queue or finish

## Features

### File Size Preview

Before downloading, ytpull shows the estimated file size (video + audio combined) so you can decide whether to proceed.

### Download History

ytpull tracks all your downloads to help avoid duplicates. If you try to download a video you've already downloaded in the same quality, you'll be warned and can choose to skip or re-download.

View your download history:

```bash
ytpull --history
```

Clear your download history:

```bash
ytpull --clear-history
```

### Queue System

After each download, you can add more videos to the queue. All videos are processed sequentially, and you get a summary at the end showing successful and failed downloads.

## Options

```
ytpull                 Start the interactive downloader
ytpull -v, --version   Show version
ytpull -h, --help      Show help
ytpull --history       Show download history
ytpull --clear-history Clear download history
```

## Uninstall

```bash
npm uninstall -g ytpull
```

## License

MIT
