const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

// Load Configuration
const configPath = path.join(__dirname, 'config.json');
let config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

/**
 * Scans directories recursively and merges data from progress.json
 */
function getFiles(dir, progress) {
    let results = [];
    const list = fs.readdirSync(dir);

    list.forEach(file => {
        if (config.excludedFolders.includes(file)) return;

        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat && stat.isDirectory()) {
            const children = getFiles(filePath, progress);
            const isFolderWatched = children.length > 0 && children.every(child => child.watched === true);
            results.push({ name: file, type: 'folder', watched: isFolderWatched, children: children });
        } else if (file.endsWith('.mp4')) {
            const relativePath = path.relative(config.videoDir, filePath);
            const entry = progress[relativePath] || {};
            results.push({
                name: file,
                type: 'file',
                path: relativePath,
                watched: !!entry.watched,
                time: entry.time || 0,
                lastUpdated: entry.lastUpdated || 0
            });
        }
    });
    return results;
}

app.get('/api/videos', (req, res) => {
    let progress = fs.existsSync(config.dbFile) ? JSON.parse(fs.readFileSync(config.dbFile, 'utf8')) : {};
    res.json(getFiles(config.videoDir, progress));
});

app.get(/^\/video\/(.*)/, (req, res) => {
    const filePath = path.join(config.videoDir, req.params[0]);
    if (!fs.existsSync(filePath)) return res.status(404).send('File not found');

    const stat = fs.statSync(filePath);
    const range = req.headers.range;

    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
        res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${stat.size}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': (end - start) + 1,
            'Content-Type': 'video/mp4',
        });
        fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
        res.writeHead(200, { 'Content-Length': stat.size, 'Content-Type': 'video/mp4' });
        fs.createReadStream(filePath).pipe(res);
    }
});

app.post('/api/watch', (req, res) => {
    const { filePath, watched, currentTime } = req.body;
    let progress = fs.existsSync(config.dbFile) ? JSON.parse(fs.readFileSync(config.dbFile, 'utf8')) : {};

    progress[filePath] = {
        ...progress[filePath],
        watched: watched !== undefined ? watched : (progress[filePath]?.watched || false),
        time: currentTime !== undefined ? currentTime : (progress[filePath]?.time || 0),
        lastUpdated: Date.now()
    };
    fs.writeFileSync(config.dbFile, JSON.stringify(progress, null, 2));
    res.sendStatus(200);
});

app.get('/api/config', (req, res) => {
    // Only send non-sensitive config data to the frontend
    res.json({
        skipSettings: config.skipSettings || { forward: 30, backward: 15 }
    });
});

// Binding to '0.0.0.0' allows access from other devices on the same network
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => console.log(`Private Video Library running at http://localhost:${PORT}`));