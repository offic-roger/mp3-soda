#!/usr/bin/env bash

# Create bin directory
mkdir -p bin

# Download yt-dlp
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o bin/yt-dlp
chmod a+rx bin/yt-dlp

# Download FFmpeg static build
curl -L https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz -o ffmpeg.tar.xz
tar xf ffmpeg.tar.xz
mv ffmpeg-*-amd64-static/ffmpeg bin/
mv ffmpeg-*-amd64-static/ffprobe bin/
rm -rf ffmpeg-*-amd64-static ffmpeg.tar.xz

# Add bin to PATH
export PATH="$PWD/bin:$PATH"

# Install Node.js dependencies
npm install 