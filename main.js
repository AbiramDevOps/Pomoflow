const startBtn = document.querySelector("#start-btn");
const stopBtn = document.querySelector("#stop-btn");
const pauseBtn = document.querySelector("#pause-btn");

startBtn.addEventListener("click", startTimer);
stopBtn.addEventListener("click", stopTimer);
pauseBtn.addEventListener("click", pauseTimer);

const FocusTime = document.querySelector("#FocusTime");
FocusTime.addEventListener("change", setTime);

const SBreakTime = document.querySelector("#Sbreak");
SBreakTime.addEventListener("change", setTime);

const LBreakTime = document.querySelector("#Lbreak");
LBreakTime.addEventListener("change", setTime);

let Time;
let isRunning = false;
let timeId;
let minutes;
let seconds;
let strMinute;
let strSecond;
let cicle = 0;

let buttons = document.querySelectorAll(".mode-btn button");
const autoToggle = document.querySelector("#auto-toggle");

buttons.forEach(btn => {
    btn.addEventListener("click", () => {
        buttons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        if (btn.id === "focus") Time = FocusTime.value * 60;
        else if (btn.id === "SBreak-btn") Time = SBreakTime.value * 60;
        else if (btn.id === "LBreak-btn") Time = LBreakTime.value * 60;

        displayTime();
        updatePipContent();
    });
});

const bell = new Audio("audio/digital.wav");
bell.preload = "auto";

const focusBtn = document.querySelector("#focus");
focusBtn.classList.add("active");
Time = FocusTime.value * 60;
displayTime();

function setTime() {
    let activeBtn = document.querySelector(".mode-btn button.active");
    if (!activeBtn) return;

    if (activeBtn.id === "focus") Time = FocusTime.value * 60;
    else if (activeBtn.id === "SBreak-btn") Time = SBreakTime.value * 60;
    else if (activeBtn.id === "LBreak-btn") Time = LBreakTime.value * 60;

    displayTime();
    updatePipContent();
}

function nextsession() {
    if (document.querySelector("#focus").classList.contains("active")) {
        if ((cicle % 4) === 0) {
            Time = LBreakTime.value * 60;
            activateButton("LBreak-btn");
        } else {
            Time = SBreakTime.value * 60;
            activateButton("SBreak-btn");
        }
    } else {
        Time = FocusTime.value * 60;
        activateButton("focus");
    }
    displayTime();
    updatePipContent();
    startTimer();
}

function activateButton(id) {
    buttons.forEach(b => b.classList.remove("active"));
    document.querySelector(`#${id}`).classList.add("active");
    updatePipContent();
}

function startTimer() {
    if (isRunning) return;
    isRunning = true;
    timeId = setInterval(() => {
        if (Time <= 0) {
            cicle++;
            bell.play();
            clearInterval(timeId);
            isRunning = false;
            if (autoToggle.checked) nextsession();
            return;
        }
        Time--;
        displayTime();
        updatePipContent();
    }, 1000);
    updatePipContent();
}

function stopTimer() {
    isRunning = false;
    clearInterval(timeId);
    let activeBtn = document.querySelector(".mode-btn button.active");
    if (activeBtn.id === "focus") Time = FocusTime.value * 60;
    else if (activeBtn.id === "SBreak-btn") Time = SBreakTime.value * 60;
    else if (activeBtn.id === "LBreak-btn") Time = LBreakTime.value * 60;

    displayTime();
    updatePipContent();
}

function pauseTimer() {
    isRunning = false;
    clearInterval(timeId);
    updatePipContent();
}

function displayTime() {
    minutes = Math.floor(Time / 60);
    seconds = Time % 60;
    strMinute = String(minutes).padStart(2, "0");
    strSecond = String(seconds).padStart(2, "0");
    document.querySelector(".timer-display").innerHTML = `${strMinute}:${strSecond}`;
}

const rain = new Audio("audio/rain.mp3");
rain.loop = true;
const rain_box = document.querySelector("#rain");
rain_box.addEventListener("change", () => {
    if (rain_box.checked) rain.play();
    else {
        rain.pause();
        rain.currentTime = 0;
    }
});

const thunder = new Audio("audio/thunder.mp3");
thunder.loop = true;
const thunder_box = document.querySelector("#thunder");
thunder_box.addEventListener("change", () => {
    if (thunder_box.checked) thunder.play();
    else {
        thunder.pause();
        thunder.currentTime = 0;
    }
});

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

let pipCtx = pipCanvas.getContext("2d");
let pipActive = false;
let pipInterval = null;

