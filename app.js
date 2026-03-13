let audioEngine;
let gestureRecognizer;
let hands;
const videoElement = document.querySelector('.input_video');
const canvasElement = document.querySelector('.output_canvas');
const canvasCtx = canvasElement.getContext('2d');
let lastGestureTime = {};

async function init() {
    audioEngine = new AudioEngine();
    
    hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.3/${file}`
    });

    hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    hands.onResults(onResults);

    const camera = new Camera(videoElement, {
        onFrame: async () => {
            await hands.send({image: videoElement});
        },
        width: 1280,
        height: 720
    });

    camera.start();
    setupControls();
}

function onResults(results) {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (document.getElementById('selfie').checked) {
        canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    }

    if (document.getElementById('showTracking').checked && results.multiHandLandmarks) {
        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
            drawConnectors(canvasCtx, results.multiHandLandmarks[i], HAND_CONNECTIONS, {color: '#00FF00', lineWidth: 2});
            drawLandmarks(canvasCtx, results.multiHandLandmarks[i], {color: '#FF0000', lineWidth: 1});
        }
    }

    canvasCtx.restore();
}

function setupControls() {
    document.getElementById('micEnabled').addEventListener('change', async (e) => {
        if (e.target.checked) {
            await audioEngine.initMicrophone();
        }
    });

    document.getElementById('clearLoops').addEventListener('click', () => {
        audioEngine.activeLoops = [];
    });

    document.querySelectorAll('.drum-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            audioEngine.playDrum(btn.dataset.drum);
        });
    });

    document.querySelectorAll('.key-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            audioEngine.playSynthNote(btn.dataset.note);
        });
    });
}

document.addEventListener('DOMContentLoaded', init);
