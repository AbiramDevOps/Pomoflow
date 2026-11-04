/* ==========================================================
   Pomoflow - main.js
   ========================================================== */

// ---------- Elementi DOM ----------
const startBtn = document.querySelector("#start-btn");
const stopBtn = document.querySelector("#stop-btn");
const pauseBtn = document.querySelector("#pause-btn");
const timerDisplay = document.querySelector(".timer-display");
const modeButtons = document.querySelectorAll(".mode-btn button");
const autoToggle = document.querySelector("#auto-toggle");

const FocusTime = document.querySelector("#FocusTime");
const SBreakTime = document.querySelector("#Sbreak");
const LBreakTime = document.querySelector("#Lbreak");

const pipButton = document.querySelector("#pip");
const pipCanvas = document.querySelector("#pipCanvas");
const pipVideo = document.querySelector("#pipVideo");
const pipControls = document.querySelector("#pipControls");
const pipTimerDisplay = document.querySelector("#pipTimerDisplay");
const pipModeDisplay = document.querySelector("#pipModeDisplay");
const pipStartBtn = document.querySelector("#pipStartBtn");
const pipPauseBtn = document.querySelector("#pipPauseBtn");
const pipStopBtn = document.querySelector("#pipStopBtn");
const notification = document.querySelector("#notification");

// ---------- Configurazione modalità ----------
const MAX_MINUTES = 999;
const MODES = {
    "focus":      { label: "Focus Mode",  input: FocusTime,  fallback: 25 },
    "SBreak-btn": { label: "Short Break", input: SBreakTime, fallback: 5 },
    "LBreak-btn": { label: "Long Break",  input: LBreakTime, fallback: 15 },
};

// ---------- Stato ----------
let currentMode = "focus";
let remaining = 0;          // secondi rimasti
let endTime = 0;            // timestamp (ms) di fine sessione
let isRunning = false;
let timeId = null;
let completedFocus = 0;     // numero di sessioni focus completate

let pipCtx = pipCanvas.getContext("2d");
let pipActive = false;
let pipWindow = null;       // finestra Document PiP (se attiva)
let notificationTimeout = null;

// ---------- Audio ----------
const bell = new Audio("audio/digital.wav");
bell.preload = "auto";

const rain = new Audio("audio/rain.mp3");
const thunder = new Audio("audio/thunder.mp3");

function playSafe(audio) {
    const p = audio.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
}

function setupAmbient(audio, checkbox) {
    audio.loop = true;
    checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
            const p = audio.play();
            if (p && typeof p.catch === "function") {
                p.catch(() => {
                    checkbox.checked = false;
                    showNotification("Audio blocked by the browser");
                });
            }
        } else {
            audio.pause();
            audio.currentTime = 0;
        }
    });
}

// ---------- Helper ----------
function sanitizeInput(modeId) {
    const mode = MODES[modeId];
    let value = parseInt(mode.input.value, 10);
    if (!Number.isFinite(value) || value < 1) value = mode.fallback;
    if (value > MAX_MINUTES) value = MAX_MINUTES;
    mode.input.value = value;
    return value;
}

function getDuration(modeId) {
    return sanitizeInput(modeId) * 60;
}

function getModeText() {
    return MODES[currentMode].label;
}

function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function render() {
    const text = formatTime(remaining);
    timerDisplay.textContent = text;
    modeButtons.forEach(btn => btn.classList.toggle("active", btn.id === currentMode));
    document.title = `${text} - ${getModeText()}`;
    updatePipContent();
}

function showNotification(message) {
    notification.textContent = message;
    notification.style.display = "block";
    clearTimeout(notificationTimeout);
    notificationTimeout = setTimeout(() => {
        notification.style.display = "none";
    }, 3000);
}

// ---------- Logica del timer ----------
function halt() {
    clearInterval(timeId);
    timeId = null;
    isRunning = false;
}

function setMode(modeId) {
    halt();
    currentMode = modeId;
    remaining = getDuration(modeId);
    render();
}

