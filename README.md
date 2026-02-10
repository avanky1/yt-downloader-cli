# ytpull

A local CLI tool for downloading YouTube videos using [yt-dlp](https://github.com/yt-dlp/yt-dlp).

## Prerequisites

- **Node.js** >= 14.0.0
- **yt-dlp** installed and available in your system PATH
  - Install: https://github.com/yt-dlp/yt-dlp#installation
  - Verify: `yt-dlp --version`
- **ffmpeg** (optional, but recommended for merging video + audio streams)
  - Required when selecting a video-only format

## Folder Structure

```
ytpull/
├── package.json          # Project metadata, scripts, and bin entry
├── bin/
│   └── ytdlp.js          # CLI entry point (executable)
├── src/
│   ├── index.js          # Main orchestrator - coordinates the full flow
│   ├── prompt.js         # User input handling via readline
│   ├── fetcher.js        # Fetches video metadata using yt-dlp -J
│   ├── formatter.js      # Parses, filters, and displays video formats
│   └── downloader.js     # Executes download with progress streaming
├── README.md             # This file
└── TODO.md               # Implementation progress tracker
```

## Control Flow

```
┌─────────────────────────────────────────────────┐
│  1. User starts CLI                             │
│     └─> Prompt for YouTube URL                  │
│                                                 │
│  2. Validate URL                                │
│     └─> Reject if not a valid YouTube URL       │
│                                                 │
│  3. Fetch metadata                              │
│     └─> Spawn yt-dlp -J --no-playlist <url>     │
│     └─> Parse JSON output                       │
│                                                 │
│  4. Filter formats                              │
│     └─> Keep video formats with resolution      │
│     └─> Deduplicate by quality (360p, 720p...)  │
│     └─> Prioritize: audio > mp4 > bitrate       │
│                                                 │
│  5. Display numbered quality list               │
│     └─> Show quality, format, audio, file size  │
│                                                 │
│  6. Prompt for quality selection                 │
│     └─> Validate input (number in range)        │
│     └─> Retry up to 3 times on invalid input    │
│                                                 │
│  7. Download video                              │
│     └─> If format has audio: download directly  │
│     └─> If no audio: merge with best audio      │
│     └─> Stream progress to terminal             │
│                                                 │
│  8. Print success/error message                 │
└─────────────────────────────────────────────────┘
```

## Installation

### Option 1: Install from npm (recommended)

```bash
npm install -g ytpull
```

After installation, run from anywhere:

```bash
ytpull
```

### Option 2: Install from GitHub

```bash
# Clone the repository
git clone https://github.com/avanky1/yt-downloader-cli.git
cd yt-downloader-cli

# Install globally
npm install -g .

# Now run from anywhere
ytpull
```

### Option 3: Run without installing

```bash
# Clone the repository
git clone https://github.com/avanky1/yt-downloader-cli.git
cd yt-downloader-cli

# Run directly
npm start
# or
node bin/ytdlp.js
```

### Option 4: Use npx (no install needed)

```bash
npx ytpull
```

## Uninstall

```bash
npm uninstall -g ytpull
```

## Usage Example

```
$ ytpull

yt-dlp Video Downloader CLI
────────────────────────────────────────

🔗 Paste a YouTube video URL: https://www.youtube.com/watch?v=dQw4w9WgXcQ

⏳ Fetching video information...

════════════════════════════════════════════════════════════
📹 Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster)
════════════════════════════════════════════════════════════

Available qualities (all include audio):

   1. 2160p  | mp4  | 229.2 MB
   2. 1440p  | mp4  | 116.5 MB
   3. 1080p  | mp4  | 77.2 MB
   4. 720p   | mp4  | 25.2 MB
   5. 480p   | mp4  | 13.5 MB
   6. 360p   | mp4  | 11.3 MB
   7. 240p   | mp4  | 4.1 MB
   8. 144p   | mp4  | 2.0 MB

──────────────────────────────────────────────────────────

📥 Select quality (1-8): 3

✅ Selected: 1080p (mp4) - Format ID: 137

📥 Starting download...

[download]  45.2% of 77.16MiB at 5.5MiB/s ETA 00:08
...
[Merger] Merging formats into "Rick Astley - Never Gonna Give You Up.mp4"

════════════════════════════════════════════════════════════
✅ Download complete!
📁 Saved to: Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster).mp4
════════════════════════════════════════════════════════════
```

## Error Handling

- **Invalid URL**: Rejects non-YouTube URLs with helpful examples
- **yt-dlp not found**: Clear error message with installation link
- **No formats found**: Graceful error if video has no downloadable formats
- **Invalid selection**: Retries up to 3 times with remaining attempt count
- **Download failure**: Reports yt-dlp exit code and error output

## License

MIT
