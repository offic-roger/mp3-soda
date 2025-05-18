const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const YTDlpWrap = require('yt-dlp-wrap').default;
const ffmpeg = require('fluent-ffmpeg');
const sanitize = require('sanitize-filename');
const { exec } = require('child_process');

const app = express();
const port = process.env.PORT || 3000;

// Set up paths for binaries
const binPath = path.join(__dirname, 'bin');
process.env.PATH = `${binPath}:${process.env.PATH}`;

// Check for required dependencies
async function checkDependencies() {
    return new Promise((resolve) => {
        const ytDlpPath = path.join(binPath, 'yt-dlp');
        const ffmpegPath = path.join(binPath, 'ffmpeg');
        
        if (!fs.existsSync(ytDlpPath) || !fs.existsSync(ffmpegPath)) {
            console.error('Required binaries are missing. Please ensure build script ran successfully.');
            resolve(false);
            return;
        }

        // Make sure binaries are executable
        try {
            fs.chmodSync(ytDlpPath, '755');
            fs.chmodSync(ffmpegPath, '755');
        } catch (error) {
            console.error('Failed to set executable permissions:', error);
        }

        exec(`${ytDlpPath} --version`, (error) => {
            if (error) {
                console.error('yt-dlp check failed:', error);
                resolve(false);
                return;
            }

            exec(`${ffmpegPath} -version`, (error) => {
                if (error) {
                    console.error('ffmpeg check failed:', error);
                    resolve(false);
                    return;
                }

                console.log('All dependencies are installed and working.');
                resolve(true);
            });
        });
    });
}

// Initialize yt-dlp with custom binary path
let ytDlp;
try {
    ytDlp = new YTDlpWrap(path.join(binPath, 'yt-dlp'));
} catch (error) {
    console.error('Failed to initialize yt-dlp:', error);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Create temp directory if it doesn't exist
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}

// Cleanup function for temporary files
const cleanupTempFiles = (filePath) => {
    setTimeout(() => {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }, 5 * 60 * 1000); // 5 minutes
};

// Search endpoint
app.get('/api/search', async (req, res) => {
    try {
        if (!ytDlp) {
            return res.status(500).json({ error: 'Server is not properly configured. Please try again later.' });
        }

        const query = req.query.q;
        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        console.log('Searching for:', query);

        const isUrl = query.includes('youtube.com') || query.includes('youtu.be');
        let videoInfo;

        if (isUrl) {
            videoInfo = await ytDlp.getVideoInfo(query);
            return res.json([{
                id: videoInfo.id,
                title: videoInfo.title,
                thumbnail: videoInfo.thumbnail,
                duration: videoInfo.duration,
                url: query
            }]);
        } else {
            // For search terms, we'll simulate a search
            const searchResults = await ytDlp.execPromise([
                'ytsearch1:' + query,
                '--dump-json'
            ]);
            const results = searchResults.split('\n').filter(Boolean).map(JSON.parse);
            return res.json(results.map(video => ({
                id: video.id,
                title: video.title,
                thumbnail: video.thumbnail,
                duration: video.duration,
                url: `https://www.youtube.com/watch?v=${video.id}`
            })));
        }
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Failed to search videos. Please try again.' });
    }
});

// Download endpoint
app.get('/api/download', async (req, res) => {
    try {
        if (!ytDlp) {
            return res.status(500).json({ error: 'Server is not properly configured. Please try again later.' });
        }

        const url = req.query.url;
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        console.log('Downloading:', url);

        const videoInfo = await ytDlp.getVideoInfo(url);
        const sanitizedTitle = sanitize(videoInfo.title);
        const outputPath = path.join(tempDir, `${sanitizedTitle}.mp3`);

        // Download and convert
        await ytDlp.execPromise([
            url,
            '-x',
            '--audio-format', 'mp3',
            '--audio-quality', '0',
            '-o', outputPath
        ]);

        // Set up cleanup
        cleanupTempFiles(outputPath);

        // Send file
        res.download(outputPath, `${sanitizedTitle}.mp3`, (err) => {
            if (err) {
                console.error('Download error:', err);
            }
        });
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Failed to download video. Please try again.' });
    }
});

// Health check endpoint
app.get('/health', async (req, res) => {
    const dependenciesOk = await checkDependencies();
    res.json({
        status: 'ok',
        dependencies: dependenciesOk ? 'installed' : 'missing',
        binPath: binPath,
        path: process.env.PATH
    });
});

app.listen(port, async () => {
    console.log(`Server running at http://localhost:${port}`);
    await checkDependencies();
}); 