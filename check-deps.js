const { exec } = require('child_process');
const path = require('path');

function checkCommand(command) {
    return new Promise((resolve) => {
        exec(command, (error) => {
            if (error) {
                console.error(`❌ ${command} is not installed or not in PATH`);
                resolve(false);
            } else {
                console.log(`✅ ${command} is installed`);
                resolve(true);
            }
        });
    });
}

async function checkDependencies() {
    console.log('Checking dependencies...\n');
    
    const ytDlpInstalled = await checkCommand('yt-dlp --version');
    const ffmpegInstalled = await checkCommand('ffmpeg -version');
    
    console.log('\nSummary:');
    if (!ytDlpInstalled) {
        console.log('\nTo install yt-dlp:');
        console.log('1. Download from: https://github.com/yt-dlp/yt-dlp/releases/latest');
        console.log('2. Download yt-dlp.exe');
        console.log('3. Place it in a directory in your PATH (e.g., C:\\Windows)');
    }
    
    if (!ffmpegInstalled) {
        console.log('\nTo install FFmpeg:');
        console.log('1. Download from: https://ffmpeg.org/download.html');
        console.log('2. Download the Windows build');
        console.log('3. Extract the files');
        console.log('4. Add the bin directory to your PATH');
    }
    
    if (ytDlpInstalled && ffmpegInstalled) {
        console.log('\nAll dependencies are installed! You can now run the application.');
    }
}

checkDependencies(); 