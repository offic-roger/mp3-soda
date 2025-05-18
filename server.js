const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const YTDlpWrap = require('yt-dlp-wrap').default;
const ffmpeg = require('fluent-ffmpeg');
const sanitize = require('sanitize-filename');

const app = express();
const port = process.env.PORT || 3000;

// Initialize yt-dlp
const ytDlp = new YTDlpWrap();

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
        const query = req.query.q;
        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }

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
            // For search terms, we'll simulate a search (in a real app, you'd use YouTube API)
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
        res.status(500).json({ error: 'Failed to search videos' });
    }
});

// Download endpoint
app.get('/api/download', async (req, res) => {
    try {
        const url = req.query.url;
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

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
        res.status(500).json({ error: 'Failed to download video' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 