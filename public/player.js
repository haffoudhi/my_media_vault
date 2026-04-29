/**
 * VideoPlayer Class
 * Handles UI interactions, keyboard shortcuts, and inactivity tracking.
 */
class VideoPlayer {
    /**
     * @param {Object} options Configuration for IDs and classes
     */
    constructor(options) {
        // UI Element Selectors
        this.video = document.getElementById(options.videoId);
        this.wrapper = document.getElementById(options.wrapperId);
        this.progressBar = document.querySelector(options.progressBarClass);
        this.progressArea = document.querySelector(options.progressAreaClass);
        this.playBtn = document.getElementById(options.playBtnId);
        this.fullBtn = document.getElementById(options.fullscreenBtnId);
        this.watchedIcon = document.getElementById('watched-icon');

        this.clickTimer = null;

        this.currentTimeElem = document.getElementById('current-time');
        this.totalDurationElem = document.getElementById('total-duration');

        // Audio & Playlist Selectors
        this.muteBtn = document.getElementById('mute-btn');
        this.volumeSlider = document.getElementById('volume-slider');
        this.playlistOverlay = document.getElementById('playlist-overlay');

        // Skip Button Selectors
        this.skipBackBtn = document.getElementById('skip-back');
        this.skipForwardBtn = document.getElementById('skip-forward');

        // Middle Overlay Visuals
        this.middleOverlay = document.getElementById('middle-play-overlay');
        this.middleIcon = this.middleOverlay.querySelector('i');

        // Configurable Parameters
        this.settings = {
            /** @type {number} Seconds to skip back */
            backward: 15,
            /** @type {number} Seconds to skip forward */
            forward: 30,
            /** @type {number} Volume level before muting */
            prevVolume: 1.0
        };

        this.onProgressUpdate = options.onProgressUpdate;
        this.onVideoSelect = options.onVideoSelect;

        this.idleTimer = null;
        this.overlayTimer = null; // Timer ID for transient icons (skipping)

        this.init();
        this.initKeyboardShortcuts();
    }

    /**
     * Applies dynamic settings to the player
     * @param {Object} settings - Configuration object
     */
    updateSettings(settings) {
        if (settings.backward) this.settings.backward = settings.backward;
        if (settings.forward) this.settings.forward = settings.forward;

        console.log(`Settings Applied: -${this.settings.backward}s / +${this.settings.forward}s`);
    }

    /**
     * Adjusts video time and shows a temporary icon
     * @param {number} seconds - Relative seconds to skip
     */
    skip(seconds) {
        this.video.currentTime = Math.min(this.video.duration, Math.max(0, this.video.currentTime + seconds));

        // Skip icons should always be temporary
        this.showTransientIcon(seconds > 0 ? 'fa-forward' : 'fa-backward');
    }

    /**
     * Toggles play/pause state
     */
    togglePlay() {
        if (this.video.paused) {
            this.video.play();
        } else {
            this.video.pause();
        }
        // State-based visibility is handled by the 'onplay' and 'onpause' listeners in init()
    }

    /**
     * Shows an icon that hides automatically after a delay
     * Used for skipping feedback.
     * @param {string} iconClass - FontAwesome class
     */
    showTransientIcon(iconClass) {
        this.middleIcon.className = `fas ${iconClass}`;
        this.middleOverlay.classList.add('show');

        clearTimeout(this.overlayTimer);
        this.overlayTimer = setTimeout(() => {
            // Only hide if the video is currently playing
            if (!this.video.paused) {
                this.middleOverlay.classList.remove('show');
            } else {
                // If paused, ensure the middle icon reverts to the play icon
                this.middleIcon.className = 'fas fa-play';
            }
        }, 800);
    }