function startTimer() {
    if (isRunning) return;
    if (remaining <= 0) remaining = getDuration(currentMode);
    isRunning = true;
    endTime = Date.now() + remaining * 1000;
    timeId = setInterval(tick, 250);
    render();
}

function pauseTimer() {
    if (!isRunning) return;
    remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    halt();
    render();
}

function stopTimer() {
    halt();
    remaining = getDuration(currentMode);
    render();
}

function tick() {
    const msLeft = endTime - Date.now();
    const secLeft = Math.max(0, Math.ceil(msLeft / 1000));
    if (secLeft !== remaining) {
        remaining = secLeft;
        render();
    }
    if (msLeft <= 0) finishSession();
}

function finishSession() {
    halt();
    remaining = 0;
    bell.currentTime = 0;
    playSafe(bell);
    if (currentMode === "focus") completedFocus++;
    render();
    if (autoToggle.checked) nextSession();
}

function nextSession() {
    let next;
    if (currentMode === "focus") {
        // Pausa lunga dopo ogni 4 sessioni focus completate
        next = (completedFocus % 4 === 0) ? "LBreak-btn" : "SBreak-btn";
    } else {
        next = "focus";
    }
    setMode(next);
    startTimer();
}

// ---------- Eventi ----------
startBtn.addEventListener("click", startTimer);
pauseBtn.addEventListener("click", pauseTimer);
stopBtn.addEventListener("click", stopTimer);

modeButtons.forEach(btn => {
    btn.addEventListener("click", () => setMode(btn.id));
});

Object.entries(MODES).forEach(([modeId, mode]) => {
    mode.input.addEventListener("change", () => {
        sanitizeInput(modeId);
        if (modeId === currentMode) stopTimer();
    });
});

pipButton.addEventListener("click", activatePip);
pipStartBtn.addEventListener("click", startTimer);
pipPauseBtn.addEventListener("click", pauseTimer);
pipStopBtn.addEventListener("click", stopTimer);

pipVideo.addEventListener("leavepictureinpicture", () => {
    pipActive = false;
    pipControls.style.display = "none";
    showNotification("Picture-in-Picture deactivated");
});

// ---------- Picture-in-Picture ----------
function activatePip() {
    if (pipActive) {
        disablePip();
        return;
    }
    if ("documentPictureInPicture" in window) activateInteractivePip();
    else activateVideoPip();
}

async function activateInteractivePip() {
    try {
        const win = await documentPictureInPicture.requestWindow({ width: 400, height: 300 });

        // Font uguale alla pagina principale
        const fontLink = win.document.createElement("link");
        fontLink.rel = "stylesheet";
        fontLink.href = "https://fonts.googleapis.com/css2?family=Bitcount+Grid+Double:wght@357&display=swap";
        win.document.head.appendChild(fontLink);

        // CSS dedicato alla PiP: tutto scala con le dimensioni della finestra
        const style = win.document.createElement("style");
        style.textContent = `
            html, body {
                margin: 0;
                padding: 0;
                width: 100%;
                height: 100%;
                background: #2c3e50;
                color: white;
                font-family: "Bitcount Grid Double", system-ui, sans-serif;
                overflow: hidden;
            }
            .pip-root {
                box-sizing: border-box;
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 3vh;
                padding: 3vh 3vw;
                text-align: center;
            }
            .pip-title {
                margin: 0;
                font-size: min(7vw, 8vh);
                font-weight: 700;
                white-space: nowrap;
            }
            .pip-mode {
                font-size: min(5vw, 6vh);
                white-space: nowrap;
            }
            .pip-timer {
                font-size: min(24vw, 32vh);
                font-weight: 700;
                line-height: 1;
                white-space: nowrap;
            }
            .pip-buttons {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 3vw;
            }
            .pip-buttons button {
                width: min(14vw, 18vh);
                height: min(14vw, 18vh);
                border: none;
                border-radius: 50%;
                color: white;
                cursor: pointer;
                font-size: min(6vw, 8vh);
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0;
                transition: transform 0.2s, filter 0.2s;
            }
            .pip-buttons button:hover {
                transform: scale(1.1);
                filter: brightness(1.1);
            }
            #pipWindowStart { background: #27ae60; }
            #pipWindowPause { background: #f39c12; }
            #pipWindowStop  { background: #e74c3c; }
        `;
        win.document.head.appendChild(style);

        win.document.body.innerHTML = `
            <div class="pip-root">
                <h3 class="pip-title">Pomodoro Timer</h3>
                <div class="pip-mode" id="pipWindowMode">Focus Mode</div>
                <div class="pip-timer" id="pipWindowTimer">25:00</div>
                <div class="pip-buttons">
                    <button id="pipWindowStart" title="Start">▶</button>
                    <button id="pipWindowPause" title="Pause">⏸</button>
                    <button id="pipWindowStop" title="Stop">⏹</button>
                </div>
            </div>
        `;

        win.document.getElementById("pipWindowStart").addEventListener("click", startTimer);
        win.document.getElementById("pipWindowPause").addEventListener("click", pauseTimer);
        win.document.getElementById("pipWindowStop").addEventListener("click", stopTimer);

        win.addEventListener("pagehide", () => {
            pipWindow = null;
            pipActive = false;
            showNotification("Picture-in-Picture deactivated");
        });

        pipWindow = win;
        pipActive = true;
        updatePipContent();
        showNotification("Picture-in-Picture activated");
    } catch (err) {
        pipWindow = null;
        activateVideoPip();
    }
}

