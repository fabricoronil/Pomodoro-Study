
// =================================================================================
// VARIABLES GLOBALES
// =================================================================================

let currentScreen = 'welcome';
let currentStudy = '';
let currentSubject = '';
let pomodoroWorker = null; // Web Worker for the timer
let isRunning = false;
let isWorkTime = true;
let workDuration = 25 * 60;
let breakDuration = 5 * 60;
let currentTime = workDuration;
let sessionCount = 1;
let naturalCompletion = false;

let pomodoroHistory = [];
let totalPomodorosCompleted = 0;
let totalStudyTime = 0; // in seconds
let totalBreakTime = 0; // in seconds
let lastPomodoro = null; // Stores details of the last completed pomodoro for summary

let currentUser = null;
const API_URL = '/api';

// =================================================================================
// DATOS DE HORARIOS
// =================================================================================

const subjectSchedules = {
    'Análisis Matemático': [
        'Lunes: 07:00 - 10:10',
        'Miércoles: 07:00 - 10:10',
        'Sábado: 07:00 - 09:00'
    ],
    'Arquitectura de Computadoras': [
        'Lunes: 10:20 - 13:30',
        'Martes: 09:20 - 12:30'
    ],
    'Matemática Discreta': [
        'Martes: 07:10 - 09:10',
        'Jueves: 07:10 - 09:10',
        'Viernes: 07:00 - 09:00'
    ],
    'Programación Estructurada': [
        'Jueves: 09:20 - 12:30',
        'Viernes: 09:10 - 12:20'
    ]
};

const weeklySchedule = {
    'Lunes': [
        { time: '07:00 - 10:10', subject: 'Análisis Matemático' },
        { time: '10:20 - 13:30', subject: 'Arquitectura de Computadoras' }
    ],
    'Martes': [
        { time: '07:10 - 09:10', subject: 'Matemática Discreta' },
        { time: '09:20 - 12:30', subject: 'Arquitectura de Computadoras' }
    ],
    'Miércoles': [
        { time: '07:00 - 10:10', subject: 'Análisis Matemático' }
    ],
    'Jueves': [
        { time: '07:10 - 09:10', subject: 'Matemática Discreta' },
        { time: '09:20 - 12:30', subject: 'Programación Estructurada' }
    ],
    'Viernes': [
        { time: '07:00 - 09:00', subject: 'Matemática Discreta' },
        { time: '09:10 - 12:20', subject: 'Programación Estructurada' }
    ],
    'Sábado': [
        { time: '07:00 - 09:00', subject: 'Análisis Matemático' }
    ]
};

// =================================================================================
// NAVEGACIÓN Y LÓGICA DE PANTALLAS
// =================================================================================

function showScreen(screenId) {
    const activeScreen = document.querySelector('.screen.active');
    const newScreen = document.getElementById(screenId);
    
    if (activeScreen) {
        activeScreen.classList.remove('active');
        activeScreen.classList.add('slide-out');
        setTimeout(() => {
            activeScreen.classList.remove('slide-out');
        }, 600);
    }
    
    setTimeout(() => {
        newScreen.classList.add('active');
        newScreen.scrollTop = 0; // Ensure the new screen starts at the top
        currentScreen = screenId.replace('Screen', '');
    }, 300);
}

function showSelection() {
    showScreen('selectionScreen');
}

function showHistory() {
    showScreen('historyScreen');
    renderNewHistory();
}

function showLogin() {
    showScreen('loginScreen');
}

function showRegister() {
    showScreen('registerScreen');
}

function showSummary(pomodoro, isNaturalCompletion) {
    naturalCompletion = isNaturalCompletion;
    showScreen('summaryScreen');
    document.getElementById('summaryActivity').textContent = pomodoro.activity;
    document.getElementById('summaryWorkTime').textContent = formatTime(pomodoro.workDuration);
    document.getElementById('summaryBreakTime').textContent = formatTime(pomodoro.breakDuration);
    document.getElementById('summaryDate').textContent = new Date(pomodoro.timestamp).toLocaleString();

    document.getElementById('totalPomodoros').textContent = totalPomodorosCompleted;
    document.getElementById('totalStudyTime').textContent = formatTime(totalStudyTime);
    document.getElementById('totalBreakTime').textContent = formatTime(totalBreakTime);

    const nextSessionBtn = document.getElementById('startNextSessionBtn');
    if (naturalCompletion) {
        nextSessionBtn.style.display = 'block';
        nextSessionBtn.textContent = isWorkTime ? 'Iniciar Descanso' : 'Iniciar Trabajo';
    } else {
        nextSessionBtn.style.display = 'none';
    }
}

