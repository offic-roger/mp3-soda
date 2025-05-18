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
        
        console.log('Checking dependencies...');
        console.log('yt-dlp path:', ytDlpPath);
        console.log('ffmpeg path:', ffmpegPath);
        console.log('Current PATH:', process.env.PATH);
        
        if (!fs.existsSync(ytDlpPath) || !fs.existsSync(ffmpegPath)) {
            console.error('Required binaries are missing:');
            console.error('yt-dlp exists:', fs.existsSync(ytDlpPath));
            console.error('ffmpeg exists:', fs.existsSync(ffmpegPath));
            resolve(false);
            return;
        }

        // Make sure binaries are executable
        try {
            fs.chmodSync(ytDlpPath, '755');
            fs.chmodSync(ffmpegPath, '755');
            console.log('Set executable permissions successfully');
        } catch (error) {
            console.error('Failed to set executable permissions:', error);
        }

        exec(`${ytDlpPath} --version`, (error, stdout, stderr) => {
            if (error) {
                console.error('yt-dlp check failed:', error);
                console.error('yt-dlp stderr:', stderr);
                resolve(false);
                return;
            }
            console.log('yt-dlp version:', stdout.trim());

            exec(`${ffmpegPath} -version`, (error, stdout, stderr) => {
                if (error) {
                    console.error('ffmpeg check failed:', error);
                    console.error('ffmpeg stderr:', stderr);
                    resolve(false);
                    return;
                }
                console.log('ffmpeg version:', stdout.split('\n')[0]);
                console.log('All dependencies are installed and working.');
                resolve(true);
            });
        });
    });
}

// Initialize yt-dlp with custom binary path
let ytDlp;
try {
    const ytDlpPath = path.join(binPath, 'yt-dlp');
    console.log('Initializing yt-dlp with path:', ytDlpPath);
    ytDlp = new YTDlpWrap(ytDlpPath);
    console.log('yt-dlp initialized successfully');
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
    const query = req.query.q;
    if (!query) {
        return res.status(400).json({ error: 'Query parameter is required' });
    }

    try {
        const ytDlpPath = path.join(binPath, 'yt-dlp');
        console.log('Searching for:', query);
        console.log('Using yt-dlp path:', ytDlpPath);

        const searchCommand = `"${ytDlpPath}" ytsearch10:"${query}" --dump-json --no-playlist --no-warnings --no-check-certificate`;
        console.log('Executing command:', searchCommand);

        exec(searchCommand, (error, stdout, stderr) => {
            if (error) {
                console.error('Search error:', error);
                console.error('stderr:', stderr);
                return res.status(500).json({ error: 'Failed to search videos', details: error.message });
            }

            try {
                const results = stdout.split('\n')
                    .filter(line => line.trim())
                    .map(line => {
                        try {
                            return JSON.parse(line);
                        } catch (e) {
                            console.error('Failed to parse result:', line);
                            return null;
                        }
                    })
                    .filter(result => result !== null)
                    .map(video => ({
                        id: video.id,
                        title: video.title,
                        thumbnail: video.thumbnail,
                        duration: video.duration,
                        uploader: video.uploader,
                        view_count: video.view_count
                    }));

                console.log(`Found ${results.length} results`);
                res.json(results);
            } catch (parseError) {
                console.error('Parse error:', parseError);
                res.status(500).json({ error: 'Failed to parse search results', details: parseError.message });
            }
        });
    } catch (error) {
        console.error('Setup error:', error);
        res.status(500).json({ error: 'Failed to setup search', details: error.message });
    }
});

// Download endpoint
app.get('/api/download', async (req, res) => {
    const videoId = req.query.id;
    if (!videoId) {
        return res.status(400).json({ error: 'Video ID is required' });
    }

    try {
        const ytDlpPath = path.join(binPath, 'yt-dlp');
        const ffmpegPath = path.join(binPath, 'ffmpeg');
        const outputPath = path.join(tempDir, `${videoId}.mp3`);

        // Create downloads directory if it doesn't exist
        const downloadsDir = path.join(__dirname, 'downloads');
        if (!fs.existsSync(downloadsDir)) {
            fs.mkdirSync(downloadsDir);
        }

        const downloadCommand = `"${ytDlpPath}" -x --audio-format mp3 --audio-quality 0 --ffmpeg-location "${ffmpegPath}" -o "${outputPath}" "https://www.youtube.com/watch?v=${videoId}"`;
        console.log('Executing command:', downloadCommand);

        exec(downloadCommand, (error, stdout, stderr) => {
            if (error) {
                console.error('Download error:', error);
                console.error('stderr:', stderr);
                return res.status(500).json({ error: 'Failed to download video', details: error.message });
            }

            if (!fs.existsSync(outputPath)) {
                return res.status(500).json({ error: 'Downloaded file not found' });
            }

            res.download(outputPath, (err) => {
                if (err) {
                    console.error('Send file error:', err);
                }
                // Clean up the file after sending
                fs.unlink(outputPath, (unlinkErr) => {
                    if (unlinkErr) {
                        console.error('Cleanup error:', unlinkErr);
                    }
                });
            });
        });
    } catch (error) {
        console.error('Setup error:', error);
        res.status(500).json({ error: 'Failed to setup download', details: error.message });
    }
});

// Health check endpoint
app.get('/health', async (req, res) => {
    const dependenciesOk = await checkDependencies();
    res.json({
        status: 'ok',
        dependencies: dependenciesOk ? 'installed' : 'missing',
        binPath: binPath,
        path: process.env.PATH,
        ytDlpPath: path.join(binPath, 'yt-dlp'),
        ffmpegPath: path.join(binPath, 'ffmpeg')
    });
});

app.listen(port, async () => {
    console.log(`Server running at http://localhost:${port}`);
    await checkDependencies();
}); 