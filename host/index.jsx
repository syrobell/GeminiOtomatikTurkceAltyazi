// host/index.jsx
// Antigravity Subs Generator Host Script
// Completely Rewritten for Stability
// Date: 2025-12-09

var cachedPresetPath = null;

function exportCurrentSequenceAudio(outputPath, trackIndicesStr, useWorkArea) {
    try {
        var seq = app.project.activeSequence;
        if (!seq) {
            return "false";
        }

        // ENCODE_ENTIRE = 0, ENCODE_IN_OUT = 1, ENCODE_WORKAREA = 2
        var exportRange = (useWorkArea === "true" || useWorkArea === true) ? 2 : 0;

        // 1. Parse Target Tracks
        var targetTracks = null;
        if (trackIndicesStr && trackIndicesStr.length > 0) {
            targetTracks = [];
            var parts = trackIndicesStr.split(',');
            for (var t = 0; t < parts.length; t++) {
                // Ensure we parse standard integers
                var idx = parseInt(parts[t], 10);
                if (!isNaN(idx)) {
                    targetTracks.push(idx);
                }
            }
        }

        // 2. Mute Logic (Smart Mute)
        // We store original states to restore later
        var originalStates = [];

        // Populate original states and Apply Mute
        if (targetTracks !== null) {
            var audioTracks = seq.audioTracks;
            var numTracks = audioTracks.numTracks;

            for (var i = 0; i < numTracks; i++) {
                var track = audioTracks[i];
                originalStates.push(track.isMuted); // Store original state

                // Determine if this track should be ON or OFF
                // If it is in targetTracks, it should be Unmuted (False)
                // If it is NOT in targetTracks, it should be Muted (True)

                var isTarget = false;
                for (var k = 0; k < targetTracks.length; k++) {
                    if (targetTracks[k] === i) {
                        isTarget = true;
                        break;
                    }
                }

                var shouldBeMuted = !isTarget;

                // Apply change only if needed
                if (track.isMuted !== shouldBeMuted) {
                    safeSetMute(track, shouldBeMuted);
                }
            }
        }

        // 3. Find Preset (with Caching)
        if (!cachedPresetPath || !new File(cachedPresetPath).exists) {
            cachedPresetPath = findBestAudioPreset();
        }

        if (!cachedPresetPath || !new File(cachedPresetPath).exists) {
            // Restore before error
            if (targetTracks !== null) restoreMuteStates(seq, originalStates);
            return "error:PresetNotFound";
        }

        // 4. Export (Blocking)
        var result = seq.exportAsMediaDirect(outputPath, cachedPresetPath, exportRange);

        // 5. Restore States
        if (targetTracks !== null) restoreMuteStates(seq, originalStates);

        // Return Result (check file existence as well since exportAsMediaDirect can return 0/"No Error")
        var exportedFile = new File(outputPath);
        if (exportedFile.exists || result === true || result === "No Error" || result === 0) {
            return "true";
        }
        return "error:ExportFailed";

    } catch (e) {
        return "error:" + e.toString();
    }
}

function restoreMuteStates(seq, states) {
    if (!seq || !states) return;
    try {
        var numTracks = seq.audioTracks.numTracks;
        for (var i = 0; i < numTracks; i++) {
            if (i < states.length) {
                if (seq.audioTracks[i].isMuted !== states[i]) {
                    safeSetMute(seq.audioTracks[i], states[i]);
                }
            }
        }
    } catch (e) {
        // Ignore restore errors (best effort)
    }
}

// Helper: safeSetMute
// Tries multiple ways to set mute to avoid "Illegal Parameter" errors
function safeSetMute(track, muteState) {
    // Strategy 1: Direct Property Assignment (Modern)
    try {
        track.isMuted = muteState;
        return;
    } catch (e) { }

    // Strategy 2: setMute with Integer (Older)
    try {
        track.setMute(muteState ? 1 : 0);
        return;
    } catch (e) { }

    // Strategy 3: setMute with Boolean (Some versions)
    try {
        track.setMute(muteState);
        return;
    } catch (e) { }
}

function addPresetRootIfExists(presetRoots, pathStr) {
    if (!pathStr) return;
    var f = new Folder(pathStr);
    if (f.exists) {
        for (var i = 0; i < presetRoots.length; i++) {
            if (presetRoots[i].fsName === f.fsName) return;
        }
        presetRoots.push(f);
    }
}

function scanAppBundlesForPresets(folder, presetRoots) {
    if (!folder || !folder.exists) return;
    var items = folder.getFiles();
    if (!items) return;
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var decodedName = File.decode(item.name);
        if (decodedName.indexOf(".app") !== -1) {
            addPresetRootIfExists(presetRoots, item.fsName + "/Contents/MediaIO/systempresets");
        }
    }
}

