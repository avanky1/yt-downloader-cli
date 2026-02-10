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
3. Video downloads to your `Downloads` folder as MP4

## Options

```
ytpull           Start the interactive downloader
ytpull -v        Show version
ytpull --help    Show help
```

## Uninstall

```bash
npm uninstall -g ytpull
```

## License

MIT
