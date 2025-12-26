/* client/main.js */
(function () {
    'use strict';

    var csInterface = new CSInterface();
    var lastGeneratedSrtContent = null;

    function init() {
        themeManager.init();
        document.getElementById('btnGenerate').addEventListener('click', startGeneration);
        document.getElementById('btnCheckModels').addEventListener('click', fetchModels);
        document.getElementById('btnExportSrt').addEventListener('click', exportSrt);
        document.getElementById('btnAiMagic').addEventListener('click', openAiModal);
        document.getElementById('closeModal').addEventListener('click', closeAiModal);
        document.getElementById('btnAiGenerate').addEventListener('click', generateAiContent);
        document.getElementById('btnCopyResult').addEventListener('click', copyAiResult);
    }

    async function fetchModels() {
        const apiKey = document.getElementById('apiKey').value;
        const statusDiv = document.getElementById('status');
        const modelSelect = document.getElementById('modelId');

        if (!apiKey) {
            statusDiv.textContent = "Hata: Önce API Key girin.";
            statusDiv.style.color = "red";
            return;
        }

        statusDiv.textContent = "Mevcut modeller alınıyor...";
        statusDiv.style.color = "#aaa";

        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
            const response = await fetch(url);

            if (!response.ok) {
                const errText = await response.text();
                throw new Error("Modeller alınamadı: " + errText);
            }

            const data = await response.json();
            if (!data.models) throw new Error("Yanıtta model bulunamadı.");

            // Clear existing options
            modelSelect.innerHTML = "";
            let bestModel = "";

            // Filter for generateContent supported models
            const contentModels = data.models.filter(m =>
                m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")
            );

            contentModels.forEach(model => {
                // model.name comes as "models/gemini-1.5-flash"
                const id = model.name.replace("models/", "");
                const option = document.createElement('option');
                option.value = id;
                option.textContent = `${model.displayName} (${id})`;
                modelSelect.appendChild(option);

                // Auto-selection priority:
                // 1. Gemini 2.0 Flash variants (esp. exp/latest) - "Flash 2.5"
                // 2. Gemini 1.5 Flash variants (fallback)
                if (id.includes("gemini-2.0-flash")) {
                    // Prefer exp or latest versions for 2.0
                    if (id.includes("exp") || id.includes("latest")) {
                        bestModel = id;
                    } else if (!bestModel.includes("gemini-2.0-flash")) {
                        bestModel = id;
                    }
                } else if (id.includes("gemini-1.5-flash") && !bestModel.includes("gemini-2.0")) {
                    // Fallback to 1.5 if no 2.0 found yet
                    if (!bestModel || id.includes("002") || id.includes("latest")) {
                        bestModel = id;
                    }
                }
            });

            statusDiv.textContent = `Başarılı! ${contentModels.length} model yüklendi.`;
            statusDiv.style.color = "#4cdeb3";

            // Enable the dropdown after successful fetch
            modelSelect.disabled = false;

            // Auto-select best option
            if (bestModel) {
                modelSelect.value = bestModel;
            } else if (contentModels.length > 0) {
                modelSelect.selectedIndex = 0;
            }

        } catch (e) {
            console.error(e);
            statusDiv.textContent = "Hata: " + e.message;
            statusDiv.style.color = "red";
        }
    }

    async function startGeneration() {
        const apiKey = document.getElementById('apiKey').value;
        const maxWords = document.getElementById('maxWords').value;
        const statusDiv = document.getElementById('status');

        if (!apiKey) {
            statusDiv.textContent = "Hata: Lütfen API Key girin.";
            statusDiv.style.color = "red";
            return;
        }

        // UX: Start Loading State
        statusDiv.classList.add('pulse');
        statusDiv.textContent = "Ses dosyası export ediliyor...";
        statusDiv.style.color = "#aaa";

        try {
            if (typeof require !== 'function') {
                statusDiv.textContent = "Hata: Node.js manifest'te devre dışı.";
                return;
            }

            const path = require('path');
            const os = require('os');
            const fs = require('fs');
            const cp = require('child_process');

            const tempDir = os.tmpdir();
            const timestamp = Date.now();
            const audioPath = path.join(tempDir, `premiere_audio_${timestamp}.mp3`);

            // Get project folder for SRT (permanent storage)
            let srtPath;
            const projectPathPromise = new Promise((resolve) => {
                csInterface.evalScript('getProjectPath()', (result) => {
                    resolve(result);
                });
            });
            const projectFolder = await projectPathPromise;

            if (projectFolder && !projectFolder.startsWith('error:')) {
                // Save SRT next to project file
                srtPath = path.join(projectFolder, `subtitles_${timestamp}.srt`);
                statusDiv.textContent = "Proje klasörü kullanılıyor...";
            } else {
                // Fallback to temp if project not saved yet
                srtPath = path.join(tempDir, `premiere_subs_${timestamp}.srt`);
                console.log("Project not saved, using temp folder for SRT");
            }

            // Collect contents of selected tracks
            var activeTracks = [];
            var formTracks = document.querySelectorAll('.track-cb:checked');
            formTracks.forEach(function (cb) {
                activeTracks.push(cb.value);
            });
            var trackString = activeTracks.join(',');

            const safeAudioPath = audioPath.replace(/\\/g, '\\\\');

            const workAreaOnly = document.getElementById('workAreaOnly').checked;

            statusDiv.textContent = "Track'ler işleniyor ve export ediliyor...";

            csInterface.evalScript(`exportCurrentSequenceAudio("${safeAudioPath}", "${trackString}", "${workAreaOnly}")`, async (result) => {
                if (result.indexOf('error:PresetNotFound') !== -1) {
                    statusDiv.textContent = "Hata: Ses export preset'i bulunamadı. Lütfen varsayılan preset'leri yükleyin.";
                    statusDiv.style.color = "red";
                    statusDiv.classList.remove('pulse'); // UX Stop
                    return;
                }
                if (result.indexOf('error') !== -1) {
                    statusDiv.textContent = "Export başarısız: " + result;
                    statusDiv.style.color = "red";
                    statusDiv.classList.remove('pulse'); // UX Stop
                    return;
                }
                if (result === 'false' || result === 'undefined') {
                    statusDiv.textContent = "Hata: Export başarısız. Aktif sekans yok mu?";
                    statusDiv.classList.remove('pulse'); // UX Stop
                    return;
                }

                statusDiv.textContent = "Ses export edildi. Sekans süresi alınıyor...";

                // Get sequence duration from Premiere (most reliable source)
                let sequenceDurationMs = null;
                try {
                    const durationPromise = new Promise((resolve) => {
                        csInterface.evalScript(`getSequenceDuration("${workAreaOnly}")`, (result) => {
                            resolve(result);
                        });
                    });
                    const durationResult = await durationPromise;
                    if (durationResult && !durationResult.startsWith('error')) {
                        sequenceDurationMs = parseFloat(durationResult) * 1000; // Convert to ms
                        console.log(`Sequence duration from Premiere: ${(sequenceDurationMs / 1000).toFixed(2)}s`);
                    }
                } catch (e) {
                    console.warn("Could not get sequence duration:", e);
                }

                try {
                    // Check Token Saver Speed
                    const speedSelect = document.getElementById('speedSaver');
                    const speedFactor = parseFloat(speedSelect ? speedSelect.value : "1.0");
                    let finalAudioPath = audioPath;

                    if (speedFactor > 1.0) {
                        statusDiv.textContent = `Ses optimize ediliyor (${speedFactor}x)...`;
                        const fastAudioPath = path.join(tempDir, `premiere_audio_fast_${timestamp}.mp3`);
                        try {
                            await optimizeAudio(audioPath, fastAudioPath, speedFactor);
                            finalAudioPath = fastAudioPath;
                        } catch (optErr) {
                            console.error("Optimization failed, falling back to original", optErr);
                            statusDiv.textContent = "Optimizasyon başarısız. Orijinal ses kullanılıyor...";
                        }
                    }

                    statusDiv.textContent = `Transkripsiyon yapılıyor (${speedFactor}x)...`;
                    await transcribeWithGemini(apiKey, finalAudioPath, srtPath, maxWords, speedFactor, sequenceDurationMs);
                    statusDiv.textContent = "Transkripsiyon tamamlandı. SRT import ediliyor...";

                    const safeSrtPath = srtPath.replace(/\\/g, '\\\\');
                    csInterface.evalScript(`importSRT("${safeSrtPath}")`, (importResult) => {
                        document.getElementById('btnExportSrt').disabled = false;
                        statusDiv.textContent = "Tamamlandı! SRT import edildi.";
                        statusDiv.style.color = "#4cdeb3";
                        statusDiv.classList.remove('pulse'); // UX Stop

                        try {
                            if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
                            if (fs.existsSync(srtPath)) fs.unlinkSync(srtPath);
                            const fastPath = path.join(tempDir, `premiere_audio_fast_${timestamp}.mp3`);
                            if (fs.existsSync(fastPath)) fs.unlinkSync(fastPath);
                        } catch (e) {
                            console.error("Cleanup error", e);
                        }
                    });

                } catch (err) {
                    console.error(err);
                    let msg = err.message;

                    // Smart Error Parsing
                    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
                        msg = "Kota aşıldı (429). Bu model (" + document.getElementById('modelId').value + ") kullanılamayabilir. 'Gemini 1.5 Flash' deneyin.";
                    } else if (msg.includes('400') && msg.includes('File API')) {
                        msg = "File API hatası. Token Saver'ı kapatın veya daha kısa dosya kullanın.";
                    }

                    statusDiv.textContent = "API Hatası: " + msg;
                    statusDiv.style.color = "red";
                    statusDiv.classList.remove('pulse'); // UX Stop
                }
            });

        } catch (e) {
            statusDiv.textContent = "Sistem Hatası: " + e.message;
            statusDiv.style.color = "red";
            statusDiv.classList.remove('pulse'); // UX Stop
        }
    }

    function exportSrt() {
        if (!lastGeneratedSrtContent) return;

        var result = window.cep.fs.showSaveDialogEx("Export SRT", "undefined", ["srt"], "subtitles.srt");
        if (result.data) {
            var path = result.data;
            // Ensure .srt extension
            if (!path.toLowerCase().endsWith(".srt")) {
                path += ".srt";
            }
            window.cep.fs.writeFile(path, lastGeneratedSrtContent);
        }
    }


    // --- AI Modal Logic ---

    function openAiModal() {
        if (!lastGeneratedSrtContent) {
            alert("Please generate subtitles first to use them as context!");
            return;
        }
        document.getElementById('aiModal').style.display = 'flex';
    }

    function closeAiModal() {
        document.getElementById('aiModal').style.display = 'none';
    }

    function copyAiResult() {
        const resultText = document.getElementById('aiResult');
        resultText.select();
        document.execCommand('copy');
        const btn = document.getElementById('btnCopyResult');
        const originalText = btn.textContent;
        btn.textContent = "Copied! ✅";
        setTimeout(() => btn.textContent = originalText, 2000);
    }

    async function generateAiContent() {
        const apiKey = document.getElementById('apiKey').value;
        const context = document.getElementById('aiContext').value;
        const userPrompt = document.getElementById('aiPrompt').value;
        const resultArea = document.getElementById('aiResult');
        const container = document.getElementById('aiResultContainer');
        const copyBtn = document.getElementById('btnCopyResult');

        if (!apiKey) {
            alert("Please enter API Key.");
            return;
        }

        container.style.display = 'flex';
        copyBtn.style.display = 'none'; // Hide until success
        resultArea.value = "Thinking... 🪄";

        try {
            const systemInstruction = `
            You are a creative social media manager. 
            Use the provided TRANSCRIPT and CONTEXT to fulfill the user's TASK.
            `;

            const fullPrompt = `
            TRANSCRIPT:
            ${lastGeneratedSrtContent}

            CONTEXT:
            ${context}

            TASK:
            ${userPrompt}
            `;

            const modelIdInput = document.getElementById('modelId');
            const modelName = modelIdInput ? modelIdInput.value.trim() : "gemini-1.5-flash";

            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

            const payload = {
                contents: [{
                    parts: [{ text: systemInstruction + "\n" + fullPrompt }]
                }]
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText);
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (text) {
                resultArea.value = text;
                copyBtn.style.display = 'block'; // Show copy button on success
            } else {
                resultArea.value = "No content generated.";
            }

        } catch (e) {
            resultArea.value = "Error: " + e.message;
        }
    }




    async function uploadToGemini(apiKey, filePath, mimeType) {
        const fs = require('fs');
        const stats = fs.statSync(filePath);
        const fileSize = stats.size;

        // Better Buffer handling for Browser Fetch
        const fileBuffer = fs.readFileSync(filePath);
        const blob = new Blob([fileBuffer], { type: mimeType });

        // Update status for debugging
        const statusDiv = document.getElementById('status');
        statusDiv.textContent = `Uploading ${(fileSize / 1024 / 1024).toFixed(2)} MB to Gemini...`;

        const url = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'X-Goog-Upload-Protocol': 'raw',
                'X-Goog-Upload-Command': 'start, upload, finalize',
                'X-Goog-Upload-Header-Content-Length': fileSize,
                'X-Goog-Upload-Header-Content-Type': mimeType,
                'Content-Type': mimeType
            },
            body: blob // Send as Blob
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Upload Failed: ${errText}`);
        }

        const data = await response.json();
        return data.file.uri;
    }

    function optimizeAudio(input, output, speed) {
        return new Promise((resolve, reject) => {
            const cp = require('child_process');
            // ffmpeg -i input -filter:a "atempo=1.5" -vn output
            const cmd = `ffmpeg -y -i "${input}" -filter:a "atempo=${speed}" -vn "${output}"`;

            cp.exec(cmd, (err, stdout, stderr) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(output);
                }
            });
        });
    }

    // Get audio duration using ffprobe
    function getAudioDuration(audioPath) {
        return new Promise((resolve, reject) => {
            const cp = require('child_process');
            const cmd = `ffprobe -v error -show_entries format=duration -of csv=p=0 "${audioPath}"`;

            cp.exec(cmd, (err, stdout, stderr) => {
                if (err) {
                    console.warn("ffprobe error, falling back to no duration check:", err);
                    resolve(null); // Return null if ffprobe fails
                } else {
                    const duration = parseFloat(stdout.trim());
                    if (isNaN(duration)) {
                        resolve(null);
                    } else {
                        resolve(duration * 1000); // Convert to milliseconds
                    }
                }
            });
        });
    }

    // Scale all timings proportionally to match actual audio duration
    // This function ALWAYS scales to ensure subtitles match video length
    function scaleTimingsToAudioDuration(segments, actualDurationMs, parseTimeFn, formatTimeFn) {
        if (!actualDurationMs || segments.length === 0) return segments;

        const lastSegment = segments[segments.length - 1];
        const lastEndMs = parseTimeFn(lastSegment.end);

        // Safety check: if Gemini returned 0 or very small timestamps, skip scaling
        if (lastEndMs < 1000) {
            console.warn("Gemini timestamps too small, skipping scale");
            return segments;
        }

        const scale = actualDurationMs / lastEndMs;
        const difference = Math.abs(lastEndMs - actualDurationMs) / actualDurationMs;

        console.log(`Scaling timings: Gemini=${(lastEndMs / 1000).toFixed(2)}s -> Actual=${(actualDurationMs / 1000).toFixed(2)}s (scale factor: ${scale.toFixed(3)}, diff: ${(difference * 100).toFixed(1)}%)`);

        for (let i = 0; i < segments.length; i++) {
            const startMs = parseTimeFn(segments[i].start) * scale;
            let endMs = parseTimeFn(segments[i].end) * scale;

            // Ensure last segment ends exactly at audio duration
            if (i === segments.length - 1) {
                endMs = Math.min(endMs, actualDurationMs);
            }

            segments[i].start = formatTimeFn(Math.round(startMs));
            segments[i].end = formatTimeFn(Math.round(endMs));
        }

        return segments;
    }

    async function transcribeWithGemini(apiKey, audioPath, outputPath, maxWords, timeMultiplier = 1.0, sequenceDurationMs = null) {
        const fs = require('fs');
        const mimeType = "audio/mp3";

        // Status update for Upload
        const statusDiv = document.getElementById('status');

        // Use sequence duration from Premiere (most reliable) or fallback to ffprobe
        let actualAudioDurationMs = sequenceDurationMs;

        if (!actualAudioDurationMs) {
            // Fallback: try to get duration from audio file using ffprobe
            statusDiv.textContent = `Ses süresi hesaplanıyor...`;
            actualAudioDurationMs = await getAudioDuration(audioPath);
            if (actualAudioDurationMs) {
                // If speed optimization was applied, original duration = optimized duration * multiplier
                actualAudioDurationMs = actualAudioDurationMs * timeMultiplier;
            }
        }

        if (actualAudioDurationMs) {
            console.log(`Target duration for scaling: ${(actualAudioDurationMs / 1000).toFixed(2)}s`);
        } else {
            console.warn("WARNING: Could not determine audio duration. Timing may be incorrect!");
        }

        statusDiv.textContent = `Gemini'ye yükleniyor...`;

        // 1. Upload File
        let fileUri;
        try {
            fileUri = await uploadToGemini(apiKey, audioPath, mimeType);
        } catch (uploadErr) {
            throw new Error("Dosya yükleme hatası: " + uploadErr.message);
        }

        statusDiv.textContent = `Altyazılar oluşturuluyor (${timeMultiplier}x)...`;

        const modelIdInput = document.getElementById('modelId');
        const modelName = modelIdInput ? modelIdInput.value.trim() : "gemini-1.5-flash";

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        // JSON-first approach for strict control
        const promptText = `
        Sen profesyonel bir Türkçe altyazı transkripsiyon motorusun.
        Sesi dikkatlice dinle ve her segment için DOĞRU ZAMANLAMAYLA altyazılar oluştur.
        
        ÇIKTI FORMATI:
        Tek bir JSON dizisi döndür.
        [
          {
            "start": "00:00:00,000",
            "end": "00:00:01,200",
            "text": "İlk kelimeler"
          }
        ]

        ===== KESİN KURALLAR =====
        
        1. **KELİME LİMİTİ (MAKS ${maxWords} KELİME)**:
           - Her segment EN FAZLA ${maxWords} kelime içermeli.
           - Uzun cümleler ${maxWords} kelimelik parçalara bölünmeli.
        
        2. **CÜMLE SINIRI KURALI (ÇOK ÖNEMLİ)**:
           - Bir cümle bittiğinde (. ? ! ile), o segment MUTLAKA orada bitmeli.
           - Yeni cümlenin ilk kelimesi ASLA önceki cümleyle aynı segmentte OLMAMALI.
           - YANLIŞ: "...problemi var. Bunun"
           - DOĞRU: Segment 1: "...problemi var." | Segment 2: "Bunun..."
           - Noktalama işaretinden SONRA gelen kelime YENİ segment başlatmalı.
        
        3. **TÜRKÇE DİLBİLGİSİ**:
           - Sıfat + İsim birlikte kalmalı (örn: "güzel ev" bölünmemeli)
           - Yardımcı fiiller ana fiille kalmalı
           - Ek-fiiller (-dır, -dir) önceki kelimeyle kalmalı
        
        4. **ZAMANLAMA**:
           - Her segmentin "start" zamanı o kelimelerin BAŞLADIĞI an olmalı.
           - "end" zamanı o kelimelerin BİTTİĞİ an olmalı.
           - Sürekli konuşmada segment N'in "end"i, segment N+1'in "start"ına eşit olmalı.
        
        5. **BİREBİR**: Duyulanı aynen yaz. Özet yapma.

        Ses Dosyası:
        [Ekteki Ses Dosyası]
        `;

        const payload = {
            contents: [{
                parts: [
                    { text: promptText },
                    {
                        file_data: {
                            mime_type: mimeType,
                            file_uri: fileUri
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0, // Zero temperature for maximum consistency
                response_mime_type: "application/json" // Force JSON output
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gemini API Failed: ${errText}`);
        }

        const data = await response.json();
        const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!candidate) throw new Error("Altyazı oluşturulamadı.");

        // Debug: Log response size
        console.log(`Gemini response size: ${candidate.length} characters`);

        let segments;
        try {
            segments = JSON.parse(candidate);
        } catch (e) {
            // Fallback cleanup if model adds markdown blocks
            const cleanJson = candidate.replace(/```json/g, '').replace(/```/g, '').trim();
            segments = JSON.parse(cleanJson);
        }

        // Debug: Log segment count
        console.log(`Generated ${segments.length} segments`);

        // Helper: Time Parsing
        function parseTime(timeStr) {
            if (!timeStr) return 0;
            const parts = timeStr.trim().split(/[:,]/);
            const h = parseInt(parts[0] || 0, 10);
            const m = parseInt(parts[1] || 0, 10);
            const s = parseInt(parts[2] || 0, 10);
            const ms = parseInt(parts[3] || 0, 10);
            return ((h * 3600000) + (m * 60000) + (s * 1000) + ms) * timeMultiplier;
        }

        function formatTime(msTotal) {
            const h = Math.floor(msTotal / 3600000);
            msTotal %= 3600000;
            const m = Math.floor(msTotal / 60000);
            msTotal %= 60000;
            const s = Math.floor(msTotal / 1000);
            const ms = msTotal % 1000;

            const pad = (n, z) => ('00' + n).slice(-z);
            return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)},${pad(ms, 3)}`;
        }

        // --- ENFORCE MAX WORDS (Post-Processing) ---
        function enforceMaxWords(segs, limit) {
            const result = [];
            for (const seg of segs) {
                const words = seg.text.trim().split(/\s+/);
                if (words.length <= limit) {
                    result.push(seg);
                } else {
                    // Split into chunks of 'limit' words
                    const startMs = parseTime(seg.start);
                    const endMs = parseTime(seg.end);
                    const duration = endMs - startMs;
                    const numChunks = Math.ceil(words.length / limit);
                    const chunkDuration = duration / numChunks;

                    for (let i = 0; i < numChunks; i++) {
                        const chunkWords = words.slice(i * limit, (i + 1) * limit);
                        const chunkStart = startMs + (i * chunkDuration);
                        const chunkEnd = startMs + ((i + 1) * chunkDuration);
                        result.push({
                            start: formatTime(chunkStart),
                            end: formatTime(chunkEnd),
                            text: chunkWords.join(' ')
                        });
                    }
                }
            }
            return result;
        }

        segments = enforceMaxWords(segments, parseInt(maxWords, 10));

        // --- FIX SENTENCE BOUNDARIES (Post-Processing) ---
        // Move words after sentence-ending punctuation to the next segment
        function fixSentenceBoundaries(segs) {
            for (let i = 0; i < segs.length - 1; i++) {
                const text = segs[i].text.trim();

                // Check if there's text after a sentence-ending punctuation
                const match = text.match(/^(.+[.?!])(\s+)(.+)$/);
                if (match) {
                    const beforePunct = match[1]; // Text up to and including punctuation
                    const afterPunct = match[3];  // Text after punctuation

                    // Update current segment to end at punctuation
                    segs[i].text = beforePunct;

                    // Prepend the overflow to the next segment
                    segs[i + 1].text = afterPunct + ' ' + segs[i + 1].text.trim();
                }
            }
            return segs;
        }

        segments = fixSentenceBoundaries(segments);

        // --- ADVANCED POST-PROCESSING ---
        if (segments.length > 0) {
            // Check Fill Gaps Option
            const fillGapsCheck = document.getElementById('fillGaps');
            const doFillGaps = fillGapsCheck && fillGapsCheck.checked;

            // Consts
            const MICRO_GAP_MS = 300; // Drift/Noise threshold
            const BRIDGE_MAX_MS = 3000; // Max silence to fill
            const MIN_DURATION_MS = 1000; // Minimum subtitle duration

            for (let i = 0; i < segments.length; i++) {
                let start = parseTime(segments[i].start);
                let end = parseTime(segments[i].end);

                // Pass 1: Sanity Check (End > Start)
                if (end <= start) {
                    end = start + MIN_DURATION_MS;
                }

                // Pass 2: Interact with Next Segment
                if (i < segments.length - 1) {
                    let nextStart = parseTime(segments[i + 1].start);

                    // Fix Overlap: If current ends after next starts, clamp it
                    if (end > nextStart) {
                        end = nextStart;
                    }

                    const diff = nextStart - end;

                    // Logic:
                    // 1. If gap is TINY (Micro-drift), snap them together (Clean look).
                    // 2. If user wants Fill Gaps, ALWAYS extend current segment to next start.

                    if (diff > 0 && diff < MICRO_GAP_MS) {
                        // Always snap micro gaps
                        end = nextStart;
                    } else if (doFillGaps && diff > 0) {
                        // Bridge ALL gaps when Fill Gaps is enabled
                        // This keeps the previous subtitle on screen until the next one starts
                        end = nextStart;
                    }
                }

                // Pass 3: Enforce Minimum Duration (Extend backward or forward if needed)
                // Note: Only extend if it doesn't overlap excessively. 
                // A simple approach is ensuring duration.
                if ((end - start) < MIN_DURATION_MS) {
                    // Try to extend end, but respect next start
                    // For now, let's just accept the end update.
                }

                // Write back formatted
                segments[i].start = formatTime(start);
                segments[i].end = formatTime(end);
            }
        }

        // --- SCALE TIMINGS TO ACTUAL AUDIO DURATION ---
        // This fixes the issue where Gemini's timings don't match the actual audio length
        if (actualAudioDurationMs && segments.length > 0) {
            // Create parseTime function without timeMultiplier for scaling (already applied above)
            function parseTimeRaw(timeStr) {
                if (!timeStr) return 0;
                const parts = timeStr.trim().split(/[:,]/);
                const h = parseInt(parts[0] || 0, 10);
                const m = parseInt(parts[1] || 0, 10);
                const s = parseInt(parts[2] || 0, 10);
                const ms = parseInt(parts[3] || 0, 10);
                return (h * 3600000) + (m * 60000) + (s * 1000) + ms;
            }

            statusDiv.textContent = `Zamanlamalar doğrulanıyor...`;
            segments = scaleTimingsToAudioDuration(segments, actualAudioDurationMs, parseTimeRaw, formatTime);
        }

        // Convert JSON to SRT
        let srtContent = "";
        segments.forEach((seg, index) => {
            srtContent += `${index + 1}\n`;
            srtContent += `${seg.start} --> ${seg.end}\n`;
            srtContent += `${seg.text.trim()}\n\n`;
        });

        // Add UTF-8 BOM for Premiere Pro compatibility with Turkish characters
        const BOM = '\uFEFF';
        fs.writeFileSync(outputPath, BOM + srtContent, 'utf8');
        lastGeneratedSrtContent = srtContent;
        return true;
    }

    var themeManager = {
        init: function () {
            csInterface.addEventListener(CSInterface.THEME_COLOR_CHANGED_EVENT, this.updateTheme);
            this.updateTheme();
        },
        updateTheme: function () {
        }
    };

    init();

}());
