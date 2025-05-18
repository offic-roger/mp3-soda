document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');
    const resultsDiv = document.getElementById('results');
    const statusMessage = document.getElementById('statusMessage');
    const loadingSpinner = document.getElementById('loadingSpinner');

    // Format duration from seconds to MM:SS
    const formatDuration = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    // Show status message
    const showStatus = (message, isError = false) => {
        statusMessage.textContent = message;
        statusMessage.className = `text-center mb-8 ${isError ? 'text-red-500' : 'text-gray-400'}`;
        statusMessage.classList.remove('hidden');
    };

    // Show/hide loading spinner
    const toggleLoading = (show) => {
        loadingSpinner.classList.toggle('hidden', !show);
    };

    // Create result card
    const createResultCard = (video) => {
        const card = document.createElement('div');
        card.className = 'bg-gray-800 rounded-lg p-4 flex gap-4 items-center';
        
        card.innerHTML = `
            <img src="${video.thumbnail}" alt="${video.title}" class="w-32 h-24 object-cover rounded">
            <div class="flex-1">
                <h3 class="font-semibold mb-2">${video.title}</h3>
                <p class="text-gray-400 text-sm">Duration: ${formatDuration(video.duration)}</p>
            </div>
            <button class="download-btn px-4 py-2 bg-primary text-white rounded hover:bg-red-700 transition-colors"
                    data-url="${video.url}">
                Download MP3
            </button>
        `;

        return card;
    };

    // Handle search
    searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const query = searchInput.value.trim();
        
        if (!query) {
            showStatus('Please enter a search term or YouTube URL', true);
            return;
        }

        try {
            toggleLoading(true);
            showStatus('Searching...');
            resultsDiv.innerHTML = '';

            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Search failed');
            }

            if (data.length === 0) {
                showStatus('No results found');
                return;
            }

            statusMessage.classList.add('hidden');
            data.forEach(video => {
                resultsDiv.appendChild(createResultCard(video));
            });
        } catch (error) {
            showStatus(error.message, true);
        } finally {
            toggleLoading(false);
        }
    });

    // Handle downloads
    resultsDiv.addEventListener('click', async (e) => {
        if (e.target.classList.contains('download-btn')) {
            const url = e.target.dataset.url;
            const button = e.target;
            
            try {
                button.disabled = true;
                button.textContent = 'Converting...';
                showStatus('Converting to MP3...');

                const response = await fetch(`/api/download?url=${encodeURIComponent(url)}`);
                
                if (!response.ok) {
                    throw new Error('Download failed');
                }

                // Get filename from Content-Disposition header
                const contentDisposition = response.headers.get('Content-Disposition');
                const filename = contentDisposition
                    ? contentDisposition.split('filename=')[1].replace(/"/g, '')
                    : 'download.mp3';

                // Create blob and download
                const blob = await response.blob();
                const downloadUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(downloadUrl);

                showStatus('Download complete!');
            } catch (error) {
                showStatus(error.message, true);
            } finally {
                button.disabled = false;
                button.textContent = 'Download MP3';
            }
        }
    });
}); 