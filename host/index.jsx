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

        // Return Result
        return result ? "true" : "error:ExportFailed";

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

function findBestAudioPreset() {
    var appPath = new File(app.path);
    var presetRoots = [];

    // System Preset paths
    var pathsToCheck = [
        appPath.fsName + "/MediaIO/systempresets",
        appPath.parent.fsName + "/MediaIO/systempresets",
        appPath.parent.fsName + "/Adobe Media Encoder/Presets"
    ];

    for (var i = 0; i < pathsToCheck.length; i++) {
        var f = new Folder(pathsToCheck[i]);
        if (f.exists) presetRoots.push(f);
    }

    if (presetRoots.length === 0) return null;

    // Strict Audio Priorities. 
    // User requested "MP3 192 kbps High Quality" specifically.
    var priorities = ["MP3 192 kbps High Quality", "MP3", "AAC", "WAV"];

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

    // First pass: Files
    for (var i = 0; i < files.length; i++) {
        var f = files[i];
        if (f instanceof File) {
            var name = f.name.toLowerCase();
            if (name.indexOf(".epr") !== -1) {
                // If term is just .epr, matches everything.
                // Else check specific term (e.g. "mp3")
                if (term === ".epr" || name.indexOf(term.toLowerCase()) !== -1) {
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
