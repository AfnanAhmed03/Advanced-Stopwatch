// --- DOM Elements ---
const display = document.getElementById('display');
const mainButton = document.getElementById('mainButton');
const secondaryButton = document.getElementById('secondaryButton');
const lapsList = document.getElementById('laps');
const exportButton = document.getElementById('exportButton');
const fastestLapDisplay = document.getElementById('fastestLap');
const slowestLapDisplay = document.getElementById('slowestLap');
const averageLapDisplay = document.getElementById('averageLap');

// --- State Variables ---
let startTime = 0;
let elapsedTime = 0;
let timerInterval = null;
let lapNumber = 1;
let lapTimes = []; // Array to store lap times in ms for analysis

// --- Core Functions ---
function formatTime(time) {
    const milliseconds = Math.floor((time % 1000) / 10);
    const seconds = Math.floor((time / 1000) % 60);
    const minutes = Math.floor((time / (1000 * 60)) % 60);
    const hours = Math.floor((time / (1000 * 60 * 60)) % 24);
    const format = (num) => num.toString().padStart(2, '0');
    // Return HTML with blinking colons
    return `${format(hours)}<span class="colon">:</span>${format(minutes)}<span class="colon">:</span>${format(seconds)}<span class="colon">:</span>${format(milliseconds)}`;
}

function start() {
    if (timerInterval) return; // Prevent multiple intervals
    startTime = Date.now() - elapsedTime;
    timerInterval = setInterval(() => {
        elapsedTime = Date.now() - startTime;
        updateDisplay();
    }, 10);
    updateButtons();
    setColonBlinking(true);
    saveState();
}

function pause() {
    clearInterval(timerInterval);
    timerInterval = null;
    updateButtons();
    setColonBlinking(false);
    saveState();
}

function reset() {
    clearInterval(timerInterval);
    timerInterval = null;
    elapsedTime = 0;
    lapNumber = 1;
    lapTimes = [];
    updateDisplay();
    updateButtons();
    lapsList.innerHTML = '';
    setColonBlinking(false);
    updateLapAnalysis();
    localStorage.removeItem('stopwatchState');
}

function lap() {
    if (!timerInterval) return;
    const totalPreviousLaps = lapTimes.reduce((sum, lap) => sum + lap, 0);
    const currentLapTime = elapsedTime - totalPreviousLaps;
    lapTimes.push(currentLapTime);

    const listItem = document.createElement('li');
    listItem.innerHTML = `<span>Lap ${lapNumber}:</span> ${formatTime(currentLapTime).replace(/<span class="colon">:<\/span>/g, ':')}`;
    lapsList.appendChild(listItem);
    lapNumber++;
    updateLapAnalysis();
    saveState();
}

// --- UI & Helper Functions ---
function updateDisplay() {
    display.innerHTML = formatTime(elapsedTime);
}

function updateButtons() {
    const isRunning = !!timerInterval;
    const hasTime = elapsedTime > 0;

    if (!hasTime && !isRunning) { // Initial state
        mainButton.textContent = 'Start';
        mainButton.className = 'start';
        mainButton.onclick = start;
        secondaryButton.textContent = 'Reset';
        secondaryButton.onclick = reset;
        secondaryButton.disabled = true;
    } else if (isRunning) { // Running
        mainButton.textContent = 'Pause';
        mainButton.className = 'pause';
        mainButton.onclick = pause;
        secondaryButton.textContent = 'Lap';
        secondaryButton.onclick = lap;
        secondaryButton.disabled = false;
    } else if (hasTime && !isRunning) { // Paused
        mainButton.textContent = 'Resume';
        mainButton.className = 'resume';
        mainButton.onclick = start;
        secondaryButton.textContent = 'Reset';
        secondaryButton.onclick = reset;
        secondaryButton.disabled = false;
    }
    exportButton.disabled = lapTimes.length === 0;
}

function setColonBlinking(isBlinking) {
    const colons = document.querySelectorAll('.colon');
    colons.forEach(colon => {
        colon.style.animationPlayState = isBlinking ? 'running' : 'paused';
    });
}

// --- Lap Analysis ---
function updateLapAnalysis() {
    if (lapTimes.length < 1) {
        fastestLapDisplay.textContent = '-';
        slowestLapDisplay.textContent = '-';
        averageLapDisplay.textContent = '-';
        return;
    }
    const fastest = Math.min(...lapTimes);
    const slowest = Math.max(...lapTimes);
    const average = lapTimes.reduce((sum, lap) => sum + lap, 0) / lapTimes.length;
    
    // Use the non-HTML version for analysis display
    const simpleFormat = (time) => formatTime(time).replace(/<span class="colon">:<\/span>/g, ':');

    fastestLapDisplay.textContent = simpleFormat(fastest);
    slowestLapDisplay.textContent = simpleFormat(slowest);
    averageLapDisplay.textContent = simpleFormat(average);
}

// --- Export & Storage ---
function exportLaps() {
    const lapData = Array.from(lapsList.children).map(li => li.innerText).join('\n');
    const blob = new Blob([lapData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lap_times.txt';
    a.click();
    URL.revokeObjectURL(url);
}

function saveState() {
    const state = {
        elapsedTime,
        lapNumber,
        lapTimes,
        lapsHTML: lapsList.innerHTML,
        isRunning: !!timerInterval
    };
    localStorage.setItem('stopwatchState', JSON.stringify(state));
}

function loadState() {
    const savedState = localStorage.getItem('stopwatchState');
    if (savedState) {
        const state = JSON.parse(savedState);
        elapsedTime = state.elapsedTime;
        lapNumber = state.lapNumber;
        lapTimes = state.lapTimes;
        lapsList.innerHTML = state.lapsHTML;

        updateDisplay();
        updateButtons();
        updateLapAnalysis();

        if (state.isRunning) {
            start();
        }
    }
}

// --- Event Listeners ---
exportButton.addEventListener('click', exportLaps);

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault(); // Prevent page scroll
        mainButton.click();
    } else if (e.code === 'KeyL') {
        if (!secondaryButton.disabled && secondaryButton.textContent === 'Lap') {
            secondaryButton.click();
        }
    } else if (e.code === 'KeyR') {
        if (!secondaryButton.disabled && secondaryButton.textContent === 'Reset') {
            secondaryButton.click();
        }
    }
});


// --- Initial Load ---
loadState();
updateDisplay();
updateButtons();

// --- PWA Service Worker Registration ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker registered successfully:', registration);
      })
      .catch(err => {
        console.log('Service Worker registration failed:', err);
      });
  });
}