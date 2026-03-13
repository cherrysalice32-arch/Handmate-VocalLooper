// Main Application
const videoElement = document.querySelector('.input_video');
const canvasElement = document.querySelector('.output_canvas');
const canvasCtx = canvasElement.getContext('2d');

let audioEngine;
let gestureRecognizers = []; // Two hand recognizers
let lastGestureTime = {};
let gestureDebounce = 300; // milliseconds

// Initialize app
async function init() {
    audioEngine = new AudioEngine();
    
    const hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.3/${file}`
    });

    hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    gestureRecognizers = [new GestureRecognizer(), new GestureRecognizer()];

    hands.onResults(onResults);

    const camera = new Camera(videoElement, {
        onFrame: async () => {
            await hands.send({image: videoElement});
        },
        width: 1280,
        height: 720
    });

    camera.start();

    // Setup event listeners
    setupControls();
    setupDrumButtons();
    setupSynthButtons();
    setupGestureResponses();
}

function onResults(results) {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (document.getElementById('selfie').checked) {
        canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    }

    if (document.getElementById('showTracking').checked && results.multiHandLandmarks) {
        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
            const landmarks = results.multiHandLandmarks[i];
            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {color: '#00FF00', lineWidth: 2});
            drawLandmarks(canvasCtx, landmarks, {color: '#FF0000', lineWidth: 1});

            // Update gesture recognition for each hand
            if (i < gestureRecognizers.length) {
                gestureRecognizers[i].updateGestures(landmarks);
                processGesture(i, gestureRecognizers[i].getActiveGesture());
            }
        }
    }

    updateFPS();
    canvasCtx.restore();
}

function processGesture(handIndex, gestureName) {
    if (gestureName === 'none') return;

    const now = Date.now();
    const key = `hand${handIndex}_${gestureName}`;

    if (lastGestureTime[key] && now - lastGestureTime[key] < gestureDebounce) {
        return;
    }

    lastGestureTime[key] = now;
    updateGestureDisplay(gestureName);

    switch(gestureName) {
        case 'closedFist':
            handleClosedFist(handIndex);
            break;
        case 'openHand':
            handleOpenHand(handIndex);
            break;
        case 'thumbUp':
            handleThumbUp();
            break;
        case 'thumbDown':
            handleThumbDown();
            break;
        case 'peaceSign':
            handlePeaceSign();
            break;
    }
}

function handleClosedFist(handIndex) {
    // Record vocal loop
    if (!audioEngine.mediaRecorder || audioEngine.mediaRecorder.state === 'inactive') {
        audioEngine.startVocalRecording();
        document.getElementById('recordStatus').textContent = 'Recording...';
        document.getElementById('recordStatus').style.color = '#ff6b6b';
    }
}

function handleOpenHand(handIndex) {
    // Stop recording and play loops
    if (audioEngine.mediaRecorder && audioEngine.mediaRecorder.state === 'recording') {
        audioEngine.stopVocalRecording();
        document.getElementById('recordStatus').textContent = 'Off';
        document.getElementById('recordStatus').style.color = '#667eea';
    }
    
    // Play all active loops
    audioEngine.activeLoops.forEach((loop, index) => {
        if (!loop.isPlaying) {
            audioEngine.playVocalLoop(index);
        }
    });
}

function handleThumbUp() {
    // Increase volume
    const currentVolume = audioEngine.masterVolume.gain.value * 100;
    audioEngine.setMasterVolume(Math.min(currentVolume + 10, 100));
    document.getElementById('micVolume').value = Math.min(currentVolume + 10, 100);
}

function handleThumbDown() {
    // Decrease volume
    const currentVolume = audioEngine.masterVolume.gain.value * 100;
    audioEngine.setMasterVolume(Math.max(currentVolume - 10, 0));
    document.getElementById('micVolume').value = Math.max(currentVolume - 10, 0);
}

function handlePeaceSign() {
    // Toggle synth on/off
    audioEngine.synth.triggerAttackRelease('C4', '0.5');
}

function setupControls() {
    // Microphone setup
    document.getElementById('micEnabled').addEventListener('change', async (e) => {
        if (e.target.checked) {
            const success = await audioEngine.initMicrophone();
            if (!success) {
                e.target.checked = false;
                alert('Microphone access denied');
            }
        }
    });

    // Microphone volume
    document.getElementById('micVolume').addEventListener('input', (e) => {
        audioEngine.setMasterVolume(e.target.value);
    });

    // BPM
    document.getElementById('bpmInput').addEventListener('change', (e) => {
        audioEngine.setBPM(parseInt(e.target.value));
        document.getElementById('bpmDisplay').textContent = e.target.value;
    });

    // Clear loops
    document.getElementById('clearLoops').addEventListener('click', () => {
        audioEngine.clearAllLoops();
        alert('All loops cleared!');
    });

    // Toggle controls
    document.getElementById('toggleBtn').addEventListener('click', () => {
        const panel = document.querySelector('.control-panel');
        if (panel.style.display === 'none') {
            panel.style.display = 'block';
            document.getElementById('toggleBtn').textContent = 'Collapse';
        } else {
            panel.style.display = 'none';
            document.getElementById('toggleBtn').textContent = 'Expand';
        }
    });

    // Camera selection
    const videoSelect = document.getElementById('videoSource');
    navigator.mediaDevices.enumerateDevices().then(devices => {
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        videoDevices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.text = device.label || `Camera ${videoDevices.indexOf(device) + 1}`;
            videoSelect.appendChild(option);
        });
    });
}

function setupDrumButtons() {
    document.querySelectorAll('.drum-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const drum = btn.dataset.drum;
            audioEngine.playDrum(drum);
        });
    });
}

function setupSynthButtons() {
    document.querySelectorAll('.key-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const note = btn.dataset.note;
            audioEngine.playSynthNote(note);
        });
    });
}

function setupGestureResponses() {
    // Already handled in processGesture
}

function updateGestureDisplay(gestureName) {
    const displayNames = {
        'closedFist': '✊ Closed Fist',
        'openHand': '✋ Open Hand',
        'thumbUp': '👍 Thumb Up',
        'thumbDown': '👎 Thumb Down',
        'peaceSign': '✌️ Peace Sign'
    };
    document.getElementById('gesture').textContent = displayNames[gestureName] || 'Ready';
}

let frameCount = 0;
let lastTime = Date.now();

function updateFPS() {
    frameCount++;
    const currentTime = Date.now();
    if (currentTime - lastTime >= 1000) {
        document.getElementById('fps').textContent = frameCount;
        frameCount = 0;
        lastTime = currentTime;
    }
}

// Start app when DOM is ready
document.addEventListener('DOMContentLoaded', init);