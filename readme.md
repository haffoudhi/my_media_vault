#Video Library Project

##Changes log

####1.0.2

###### Backend Architecture (config.json & server.js)

* External Config: Paths, exclusions, and skip intervals are now managed in config.json
* Dynamic API: Added /api/config to serve these settings to the frontend.
* Robust Streaming: The server handles partial content (206) for smooth scrubbing.

###### Frontend Architecture (Modular JS)

* api.js: A clean service layer using
* async/await for all server communication.
* player.js: A robust VideoPlayer class that handles the custom UI, fullscreen logic, and dynamic tooltip updates.
* script.js: The orchestrator that manages the file tree, auto-saving, and sidebar interactions.

###### UI & UX Improvements

* Custom Controls: A sleek, three-column layout (Playlist | Navigation | Utilities)
* Integrated Playlist: A scrollable overlay contained strictly within the video wrapper
* Dynamic Skips: Backward (15s) and Forward (30s) jumps, fully configurable
* Visual Tracking: Toggleable checkbox icons for "Watched" status that stay in sync across the library and playlist

####1.0.1

* Recursive Library Scanning: Browses your Windows Videos folder and subfolders.

* Intelligent Auto-Load: Automatically cues up the video with the most recent lastUpdated timestamp.

* Progress Resuming: Jumps to the exact currentTime saved in your progress.json.

* Collapsible Sidebar: Folders stay collapsed by default but auto-expand to show the currently playing file.

* Folder Exclusion: A blacklist to hide specific directories from the UI.

* Visual Feedback: Strikethroughs for watched content and dynamic progress bars behind file names.