function selectStudy(study) {
    currentStudy = study;

    if (study === 'universidad') {
        populateWeeklySchedule(); // Prepara el contenido del horario semanal.
        showScreen('subjectsScreen');
    } else {
        // Para UTN, nos aseguramos de que los contenedores de horarios no sean visibles.
        document.getElementById('subjectSchedule').style.display = 'none';
        currentSubject = 'Desarrollo Web Full Stack';
        document.getElementById('currentActivity').textContent = currentSubject;
        showScreen('pomodoroScreen');
        resetTimerSetup();
    }
}

function startPomodoro(subject) {
    currentSubject = subject;
    document.getElementById('currentActivity').textContent = subject;

    const schedule = subjectSchedules[subject];
    const scheduleContainer = document.getElementById('subjectSchedule');
    const scheduleList = document.getElementById('scheduleList');

    if (schedule) {
        scheduleList.innerHTML = '';
        schedule.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            scheduleList.appendChild(li);
        });
        scheduleContainer.style.display = 'block';
    } else {
        scheduleContainer.style.display = 'none';
    }

    showScreen('pomodoroScreen');
    resetTimerSetup();
}

function goBack() {
    document.getElementById('subjectSchedule').style.display = 'none';

    switch(currentScreen) {
        case 'subjects':
            showScreen('selectionScreen');
            break;
        case 'pomodoro':
            if (currentStudy === 'universidad') {
                showScreen('subjectsScreen');
            } else {
                showScreen('selectionScreen');
            }
            break;
        default:
            showScreen('selectionScreen');
    }
    
    if (isRunning) {
        pomodoroWorker.postMessage({ action: 'reset' });
        isRunning = false;
        stopTimerOnServer();
    }
}

function goBackToWelcome() {
    showScreen('welcomeScreen');
    if (isRunning) {
        pomodoroWorker.postMessage({ action: 'reset' });
        isRunning = false;
        stopTimerOnServer();
    }
}

function goBackToPomodoro() {
    showScreen('pomodoroScreen');
    resetTimerSetup();
}

// =================================================================================
// AUTHENTICATION FUNCTIONS
// =================================================================================

async function register() {
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        alert(data.message);
        if (response.ok) {
            showLogin();
        }
    } catch (error) {
        alert('Error registering user.');
    }
}

async function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        if (response.ok) {
            currentUser = data.user;
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            alert(data.message);
            document.getElementById('continueBtn').style.display = 'block';
            document.querySelector('button[onclick="showLogin()"]').style.display = 'none';
            showSelection();
            await loadHistory();
            await syncTimerFromServer();
        } else {
            alert(data.message);
        }
    } catch (error) {
        alert('Error logging in.');
    }
}

function logout() {
    currentUser = null;
    sessionStorage.removeItem('currentUser');
    pomodoroHistory = [];
    document.getElementById('continueBtn').style.display = 'none';
    document.querySelector('button[onclick="showLogin()"]').style.display = 'block';
    showScreen('welcomeScreen');
}

// =================================================================================
// FUNCIONES DE HORARIOS
// =================================================================================

function populateWeeklySchedule() {
    const contentDiv = document.getElementById('weeklyScheduleContent');
    contentDiv.innerHTML = '';

    for (const day in weeklySchedule) {
        const dayContainer = document.createElement('div');
        dayContainer.className = 'schedule-day';

        const dayTitle = document.createElement('h3');
        dayTitle.textContent = day;
        dayContainer.appendChild(dayTitle);

        const dayList = document.createElement('ul');
        
        weeklySchedule[day].forEach(clase => {
            const listItem = document.createElement('li');
            const timeSpan = document.createElement('span');
            timeSpan.textContent = clase.time;
            const subjectSpan = document.createElement('span');
            subjectSpan.textContent = clase.subject;
            
            listItem.appendChild(subjectSpan);
            listItem.appendChild(timeSpan);
            dayList.appendChild(listItem);
        });

        dayContainer.appendChild(dayList);
        contentDiv.appendChild(dayContainer);
    }
}

