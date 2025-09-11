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

let pomodoroHistory = [];
let totalPomodorosCompleted = 0;
let totalStudyTime = 0; // in seconds
let totalBreakTime = 0; // in seconds
let lastPomodoro = null; // Stores details of the last completed pomodoro for summary

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

function showSummary(pomodoro) {
    showScreen('summaryScreen');
    document.getElementById('summaryActivity').textContent = pomodoro.activity;
    document.getElementById('summaryWorkTime').textContent = formatTime(pomodoro.workDuration);
    document.getElementById('summaryBreakTime').textContent = formatTime(pomodoro.breakDuration);
    document.getElementById('summaryDate').textContent = new Date(pomodoro.timestamp).toLocaleString();

    document.getElementById('totalPomodoros').textContent = totalPomodorosCompleted;
    document.getElementById('totalStudyTime').textContent = formatTime(totalStudyTime);
    document.getElementById('totalBreakTime').textContent = formatTime(totalBreakTime);
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

function goBackToWelcome() {
    showScreen('welcomeScreen');
    if (timer) {
        clearInterval(timer);
        timer = null;
        isRunning = false;
    }
}

function goBackToPomodoro() {
    showScreen('pomodoroScreen');
    resetTimerSetup();
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

function finishTimer() {
    pauseTimer();
    recordPomodoro(true); // true indicates finished by user
    showSummary(lastPomodoro);
}

function completeSession() {
    pauseTimer();
    recordPomodoro(false); // false indicates completed naturally
    
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

function recordPomodoro(finishedByUser) {
    const pomodoro = {
        activity: currentSubject,
        workDuration: workDuration - currentTime, // Actual work time spent
        breakDuration: isWorkTime ? 0 : (breakDuration - currentTime), // Actual break time spent
        timestamp: new Date().toISOString(),
        type: isWorkTime ? 'Trabajo' : 'Descanso',
        completed: finishedByUser ? 'Terminado por usuario' : 'Completado naturalmente'
    };

    pomodoroHistory.push(pomodoro);
    totalPomodorosCompleted++;
    totalStudyTime += (isWorkTime ? (workDuration - currentTime) : 0);
    totalBreakTime += (isWorkTime ? 0 : (breakDuration - currentTime));
    lastPomodoro = pomodoro;

    // Optionally save to localStorage
    saveHistory();
    renderNewHistory(); // Add this call to update history view
}

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    var weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
    return [d.getUTCFullYear(), weekNo];
}

function getStartOfWeek(year, weekNumber) {
    const jan1 = new Date(year, 0, 1);
    const days = (weekNumber - 1) * 7;
    const dayOfWeek = jan1.getDay(); // 0 for Sunday, 1 for Monday, etc.
    let monday = new Date(jan1.getFullYear(), jan1.getMonth(), jan1.getDate() + days + (dayOfWeek <= 4 ? 1 - dayOfWeek : 8 - dayOfWeek));
    // Adjust for the first week of the year if it starts in the previous year
    if (monday.getDay() === 0) { // If it's Sunday, move to next Monday
        monday.setDate(monday.getDate() + 1);
    }
    return monday;
}

function formatHistoryTime(totalSeconds) {
    if (isNaN(totalSeconds) || totalSeconds < 0) {
        return '0s';
    }

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.round(totalSeconds % 60);

    if (hours > 0) {
        return `${hours}h ${minutes}min`;
    } else if (minutes > 0) {
        return `${minutes}min`;
    } else {
        return `${seconds}s`;
    }
}

function formatTotalTime(totalSeconds) {
    if (isNaN(totalSeconds) || totalSeconds < 0) {
        return '0s';
    }

    const hours = totalSeconds / 3600;
    const minutes = totalSeconds / 60;
    const seconds = totalSeconds;

    if (hours >= 1) {
        return `${hours.toFixed(1)}h`;
    } else if (minutes >= 1) {
        return `${Math.floor(minutes)}min`;
    } else {
        return `${Math.round(seconds)}s`;
    }
}

function renderNewHistory() {
    const history = pomodoroHistory || [];

    const vista = document.querySelector('.vista-btn.active').dataset.vista;
    const dateValue = document.getElementById('date-input').value;

    const filteredHistory = history.filter(p => {
        const pomodoroDate = new Date(p.timestamp);
        if (vista === 'dia') {
            const selectedDate = new Date(dateValue);
            const adjustedSelectedDate = new Date(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), selectedDate.getUTCDate());
            return pomodoroDate.toDateString() === adjustedSelectedDate.toDateString();
        } else if (vista === 'semana') {
            const [year, week] = dateValue.split('-W');
            const [pomodoroYear, pomodoroWeek] = getWeekNumber(pomodoroDate);
            return pomodoroYear == year && pomodoroWeek == week;
        } else if (vista === 'mes') {
            const [year, month] = dateValue.split('-');
            return pomodoroDate.getFullYear() == year && (pomodoroDate.getMonth() + 1) == month;
        }
        return false;
    });

    // Calculate summary stats
    const totalSeconds = filteredHistory.reduce((acc, curr) => acc + (Number(curr.workDuration) || 0), 0);
    const totalSessions = filteredHistory.length;
    const subjects = [...new Set(filteredHistory.map(item => item.activity).filter(Boolean))]; // Filter out undefined/null subjects
    const totalSubjects = subjects.length;
    const avgSessionSeconds = totalSessions > 0 ? totalSeconds / totalSessions : 0;

    // Update summary cards
    document.getElementById('history-total-hours').textContent = formatTotalTime(totalSeconds);
    document.getElementById('history-total-sessions').textContent = totalSessions;
    document.getElementById('history-total-subjects').textContent = totalSubjects;
    document.getElementById('history-avg-session').textContent = formatHistoryTime(avgSessionSeconds);

    const distributionContainer = document.getElementById('history-distribution-container');
    // Clear existing subject distribution sections
    // Find all existing .distribucion-container elements and remove them
    const existingDistributionSections = distributionContainer.querySelectorAll('.distribucion-container');
    existingDistributionSections.forEach(section => section.remove());

    // Weekly Summary Details (new logic)
    const weeklySummaryDetails = document.getElementById('weekly-summary-details');
    const weeklyDayGrid = document.getElementById('weekly-day-grid'); // Changed from weeklyDayList
    const weeklyTotalHoursSpan = document.getElementById('weekly-total-hours');

    if (vista === 'semana') {
        weeklySummaryDetails.style.display = 'block';
                weeklyDayGrid.innerHTML = ''; // Clear previous content

        const [year, week] = dateValue.split('-W');
        const startOfWeek = getStartOfWeek(parseInt(year), parseInt(week));
        const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

        const dailyTotals = {};
        let totalStudyTimeForWeek = 0;

        // Initialize daily totals for the week
        for (let i = 0; i < 7; i++) {
            const currentDay = new Date(startOfWeek);
            currentDay.setDate(startOfWeek.getDate() + i);
            const dateKey = currentDay.toISOString().split('T')[0]; // YYYY-MM-DD
            dailyTotals[dateKey] = 0;
        }

        // Aggregate study time for each day in the filtered history
        filteredHistory.forEach(p => {
            const pomodoroDate = new Date(p.timestamp);
            const dateKey = pomodoroDate.toISOString().split('T')[0]; // YYYY-MM-DD
            if (dailyTotals.hasOwnProperty(dateKey)) {
                dailyTotals[dateKey] += (Number(p.workDuration) || 0);
            }
        });

        // Render daily breakdown as cards
        for (let i = 0; i < 7; i++) {
            const currentDay = new Date(startOfWeek);
            currentDay.setDate(startOfWeek.getDate() + i);
            const dateKey = currentDay.toISOString().split('T')[0];
            const dayName = daysOfWeek[currentDay.getDay()];
            const totalSecondsForDay = dailyTotals[dateKey] || 0;
            totalStudyTimeForWeek += totalSecondsForDay;

            const dayCard = document.createElement('div');
            dayCard.className = 'weekly-day-card';
            dayCard.innerHTML = `
                <strong>${dayName}</strong>
                <span>${currentDay.getDate()}/${currentDay.getMonth() + 1}</span>
                <span>${formatHistoryTime(totalSecondsForDay)}</span>
            `;
            weeklyDayGrid.appendChild(dayCard); // Append to the new grid container
        }

        // Update weekly total
        weeklyTotalHoursSpan.textContent = formatHistoryTime(totalStudyTimeForWeek);

        // Append the weekly summary details to the distribution container
        distributionContainer.appendChild(weeklySummaryDetails);

    } else {
        weeklySummaryDetails.style.display = 'none';
    }

    // Group by study type (Universidad vs UTN) - This part remains the same
    const universitySubjects = [
        'Programación Estructurada',
        'Matemática Discreta',
        'Análisis Matemático',
        'Arquitectura de Computadoras'
    ];

    const universityHistory = filteredHistory.filter(item => item.activity && universitySubjects.includes(item.activity));
    const utnHistory = filteredHistory.filter(item => item.activity && !universitySubjects.includes(item.activity));

    // Function to create and append a distribution section
    const createDistributionSection = (title, icon, historyData) => {
        if (historyData.length === 0) return;

        const container = document.createElement('div');
        container.className = 'distribucion-container';

        const header = document.createElement('h3');
        header.className = 'distribucion-titulo';
        header.innerHTML = `<span class="material-icons">${icon}</span> ${title}`;
        container.appendChild(header);

        const subjectStats = historyData.reduce((acc, curr) => {
            if (curr.activity) {
                if (!acc[curr.activity]) {
                    acc[curr.activity] = 0;
                }
                acc[curr.activity] += (Number(curr.workDuration) || 0);
            }
            return acc;
        }, {});

        const totalSectionSeconds = Object.values(subjectStats).reduce((acc, curr) => acc + curr, 0);

        for (const subject in subjectStats) {
            const item = document.createElement('div');
            item.className = 'materia-item';

            const subjectName = document.createElement('span');
            subjectName.textContent = subject;

            const statsDiv = document.createElement('div');
            statsDiv.className = 'materia-stats';

            const time = document.createElement('span');
            time.className = 'tiempo';
            const subjectSeconds = subjectStats[subject];
            time.textContent = formatHistoryTime(subjectSeconds);


            const percentage = document.createElement('span');
            percentage.className = 'porcentaje';
            const percentValue = totalSectionSeconds > 0 ? ((subjectSeconds / totalSectionSeconds) * 100).toFixed(1) : 0;
            percentage.textContent = isNaN(percentValue) ? '0%' : `${percentValue}%`;

            statsDiv.appendChild(time);
            statsDiv.appendChild(percentage);
            item.appendChild(subjectName);
            item.appendChild(statsDiv);
            container.appendChild(item);
        }

        distributionContainer.appendChild(container);
    };

    createDistributionSection('Distribución por Materia - Universidad de la Cuenca', 'school', universityHistory);
    createDistributionSection('Distribución con la UTN', 'code', utnHistory);
}

function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    let result = '';
    if (h > 0) result += `${h}h `;
    if (m > 0) result += `${m}m `;
    result += `${s}s`;
    return result.trim();
}

