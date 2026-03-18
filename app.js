// =======================
// UI TOGGLE
// =======================
function toggleControl() {
  let panel = document.getElementsByClassName("control-panel")[0];
  let btn = document.getElementById("controlButton");

  if (panel.style.display === "none") {
    panel.style.display = "block";
    btn.innerHTML = "Hide controls";
  } else {
    panel.style.display = "none";
    btn.innerHTML = "Show controls";
  }
}

// =======================
// GLOBAL ELEMENTS
// =======================
const videoElement = document.getElementsByClassName("input_video")[0];
const canvasElement = document.getElementsByClassName("output_canvas")[0];
const canvasCtx = canvasElement.getContext("2d");

const gesture = document.getElementById("gesture");
const fpsoutput = document.getElementById("fps");
const showTracking = document.getElementById("showTracking");
const selfie = document.getElementById("selfie");

// =======================
// MIDI SETUP
// =======================
let output;
let midiPitchControlValue = 60;
let midiVel = 1;

if (navigator.requestMIDIAccess) {
  WebMidi.enable().then(() => {
    output = WebMidi.outputs[0];
  });
}

// =======================
// 🎤 HARMONY ENGINE
// =======================
let mic, harmonizer, harmonies = [];
let harmonyIntervals = [0, 4, 7];
let harmonyEnabled = false;

async function initHarmony() {
  await Tone.start();

  mic = new Tone.UserMedia();
  await mic.open();

  harmonizer = new Tone.Gain(0.8).toDestination();

  updateHarmonyVoices();

  mic.connect(harmonizer);
  harmonyEnabled = true;

  console.log("Harmony ON");
}

function updateHarmonyVoices() {
  harmonies.forEach(h => h.disconnect());
  harmonies = [];

  harmonyIntervals.forEach(interval => {
    const pitch = new Tone.PitchShift(interval);
    mic.connect(pitch);
    pitch.connect(harmonizer);
    harmonies.push(pitch);
  });
}

function setHarmonyMode(mode) {
  if (mode === "major") harmonyIntervals = [0, 4, 7];
  if (mode === "minor") harmonyIntervals = [0, 3, 7];
  if (mode === "fifth") harmonyIntervals = [0, 7];
  if (mode === "octave") harmonyIntervals = [0, 12];

  updateHarmonyVoices();
}

// UI change
const harmonySelect = document.getElementById("harmonyMode");
if (harmonySelect) {
  harmonySelect.addEventListener("change", (e) => {
    setHarmonyMode(e.target.value);
  });
}

// =======================
// GESTURE → MIDI + HARMONY
// =======================
function processGestures(leftIndex, rightIndex) {

  // MIDI pitch from X
  if (leftIndex && output) {
    let pitch = Math.floor(40 + leftIndex.x * 40);
    output.playNote(pitch, 1, { duration: 100 });
  }

  // 🎤 Harmony gesture control
  const gestureHarmony = document.getElementById("gestureHarmony");

  if (harmonyEnabled && gestureHarmony && gestureHarmony.checked && leftIndex && rightIndex) {
    const dist = Math.sqrt(
      (leftIndex.x - rightIndex.x) ** 2 +
      (leftIndex.y - rightIndex.y) ** 2
    );

    if (dist < 0.1) setHarmonyMode("minor");
    else if (dist < 0.2) setHarmonyMode("major");
    else if (dist < 0.3) setHarmonyMode("fifth");
    else setHarmonyMode("octave");
  }
}

// =======================
// FPS COUNTER
// =======================
let counter = 0;
let lastTime = Date.now();

// =======================
// MEDIAPIPE RESULTS
// =======================
function onResults(results) {

  // FPS
  counter++;
  let now = Date.now();
  if (now - lastTime > 1000) {
    fpsoutput.innerHTML = counter;
    counter = 0;
    lastTime = now;
  }

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  let leftIndex = null;
  let rightIndex = null;

  if (results.multiHandLandmarks && results.multiHandedness) {
    for (let i = 0; i < results.multiHandLandmarks.length; i++) {

      const landmarks = results.multiHandLandmarks[i];
      const isRight = results.multiHandedness[i].label === "Right";

      if (showTracking.checked) {
        drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS);
        drawLandmarks(canvasCtx, landmarks);
      }

      if (isRight) {
        rightIndex = landmarks[8];
      } else {
        leftIndex = landmarks[8];
      }
    }
  }

  // 👉 MAIN LOGIC
  processGestures(leftIndex, rightIndex);

  canvasCtx.restore();
}

// =======================
// MEDIAPIPE SETUP
// =======================
const hands = new Hands({
  locateFile: (file) =>
    `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.3/${file}`,
});

hands.setOptions({
  maxNumHands: 2,
  modelComplexity: 1,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
  selfieMode: true
});

hands.onResults(onResults);

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await hands.send({ image: videoElement });
  },
  width: 1280,
  height: 720,
});

camera.start();

// =======================
// SELFIE TOGGLE
// =======================
selfie.addEventListener("change", function () {
  hands.setOptions({ selfieMode: this.checked });
});