pipButton.addEventListener("click", activatePip);
pipStartBtn.addEventListener("click", startTimer);
pipPauseBtn.addEventListener("click", pauseTimer);
pipStopBtn.addEventListener("click", stopTimer);

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
        const pipWindow = await documentPictureInPicture.requestWindow({ width: 400, height: 300 });
        pipWindow.document.body.innerHTML = "";
        [...document.styleSheets].forEach((styleSheet) => {
            try {
                const cssRules = [...styleSheet.cssRules].map(rule => rule.cssText).join("");
                const style = document.createElement("style");
                style.textContent = cssRules;
                pipWindow.document.head.appendChild(style);
            } catch {
                const link = document.createElement("link");
                link.rel = "stylesheet";
                link.type = styleSheet.type;
                link.media = styleSheet.media;
                link.href = styleSheet.href;
                pipWindow.document.head.appendChild(link);
            }
        });

        const pipContent = document.createElement("div");
        pipContent.innerHTML = `
            <div style="text-align:center;padding:20px;background:#2c3e50;color:white;height:100%;">
                <h3 style="margin:0 0 10px 0;">Pomodoro Timer</h3>
                <div id="pipWindowMode" style="font-size:14px;margin-bottom:5px;">Focus Mode</div>
                <div id="pipWindowTimer" style="font-size:32px;font-weight:bold;margin:10px 0;">25:00</div>
                <div style="display:flex;justify-content:center;gap:10px;">
                    <button id="pipWindowStart" style="background:#27ae60;border:none;border-radius:50%;width:40px;height:40px;color:white;cursor:pointer;">▶</button>
                    <button id="pipWindowPause" style="background:#f39c12;border:none;border-radius:50%;width:40px;height:40px;color:white;cursor:pointer;">⏸</button>
                    <button id="pipWindowStop" style="background:#e74c3c;border:none;border-radius:50%;width:40px;height:40px;color:white;cursor:pointer;">⏹</button>
                </div>
            </div>
        `;
        pipWindow.document.body.appendChild(pipContent);

        pipWindow.document.getElementById("pipWindowStart").addEventListener("click", startTimer);
        pipWindow.document.getElementById("pipWindowPause").addEventListener("click", pauseTimer);
        pipWindow.document.getElementById("pipWindowStop").addEventListener("click", stopTimer);

        const updatePipWindow = () => {
            const timer = pipWindow.document.getElementById("pipWindowTimer");
            if (!timer) return;
            timer.textContent = document.querySelector(".timer-display").textContent;
            let modeText = "Focus Mode";
            if (document.querySelector("#SBreak-btn").classList.contains("active")) modeText = "Short Break";
            else if (document.querySelector("#LBreak-btn").classList.contains("active")) modeText = "Long Break";
            pipWindow.document.getElementById("pipWindowMode").textContent = modeText;
        };

        const pipUpdateInterval = setInterval(updatePipWindow, 1000);
        updatePipWindow();

        pipWindow.addEventListener("pagehide", () => {
            clearInterval(pipUpdateInterval);
            pipActive = false;
        });

        pipActive = true;
        showNotification("Picture-in-Picture activated");
    } catch {
        activateVideoPip();
    }
}

function activateVideoPip() {
    if (document.pictureInPictureElement) document.exitPictureInPicture();

    updatePipCanvas();
    const stream = pipCanvas.captureStream(15);
    pipVideo.srcObject = stream;

    pipVideo.play().then(() => {
        pipVideo.requestPictureInPicture()
            .then(() => {
                pipActive = true;
                pipControls.style.display = "block";
                showNotification("Picture-in-Picture activated");
                pipInterval = setInterval(updatePipContent, 1000);
            })
            .catch(() => showNotification("Error: Picture-in-Picture not supported"));
    });
}

function disablePip() {
    if (document.pictureInPictureElement) {
        document.exitPictureInPicture().then(() => {
            pipActive = false;
            if (pipInterval) clearInterval(pipInterval);
            pipControls.style.display = "none";
            showNotification("Picture-in-Picture deactivated");
        });
    }
}

function updatePipContent() {
    if (pipActive) {
        updatePipCanvas();
        pipTimerDisplay.textContent = document.querySelector(".timer-display").textContent;
        let modeText = "Focus Mode";
        if (document.querySelector("#SBreak-btn").classList.contains("active")) modeText = "Short Break";
        else if (document.querySelector("#LBreak-btn").classList.contains("active")) modeText = "Long Break";
        pipModeDisplay.textContent = modeText;
    }
}

function updatePipCanvas() {
    pipCtx.clearRect(0, 0, pipCanvas.width, pipCanvas.height);
    pipCtx.fillStyle = "#2c3e50";
    pipCtx.fillRect(0, 0, pipCanvas.width, pipCanvas.height);

    pipCtx.fillStyle = "white";
    pipCtx.font = "bold 48px Arial";
    pipCtx.textAlign = "center";
    pipCtx.fillText(document.querySelector(".timer-display").textContent, pipCanvas.width / 2, pipCanvas.height / 2);

    pipCtx.font = "16px Arial";
    let modeText = "Focus Mode";
    if (document.querySelector("#SBreak-btn").classList.contains("active")) modeText = "Short Break";
    else if (document.querySelector("#LBreak-btn").classList.contains("active")) modeText = "Long Break";
    pipCtx.fillText(modeText, pipCanvas.width / 2, pipCanvas.height / 2 + 40);

    pipCtx.font = "14px Arial";
    pipCtx.fillText(isRunning ? "Running" : "Paused", pipCanvas.width / 2, pipCanvas.height / 2 + 70);

    pipCtx.strokeStyle = "white";
    pipCtx.lineWidth = 4;
    pipCtx.beginPath();
    pipCtx.arc(pipCanvas.width / 2, pipCanvas.height / 2, 100, 0, Math.PI * 2);
    pipCtx.stroke();
}

function showNotification(message) {
    notification.textContent = message;
    notification.style.display = "block";
    setTimeout(() => { notification.style.display = "none"; }, 3000);
}

updatePipCanvas();