function findBestAudioPreset() {
    var appPath = new File(app.path);
    var presetRoots = [];
    var decodedAppName = File.decode(appPath.name);

    // Windows & macOS direct paths relative to app.path
    var pathsToCheck = [
        appPath.fsName + "/MediaIO/systempresets",
        appPath.fsName + "/Contents/MediaIO/systempresets",
        appPath.fsName + "/" + decodedAppName + ".app/Contents/MediaIO/systempresets"
    ];

    if (appPath.parent) {
        pathsToCheck.push(appPath.parent.fsName + "/MediaIO/systempresets");
        pathsToCheck.push(appPath.parent.fsName + "/Contents/MediaIO/systempresets");
        pathsToCheck.push(appPath.parent.fsName + "/Adobe Media Encoder/Presets");
        if (appPath.parent.parent) {
            pathsToCheck.push(appPath.parent.parent.fsName + "/MediaIO/systempresets");
            pathsToCheck.push(appPath.parent.parent.fsName + "/Contents/MediaIO/systempresets");
        }
    }

    for (var i = 0; i < pathsToCheck.length; i++) {
        addPresetRootIfExists(presetRoots, pathsToCheck[i]);
    }

    // macOS: Scan inside appPath and /Applications for Adobe Premiere Pro / Media Encoder .app bundles
    scanAppBundlesForPresets(new Folder(appPath.fsName), presetRoots);
    if (appPath.parent) {
        scanAppBundlesForPresets(appPath.parent, presetRoots);
    }

    var macAppsFolder = new Folder("/Applications");
    if (macAppsFolder.exists) {
        var appDirs = macAppsFolder.getFiles();
        if (appDirs) {
            for (var d = 0; d < appDirs.length; d++) {
                var dirName = File.decode(appDirs[d].name).toLowerCase();
                if (dirName.indexOf("adobe premiere pro") !== -1 || dirName.indexOf("adobe media encoder") !== -1) {
                    if (dirName.indexOf(".app") !== -1) {
                        addPresetRootIfExists(presetRoots, appDirs[d].fsName + "/Contents/MediaIO/systempresets");
                    } else if (appDirs[d] instanceof Folder) {
                        scanAppBundlesForPresets(appDirs[d], presetRoots);
                    }
                }
            }
        }
    }

    if (presetRoots.length === 0) return null;

    // Strict Audio Priorities (handles both "192kbps" on macOS/newer versions and "192 kbps")
    var priorities = [
        "MP3 192kbps High Quality",
        "MP3 192 kbps High Quality",
        "MP3 256kbps High Quality",
        "MP3 128kbps",
        "MP3",
        "Stereo AAC",
        "AAC",
        "Waveform Audio",
        "WAV"
    ];

    for (var r = 0; r < presetRoots.length; r++) {
        var root = presetRoots[r];
        for (var p = 0; p < priorities.length; p++) {
            var found = recursiveSearch(root, priorities[p], 3);
            if (found) return found;
        }
    }

    // Fallback: any EPR
    for (var r = 0; r < presetRoots.length; r++) {
        var root = presetRoots[r];
        var any = recursiveSearch(root, ".epr", 4);
        if (any) return any;
    }

    return null;
}

function recursiveSearch(folder, term, depth) {
    if (depth <= 0) return null;

    var files = folder.getFiles();
    if (!files) return null;

    var searchLower = term.toLowerCase();

    // First pass: Files
    for (var i = 0; i < files.length; i++) {
        var f = files[i];
        if (f instanceof File) {
            // Decode URI-encoded names (e.g. "MP3%20192kbps..." -> "MP3 192kbps...")
            var decodedName = File.decode(f.name).toLowerCase();
            var rawName = f.name.toLowerCase();
            if (decodedName.indexOf(".epr") !== -1 || rawName.indexOf(".epr") !== -1) {
                if (searchLower === ".epr" || decodedName.indexOf(searchLower) !== -1 || rawName.indexOf(searchLower) !== -1) {
                    return f.fsName;
                }
            }
        }
    }

    // Second pass: Folders
    for (var i = 0; i < files.length; i++) {
        var f = files[i];
        if (f instanceof Folder) {
            var res = recursiveSearch(f, term, depth - 1);
            if (res) return res;
        }
    }

    return null;
}

function importSRT(srtPath) {
    try {
        if (!new File(srtPath).exists) return "error:FileNotFound";
        app.project.importFiles([srtPath], true, app.project.getInsertionBin(), false);
        return "true";
    } catch (e) {
        return "error:" + e.toString();
    }
}

function getInfo() {
    return "Antigravity Active";
}

function getProjectPath() {
    try {
        var projectPath = app.project.path;
        if (!projectPath || projectPath === "") {
            return "error:NoProject";
        }
        // Return the folder containing the project file
        var projectFile = new File(projectPath);
        return projectFile.parent.fsName;
    } catch (e) {
        return "error:" + e.toString();
    }
}

function getSequenceDuration(useWorkArea) {
    try {
        var seq = app.project.activeSequence;
        if (!seq) {
            return "error:NoSequence";
        }

        var durationTicks;
        if (useWorkArea === "true" || useWorkArea === true) {
            // Work area duration
            var inPoint = seq.getInPointAsTime();
            var outPoint = seq.getOutPointAsTime();
            durationTicks = outPoint.ticks - inPoint.ticks;
        } else {
            // Full sequence duration
            durationTicks = seq.end.ticks;
        }

        // Convert ticks to seconds (254016000000 ticks per second in Premiere)
        var TICKS_PER_SECOND = 254016000000;
        var durationSeconds = durationTicks / TICKS_PER_SECOND;

        return durationSeconds.toString();
    } catch (e) {
        return "error:" + e.toString();
    }
}