function activateVideoPip() {
    if (document.pictureInPictureElement) document.exitPictureInPicture();

    updatePipCanvas();
    pipVideo.srcObject = pipCanvas.captureStream(15);

    pipVideo.play()
        .then(() => pipVideo.requestPictureInPicture())
        .then(() => {
            pipActive = true;
            pipControls.style.display = "block";
            showNotification("Picture-in-Picture activated");
            updatePipContent();
        })
        .catch(() => showNotification("Error: Picture-in-Picture not supported"));
}

function disablePip() {
    // Finestra Document PiP: la chiusura attiva "pagehide" che fa la pulizia
    if (pipWindow) {
        pipWindow.close();
        return;
    }
    // Video PiP: la pulizia avviene nell'evento "leavepictureinpicture"
    if (document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(() => {});
    }
}

function updatePipContent() {
    if (!pipActive) return;
    const text = timerDisplay.textContent;
    const mode = getModeText();

    if (pipWindow) {
        const timerEl = pipWindow.document.getElementById("pipWindowTimer");
        const modeEl = pipWindow.document.getElementById("pipWindowMode");
        if (timerEl) timerEl.textContent = text;
        if (modeEl) modeEl.textContent = mode;
    } else {
        updatePipCanvas();
        pipTimerDisplay.textContent = text;
        pipModeDisplay.textContent = mode;
    }
}

function updatePipCanvas() {
    pipCtx.clearRect(0, 0, pipCanvas.width, pipCanvas.height);
    pipCtx.fillStyle = "#2c3e50";
    pipCtx.fillRect(0, 0, pipCanvas.width, pipCanvas.height);

    pipCtx.fillStyle = "white";
    pipCtx.font = "bold 48px Arial";
    pipCtx.textAlign = "center";
    pipCtx.fillText(timerDisplay.textContent, pipCanvas.width / 2, pipCanvas.height / 2);

    pipCtx.font = "16px Arial";
    pipCtx.fillText(getModeText(), pipCanvas.width / 2, pipCanvas.height / 2 + 40);

    pipCtx.font = "14px Arial";
    pipCtx.fillText(isRunning ? "Running" : "Paused", pipCanvas.width / 2, pipCanvas.height / 2 + 70);

    pipCtx.strokeStyle = "white";
    pipCtx.lineWidth = 4;
    pipCtx.beginPath();
    pipCtx.arc(pipCanvas.width / 2, pipCanvas.height / 2, 100, 0, Math.PI * 2);
    pipCtx.stroke();
}

// ---------- Inizializzazione ----------
setupAmbient(rain, document.querySelector("#rain"));
setupAmbient(thunder, document.querySelector("#thunder"));
setMode("focus");
updatePipCanvas();
