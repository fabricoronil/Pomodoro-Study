// =================================================================================
// VARIABLES GLOBALES
// =================================================================================

let currentScreen = 'welcome';
let currentStudy = '';
let currentSubject = '';
let timer = null;
let isRunning = false;
let isWorkTime = true;
let workDuration = 25 * 60;
let breakDuration = 5 * 60;
let currentTime = workDuration;
let sessionCount = 1;

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
    // Oculta ambos contenedores de horarios al retroceder.
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
    
    if (timer) {
        clearInterval(timer);
        timer = null;
        isRunning = false;
    }
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

function resetTimerSetup() {
    document.getElementById('timerSetup').style.display = 'block';
    document.getElementById('timerDisplay').style.display = 'none';
    
    if (timer) {
        clearInterval(timer);
        timer = null;
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

function startTimer() {
    if (isRunning) return;
    
    isRunning = true;
    document.getElementById('playPauseBtn').textContent = '⏸️';
    
    timer = setInterval(() => {
        currentTime--;
        updateDisplay();
        
        if (currentTime <= 0) {
            completeSession();
        }
    }, 1000);
}

function pauseTimer() {
    if (!isRunning) return;
    
    isRunning = false;
    clearInterval(timer);
    timer = null;
    document.getElementById('playPauseBtn').textContent = '▶️';
}

function toggleTimer() {
    if (isRunning) {
        pauseTimer();
    } else {
        startTimer();
    }
}

function resetTimer() {
    pauseTimer();
    
    if (isWorkTime) {
        currentTime = workDuration;
    } else {
        currentTime = breakDuration;
    }
    
    updateDisplay();
}

function completeSession() {
    pauseTimer();
    
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
    
    if (isWorkTime) {
        isWorkTime = false;
        currentTime = breakDuration;
        document.getElementById('timerStatus').textContent = 'DESCANSO';
        alert('¡Tiempo de trabajo completado! Es hora de descansar.');
    } else {
        isWorkTime = true;
        currentTime = workDuration;
        sessionCount++;
        document.getElementById('timerStatus').textContent = 'TRABAJO';
        document.getElementById('sessionCount').textContent = sessionCount;
        alert('¡Descanso completado! Volvamos al trabajo.');
    }
    
    updateDisplay();
    startTimer();
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
// INICIALIZACIÓN
// =================================================================================

document.addEventListener('DOMContentLoaded', function() {
    currentScreen = 'welcome';
});