// =================================================================================
// FUNCIONES DEL TEMPORIZADOR POMODORO
// =================================================================================

async function resetTimerSetup() {
    document.getElementById('timerSetup').style.display = 'block';
    document.getElementById('timerDisplay').style.display = 'none';
    
    if (isRunning) {
        pomodoroWorker.postMessage({ action: 'reset' });
        await stopTimerOnServer();
    }
    isRunning = false;
    isWorkTime = true;
    sessionCount = 1;
}

function initializeTimer() {
    const workTimeInput = document.getElementById('workTime');
    const breakTimeInput = document.getElementById('breakTime');
    
    workDuration = parseInt(workTimeInput.value) * 60;
    breakDuration = parseInt(breakTimeInput.value) * 60;
    currentTime = workDuration;
    
    document.getElementById('timerSetup').style.display = 'none';
    document.getElementById('timerDisplay').style.display = 'block';
    
    updateDisplay();
    startTimer();
}

async function startTimer() {
    if (isRunning || !currentUser) return;
    
    isRunning = true;
    pomodoroWorker.postMessage({ action: 'start', currentTime });

    try {
        await fetch(`${API_URL}/timer/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: currentUser.email,
                duration: currentTime,
                isWorkTime,
                workDuration,
                breakDuration,
                currentSubject,
                sessionCount
            })
        });
    } catch (error) {
        console.error('Failed to start timer on server', error);
    }
}

async function pauseTimer() {
    if (!isRunning) return;
    
    isRunning = false;
    pomodoroWorker.postMessage({ action: 'pause' });
    await stopTimerOnServer();
}

async function resetTimer() {
    await pauseTimer();
    
    if (isWorkTime) {
        currentTime = workDuration;
    } else {
        currentTime = breakDuration;
    }
    
    updateDisplay();
}

async function finishTimer() {
    await pauseTimer();
    await recordPomodoro(true); // true indicates finished by user
    showSummary(lastPomodoro, false);
}

async function completeSession() {
    await pauseTimer();
    await recordPomodoro(false); // false indicates completed naturally
    
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
        console.log('Audio no disponible');
    }
    
    showSummary(lastPomodoro, true);
}

function startNextSession() {
    if (isWorkTime) {
        isWorkTime = false;
        currentTime = breakDuration;
    } else {
        isWorkTime = true;
        currentTime = workDuration;
        sessionCount++;
    }
    
    document.getElementById('timerStatus').textContent = isWorkTime ? 'TRABAJO' : 'DESCANSO';
    document.getElementById('sessionCount').textContent = sessionCount;
    
    showScreen('pomodoroScreen');
    document.getElementById('timerSetup').style.display = 'none';
    document.getElementById('timerDisplay').style.display = 'block';

    updateDisplay();
    startTimer();
}

async function recordPomodoro(finishedByUser) {
    const pomodoro = {
        activity: currentSubject,
        workDuration: workDuration - currentTime,
        breakDuration: isWorkTime ? 0 : (breakDuration - currentTime),
        timestamp: new Date().toISOString(),
        type: isWorkTime ? 'Trabajo' : 'Descanso',
        completed: finishedByUser ? 'Terminado por usuario' : 'Completado naturalmente'
    };

    pomodoroHistory.push(pomodoro);
    totalPomodorosCompleted++;
    totalStudyTime += (isWorkTime ? (workDuration - currentTime) : 0);
    totalBreakTime += (isWorkTime ? 0 : (breakDuration - currentTime));
    lastPomodoro = pomodoro;

    if (currentUser) {
        try {
            await fetch(`${API_URL}/pomodoros`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: currentUser.email, pomodoro })
            });
        } catch (error) {
            console.error('Failed to save pomodoro to server', error);
        }
    }

    renderNewHistory();
}

// ... (rest of the helper functions: getWeekNumber, getStartOfWeek, formatHistoryTime, formatTotalTime, renderNewHistory, formatTime) ...

async function loadHistory() {
    if (currentUser) {
        try {
            const response = await fetch(`${API_URL}/pomodoros/${currentUser.email}`);
            if (response.ok) {
                pomodoroHistory = await response.json();
                renderNewHistory();
            } else {
                console.error('Failed to load history from server');
            }
        } catch (error) {
            console.error('Error loading history from server', error);
        }
    }
}

function updateDisplay() {
    const minutes = Math.floor(currentTime / 60);
    const seconds = currentTime % 60;
    
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('timerTime').textContent = timeString;
    
    const totalTime = isWorkTime ? workDuration : breakDuration;
    const progress = ((totalTime - currentTime) / totalTime) * 360;
    document.getElementById('timerProgress').style.background = 
        `conic-gradient(white ${progress}deg, transparent ${progress}deg)`;
    
    document.getElementById('timerStatus').textContent = isWorkTime ? 'TRABAJO' : 'DESCANSO';
}

// =================================================================================
// SERVER-SIDE TIMER SYNC
// =================================================================================

async function stopTimerOnServer() {
    if (!currentUser) return;
    try {
        await fetch(`${API_URL}/timer/stop`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: currentUser.email })
        });
    } catch (error) {
        console.error('Failed to stop timer on server', error);
    }
}

async function syncTimerFromServer() {
    if (!currentUser) return;

    try {
        const response = await fetch(`${API_URL}/timer/${currentUser.email}`);
        if (!response.ok) {
            throw new Error('Failed to fetch timer state');
        }
        const serverState = await response.json();

        if (serverState) {
            const remainingTime = Math.round((serverState.endTime - Date.now()) / 1000);

            if (remainingTime > 0) {
                // Restore all timer variables from server state
                isWorkTime = serverState.isWorkTime;
                workDuration = serverState.workDuration;
                breakDuration = serverState.breakDuration;
                currentSubject = serverState.currentSubject;
                sessionCount = serverState.sessionCount;
                currentTime = remainingTime;

                // Update UI to reflect the restored state
                document.getElementById('currentActivity').textContent = currentSubject;
                showScreen('pomodoroScreen');
                document.getElementById('timerSetup').style.display = 'none';
                document.getElementById('timerDisplay').style.display = 'block';
                
                updateDisplay();
                startTimer(); // This will just start the client-side worker
            } else {
                // Timer expired while offline, so clear it on the server
                await stopTimerOnServer();
            }
        }
    } catch (error) {
        console.error('Could not sync timer from server', error);
    }
}


// =================================================================================
// INICIALIZACIÓN
// =================================================================================

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Web Worker
    pomodoroWorker = new Worker('worker.js');
    pomodoroWorker.onmessage = function(e) {
        const { type, currentTime: newCurrentTime } = e.data;
        if (type === 'tick') {
            currentTime = newCurrentTime;
            updateDisplay();
        } else if (type === 'completed') {
            completeSession();
        }
    };

    // Check for logged in user
    const savedUser = sessionStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        document.getElementById('continueBtn').style.display = 'block';
        document.querySelector('button[onclick="showLogin()"]').style.display = 'none';
        loadHistory();
        syncTimerFromServer(); // Sync timer state from server
    }

    currentScreen = 'welcome';

    const vistaBotones = document.querySelectorAll('.vista-btn');
    const fechaInput = document.getElementById('date-input');
    const fechaLabel = document.querySelector('.fecha-selector label');

    vistaBotones.forEach(boton => {
        boton.addEventListener('click', () => {
            vistaBotones.forEach(btn => btn.classList.remove('active'));
            boton.classList.add('active');
            const vistaSeleccionada = boton.dataset.vista;
            
            switch (vistaSeleccionada) {
                case 'dia':
                    fechaLabel.textContent = 'Seleccionar Día:';
                    fechaInput.type = 'date';
                    break;
                case 'semana':
                    fechaLabel.textContent = 'Seleccionar Semana:';
                    fechaInput.type = 'week';
                    break;
                case 'mes':
                    fechaLabel.textContent = 'Seleccionar Mes:';
                    fechaInput.type = 'month';
                    break;
            }
            renderNewHistory();
        });
    });

    fechaInput.addEventListener('change', () => {
        renderNewHistory();
    });
});
