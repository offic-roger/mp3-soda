#!/usr/bin/env bash

set -e  # Exit on error
set -x  # Print commands

echo "Starting build process..."

# Create bin directory
echo "Creating bin directory..."
mkdir -p bin

# Download yt-dlp
echo "Downloading yt-dlp..."
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o bin/yt-dlp
chmod a+rx bin/yt-dlp

# Verify yt-dlp
echo "Verifying yt-dlp..."
./bin/yt-dlp --version

# Update yt-dlp
echo "Updating yt-dlp..."
./bin/yt-dlp -U

# Download FFmpeg static build
echo "Downloading FFmpeg..."
curl -L https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz -o ffmpeg.tar.xz
tar xf ffmpeg.tar.xz
mv ffmpeg-*-amd64-static/ffmpeg bin/
mv ffmpeg-*-amd64-static/ffprobe bin/
rm -rf ffmpeg-*-amd64-static ffmpeg.tar.xz

# Verify FFmpeg
echo "Verifying FFmpeg..."
./bin/ffmpeg -version

# Add bin to PATH
echo "Setting up PATH..."
export PATH="$PWD/bin:$PATH"
echo "Current PATH: $PATH"

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

# Test yt-dlp search
echo "Testing yt-dlp search..."
./bin/yt-dlp ytsearch1:"test" --dump-json --no-playlist --no-warnings --no-check-certificate

echo "Build process completed successfully!" 