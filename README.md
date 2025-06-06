# MP3 Juice - YouTube to MP3 Converter

A full-stack web application that allows users to search for YouTube videos and convert them to MP3 format.

## Prerequisites

- Node.js (v14 or higher)
- FFmpeg installed on your system
- yt-dlp installed on your system

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd mp3-juice
```

2. Install dependencies:
```bash
npm install
```

3. Install FFmpeg:
- Windows: Download from https://ffmpeg.org/download.html
- macOS: `brew install ffmpeg`
- Linux: `sudo apt-get install ffmpeg`

4. Install yt-dlp:
- Windows: Download from https://github.com/yt-dlp/yt-dlp/releases
- macOS/Linux: `sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && sudo chmod a+rx /usr/local/bin/yt-dlp`

## Usage

1. Start the development server:
```bash
npm run dev
```

2. Open your browser and navigate to `http://localhost:3000`

3. Enter a YouTube URL or search term in the search box

4. Click the "Download MP3" button on any result to convert and download the audio

## Features

- Search YouTube videos by URL or keywords
- Convert videos to MP3 format
- Clean, responsive UI with Tailwind CSS
- Automatic cleanup of temporary files
- Progress indicators and status messages

## Security

- Input sanitization to prevent command injection
- Temporary file cleanup after 5 minutes
- CORS enabled for API endpoints

## License

MIT License #   m p 3 - s o d a  
 