    /**
     * Sets up keyboard listeners
     */
    initKeyboardShortcuts() {
        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            switch(e.key.toLowerCase()) {
                case ' ': // Spacebar
                    e.preventDefault();
                    this.togglePlay();
                    break;
                case 'l': // Toggle Playlist
                    document.getElementById('playlist-toggle').click();
                    break;
                case 'm': // Toggle Mute
                    this.muteBtn.click();
                    break;
                case 'f': // Fullscreen
                    this.toggleFullscreen();
                    break;
                case 'arrowright': // Skip Forward
                    this.skip(this.settings.forward);
                    break;
                case 'arrowleft': // Skip Backward
                    this.skip(-this.settings.backward);
                    break;
                case 'arrowup': // Vol Up
                    e.preventDefault();
                    this.video.volume = Math.min(1, this.video.volume + 0.05);
                    this.volumeSlider.value = this.video.volume;
                    this.updateVolumeIcon();
                    break;
                case 'arrowdown': // Vol Down
                    e.preventDefault();
                    this.video.volume = Math.max(0, this.video.volume - 0.05);
                    this.volumeSlider.value = this.video.volume;
                    this.updateVolumeIcon();
                    break;
            }
        });
    }

    /**
     * Toggles visibility of playlist
     */
    togglePlaylist() {
        this.playlistOverlay.classList.toggle('hidden');
    }

    /**
     * Converts seconds into a readable MM:SS or HH:MM:SS format
     * @param {number} timeInSeconds
     * @returns {string}
     */
    formatTime(timeInSeconds) {
        const result = new Date(timeInSeconds * 1000).toISOString().slice(11, 19);
        const [hours, minutes, seconds] = result.split(':');

        if (parseInt(hours) > 0) {
            return `${hours}:${minutes}:${seconds}`;
        }
        return `${minutes}:${seconds}`;
    }

    /**
     * Updates mute icon based on volume level
     */
    updateVolumeIcon() {
        const icon = this.muteBtn.querySelector('i');
        if (this.video.muted || this.video.volume === 0) {
            icon.className = 'fas fa-volume-mute';
        } else if (this.video.volume < 0.5) {
            icon.className = 'fas fa-volume-down';
        } else {
            icon.className = 'fas fa-volume-up';
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            this.wrapper.requestFullscreen().catch(err => console.error(err));
        } else {
            document.exitFullscreen();
        }
    }

    init() {
        this.playBtn.onclick = () => this.togglePlay();
        this.skipBackBtn.onclick = () => this.skip(-this.settings.backward);
        this.skipForwardBtn.onclick = () => this.skip(this.settings.forward);

        this.video.onclick = (e) => {
            e.stopPropagation();

            if (this.clickTimer) {
                // --- DOUBLE CLICK DETECTED ---
                clearTimeout(this.clickTimer);
                this.clickTimer = null;

                const rect = this.video.getBoundingClientRect();
                const clickX = e.clientX - rect.left; // Position relative to video width
                const isRightSide = clickX > rect.width / 2;

                if (isRightSide) {
                    this.skip(this.settings.forward);
                } else {
                    this.skip(-this.settings.backward);
                }
            } else {
                // --- POTENTIAL SINGLE CLICK ---
                this.clickTimer = setTimeout(() => {
                    this.togglePlay();
                    this.clickTimer = null;
                }, 250); // 250ms is the sweet spot for double-click detection
            }
        };

        // UI Sync for Play/Pause
        this.video.onplay = () => {
            this.playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            this.middleOverlay.classList.remove('show');
        };

        this.video.onpause = () => {
            this.playBtn.innerHTML = '<i class="fas fa-play"></i>';
            this.middleIcon.className = 'fas fa-play';
            this.middleOverlay.classList.add('show');
        };

        this.fullBtn.onclick = () => this.toggleFullscreen();

        /**
         * DURATION AND METADATA
         * Triggered once the video file is loaded enough to know its length.
         */
        this.video.onloadedmetadata = () => {
            // Set the total duration text (e.g., 24:00)
            this.totalDurationElem.innerText = this.formatTime(this.video.duration);

            // If a start time was passed from the library, jump to it
            if (this.startTime > 0) {
                this.video.currentTime = this.startTime;
            }
        };

        /**
         * PROGRESS UPDATES
         * Triggered continuously while the video plays.
         */
        this.video.ontimeupdate = () => {
            if (!this.video.duration) return; // Safety check

            // 1. Calculate percentage for the bar
            const percent = (this.video.currentTime / this.video.duration) * 100;
            this.progressBar.style.width = `${percent}%`;

            // 2. Update the timestamp text (Current Time)
            this.currentTimeElem.innerText = this.formatTime(this.video.currentTime);

            // 3. Inform the app that progress has changed (for auto-saving)
            if (this.onProgressUpdate) {
                this.onProgressUpdate(this.video.currentTime);
            }
        };

        this.volumeSlider.oninput = (e) => {
            const val = parseFloat(e.target.value);
            this.video.volume = val;
            this.video.muted = (val === 0);
            this.updateVolumeIcon();
        };

        this.muteBtn.onclick = () => {
            if (this.video.volume > 0 && !this.video.muted) {
                this.settings.prevVolume = this.video.volume;
                this.video.volume = 0;
                this.video.muted = true;
            } else {
                this.video.volume = this.settings.prevVolume;
                this.video.muted = false;
            }
            this.volumeSlider.value = this.video.volume;
            this.updateVolumeIcon();
        };

        document.getElementById('playlist-toggle').onclick = () => this.togglePlaylist();
        document.getElementById('close-playlist').onclick = () => this.togglePlaylist();

        const handleActivity = () => {
            const controls = document.querySelector('.controls');
            controls.classList.remove('idle');
            this.wrapper.style.cursor = 'default';
            clearTimeout(this.idleTimer);

            this.idleTimer = setTimeout(() => {
                if (!this.video.paused) {
                    controls.classList.add('idle');
                    this.wrapper.style.cursor = 'none';
                }
            }, 3000);
        };

        this.wrapper.addEventListener('mousemove', handleActivity);
        this.video.addEventListener('play', handleActivity);

        document.addEventListener('fullscreenchange', () => {
            this.fullBtn.innerHTML = document.fullscreenElement ?
                '<i class="fas fa-compress"></i>' : '<i class="fas fa-expand"></i>';
        });

        this.progressArea.onclick = (e) => {
            this.video.currentTime = (e.offsetX / this.progressArea.clientWidth) * this.video.duration;
        };
    }

    setWatchedUI(isWatched) {
        this.watchedIcon.className = isWatched ? "fas fa-check-square" : "far fa-square";
    }

    load(path, name, startTime = 0) {
        this.video.src = `/video/${encodeURIComponent(path)}`;
        this.video.currentTime = startTime;
        document.getElementById('now-playing').innerText = name;
    }

    renderPlaylist(currentPath, libraryData) {
        const container = document.getElementById('playlist-items');
        container.innerHTML = "";

        const parts = currentPath.split('\\');
        parts.pop();
        let currentDir = libraryData;
        parts.forEach(p => {
            const found = currentDir.find(n => n.name === p);
            if (found) currentDir = found.children;
        });

        currentDir.forEach(file => {
            if (file.type === 'file') {
                const item = document.createElement('div');
                // Added "watched" class check
                item.className = `playlist-item ${file.path === currentPath ? 'active' : ''} ${file.watched ? 'watched' : ''}`;

                const icon = file.watched ? 'fa-check-square' : 'fa-play';
                item.innerHTML = `<span><i class="fas ${icon}"></i></span> ${file.name}`;

                item.onclick = () => {
                    this.load(file.path, file.name);
                    this.video.play();
                };
                container.appendChild(item);
            }
        });
    }
}