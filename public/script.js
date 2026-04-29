window.addEventListener('DOMContentLoaded', async () => {
    let currentPath = "";
    let libraryData = [];
    let isAutoSaving = false;

    const playerUI = new VideoPlayer({
        videoId: 'mainPlayer',
        wrapperId: 'video-wrapper',
        progressBarClass: '.progress-bar',
        progressAreaClass: '.progress-area',
        playBtnId: 'play-pause',
        fullscreenBtnId: 'fullscreen-btn',
        onProgressUpdate: (t) => {
            if(!isAutoSaving && currentPath) {
                isAutoSaving = true;
                setTimeout(() => {
                    VideoLibraryAPI.saveProgress(currentPath, t);
                    isAutoSaving = false;
                }, 5000);
            }
        },
        onVideoSelect: (p, n) => {
            loadVideo(p, n);
            playerUI.video.play();
            document.getElementById('playlist-overlay').classList.add('hidden');
        }
    });

    // Load config from server
    async function loadConfig() {
        const configData = await VideoLibraryAPI.getConfig();console.log(configData)
        if (configData.skipSettings) {
            playerUI.updateSettings(configData.skipSettings);
        }
    }

    async function loadVideo(path, name) {
        currentPath = path;
        const info = findInTree(libraryData, path);
        playerUI.load(path, name, info ? info.time : 0);
        updateUI();
    }

    async function refresh() {
        libraryData = await VideoLibraryAPI.getLibrary();
        const explorer = document.getElementById('explorer');
        explorer.innerHTML = "";
        renderTree(libraryData, explorer);
        if (currentPath) updateUI();
        else {
            const latest = findLatest(libraryData);
            if (latest) loadVideo(latest.path, latest.name);
        }
    }

    function renderTree(nodes, parent) {
        nodes.forEach(node => {
            const div = document.createElement('div');
            if (node.type === 'folder') {
                div.className = `folder ${node.watched ? 'watched' : ''}`;
                div.innerHTML = `📁 ${node.name}`;
                const childBox = document.createElement('div');
                childBox.className = 'nested';
                div.onclick = (e) => {
                    e.stopPropagation();
                    div.classList.toggle('open');
                    childBox.classList.toggle('open');
                };
                renderTree(node.children, childBox);
                parent.appendChild(div);
                parent.appendChild(childBox);
            } else {
                div.className = `file ${node.watched ? 'watched' : ''}`;
                div.dataset.path = node.path;
                div.innerHTML = `▶ ${node.name}`;
                div.onclick = (e) => {
                    e.stopPropagation();
                    loadVideo(node.path, node.name);
                    playerUI.video.play();
                };
                parent.appendChild(div);
            }
        });
    }

    function updateUI() {
        const video = findInTree(libraryData, currentPath);

        // Sync the checkbox icon
        playerUI.setWatchedUI(!!video?.watched);

        document.querySelectorAll('.file').forEach(f => {
            f.classList.toggle('active', f.dataset.path === currentPath);
            let p = f.parentElement;
            if(f.dataset.path === currentPath) {
                while(p && p.id !== 'explorer') {
                    if(p.classList.contains('nested')) {
                        p.classList.add('open');
                        if(p.previousElementSibling) p.previousElementSibling.classList.add('open');
                    }
                    p = p.parentElement;
                }
            }
        });
    }

    function findInTree(nodes, path) {
        for (const n of nodes) {
            if (n.path === path) return n;
            if (n.children) {
                const f = findInTree(n.children, path);
                if (f) return f;
            }
        }
        return null;
    }

    function findLatest(nodes) {
        let latest = null;
        function walk(items) {
            items.forEach(n => {
                if (n.type === 'file' && n.lastUpdated > (latest?.lastUpdated || 0)) latest = n;
                if (n.children) walk(n.children);
            });
        }
        walk(nodes);
        return latest;
    }

    document.getElementById('playlist-toggle').onclick = () => {
        const el = document.getElementById('playlist-overlay');
        el.classList.toggle('hidden');
        if (!el.classList.contains('hidden')) playerUI.renderPlaylist(currentPath, libraryData);
    };

    document.getElementById('close-playlist').onclick = () => {
        document.getElementById('playlist-overlay').classList.add('hidden');
    };

    document.getElementById('markWatched').onclick = async () => {
        const v = findInTree(libraryData, currentPath);
        await VideoLibraryAPI.saveProgress(currentPath, playerUI.video.currentTime, !v?.watched);
        await refresh();
    };

    await loadConfig(); // Load settings first
    refresh();          // Then load library
});