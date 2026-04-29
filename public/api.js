/**
 * VideoLibraryAPI Class
 * Handles all fetch requests to the backend.
 */
class VideoLibraryAPI {
    /**
     * Fetches the full video library tree
     */
    static async getLibrary() {
        const res = await fetch('/api/videos');
        return await res.json();
    }

    /**
     * Saves playback progress or watched status
     */
    static async saveProgress(path, time, watched = undefined) {
        return await fetch('/api/watch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filePath: path,
                currentTime: time,
                watched: watched
            })
        });
    }

    static async getConfig() {
        const res = await fetch('/api/config');
        return await res.json();
    }
}

window.VideoLibraryAPI = VideoLibraryAPI;