function saveHistory() {
    localStorage.setItem('pomodoroHistory', JSON.stringify(pomodoroHistory));
    localStorage.setItem('totalPomodorosCompleted', totalPomodorosCompleted);
    localStorage.setItem('totalStudyTime', totalStudyTime);
    localStorage.setItem('totalBreakTime', totalBreakTime);
}

function loadHistory() {
    const savedHistory = localStorage.getItem('pomodoroHistory');
    const savedTotalPomodoros = localStorage.getItem('totalPomodorosCompleted');
    const savedTotalStudyTime = localStorage.getItem('totalStudyTime');
    const savedTotalBreakTime = localStorage.getItem('totalBreakTime');

    if (savedHistory) {
        pomodoroHistory = JSON.parse(savedHistory);
    }
    if (savedTotalPomodoros) {
        totalPomodorosCompleted = parseInt(savedTotalPomodoros);
    }
    if (savedTotalStudyTime) {
        totalStudyTime = parseInt(savedTotalStudyTime);
    }
    if (savedTotalBreakTime) {
        totalBreakTime = parseInt(savedTotalBreakTime);
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
// INICIALIZACIÓN
// =================================================================================

document.addEventListener('DOMContentLoaded', function() {
    loadHistory();
    currentScreen = 'welcome';

    const vistaBotones = document.querySelectorAll('.vista-btn');
    const fechaInput = document.getElementById('date-input');
    const fechaLabel = document.querySelector('.fecha-selector label');

    vistaBotones.forEach(boton => {
        boton.addEventListener('click', () => {
            // Quita la clase activa de todos los botones
            vistaBotones.forEach(btn => btn.classList.remove('active'));
            // Agrega la clase activa al botón presionado
            boton.classList.add('active');

            const vistaSeleccionada = boton.dataset.vista;
            
            // Cambia el tipo de input y la etiqueta según la vista
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

    // Evento para cuando cambia la fecha
    fechaInput.addEventListener('change', () => {
        renderNewHistory();
    });
});