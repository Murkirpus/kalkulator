// PWA Installation
let deferredPrompt;
const installPrompt = document.getElementById('installPrompt');
const installBtn = document.getElementById('installBtn');
const closeInstall = document.getElementById('closeInstall');

// PWA Install Prompt
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installPrompt.classList.remove('hidden');
});

installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`Результат установки: ${outcome}`);
    deferredPrompt = null;
    installPrompt.classList.add('hidden');
});

closeInstall.addEventListener('click', () => {
    installPrompt.classList.add('hidden');
});

window.addEventListener('appinstalled', () => {
    console.log('PWA установлено');
    installPrompt.classList.add('hidden');
});

// Service Worker Registration
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(reg => console.log('Service Worker зарегистрирован'))
        .catch(err => console.log('Ошибка Service Worker:', err));
}

// Calculator Variables
let currentMode = 'normal';
let currentInput = '';
let operator = '';
let previousInput = '';
let shouldResetDisplay = false;
let currentTimeUnit = '';
let timeExpression = [];
let currentSpeedUnit = '';
let speedValue = '';
let fullExpression = '';
let openBrackets = 0;

const resultDisplay = document.getElementById('result');
const expressionDisplay = document.getElementById('expression');
const normalButtons = document.getElementById('normalButtons');
const timeButtons = document.getElementById('timeButtons');
const timeCalculatorButtons = document.getElementById('timeCalculatorButtons');
const speedButtons = document.getElementById('speedButtons');
const speedCalculatorButtons = document.getElementById('speedCalculatorButtons');

const TIME_UNITS = {
    sec: 1,
    min: 60,
    hour: 3600,
    day: 86400,
    year: 31536000
};

const TIME_LABELS = {
    sec: 'сек',
    min: 'мин',
    hour: 'ч',
    day: 'дн',
    year: 'лет'
};

const SPEED_UNITS = {
    'linear': {
        'm/min': 1,
        'm/h': 1/60,
        'km/h': 1000/60,
        'm/s': 60,
        'km/min': 1000
    },
    'angular': {
        'rpm': 1,
        'rps': 60,
        'rph': 1/60
    }
};

const SPEED_LABELS = {
    'm/min': 'м/мин',
    'm/h': 'м/ч',
    'km/h': 'км/ч',
    'm/s': 'м/с',
    'km/min': 'км/мин',
    'rpm': 'об/мин',
    'rps': 'об/сек',
    'rph': 'об/час'
};

function switchMode(mode) {
    currentMode = mode;
    const modeButtons = document.querySelectorAll('.mode-btn');
    
    modeButtons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    normalButtons.classList.add('hidden');
    timeButtons.classList.add('hidden');
    timeCalculatorButtons.classList.add('hidden');
    speedButtons.classList.add('hidden');
    speedCalculatorButtons.classList.add('hidden');

    if (mode === 'normal') {
        normalButtons.classList.remove('hidden');
    } else if (mode === 'time') {
        timeButtons.classList.remove('hidden');
        timeCalculatorButtons.classList.remove('hidden');
    } else if (mode === 'speed') {
        speedButtons.classList.remove('hidden');
        speedCalculatorButtons.classList.remove('hidden');
    }

    clearAll();
}

function formatNumber(num) {
    const str = num.toString();
    const parts = str.split('.');
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return parts.length > 1 ? `${intPart}.${parts[1]}` : intPart;
}

function formatExpression(expr) {
    // Форматируем числа в выражении с пробелами
    // Учитываем десятичные числа (с точкой)
    return expr.replace(/\d+\.?\d*/g, match => formatNumber(match));
}

function adjustFontSize() {
    const text = resultDisplay.textContent;
    const length = text.length;
    
    if (length <= 10) {
        resultDisplay.style.fontSize = '2.2rem';
    } else if (length <= 15) {
        resultDisplay.style.fontSize = '1.8rem';
    } else if (length <= 20) {
        resultDisplay.style.fontSize = '1.5rem';
    } else if (length <= 25) {
        resultDisplay.style.fontSize = '1.3rem';
    } else {
        resultDisplay.style.fontSize = '1.1rem';
    }
}

function updateDisplay() {
    if (currentMode === 'normal') {
        // Показываем полное выражение в верхней строке с форматированием
        expressionDisplay.textContent = formatExpression(fullExpression) || '';
        
        // Показываем текущий ввод или результат в нижней строке
        if (currentInput !== '') {
            resultDisplay.textContent = formatNumber(currentInput);
        } else if (fullExpression !== '') {
            resultDisplay.textContent = formatExpression(fullExpression);
        } else {
            resultDisplay.textContent = '0';
        }
        adjustFontSize();
    } else if (currentMode === 'speed') {
        updateSpeedDisplay();
    } else {
        updateTimeDisplay();
    }
}

function getOperatorSymbol(op) {
    const symbols = { '+': '+', '-': '−', '*': '×', '/': '÷' };
    return symbols[op] || op;
}

function appendNumber(number) {
    if (shouldResetDisplay) {
        currentInput = '';
        fullExpression = '';
        shouldResetDisplay = false;
    }
    if (number === '.' && currentInput.includes('.')) return;
    if (currentInput === '0' && number !== '.') {
        currentInput = number;
    } else {
        currentInput += number;
    }
    fullExpression += number;
    updateDisplay();
}

function appendOperator(op) {
    if (currentMode === 'time') {
        if (currentInput === '' && timeExpression.length === 0) return;
        if (currentInput !== '') {
            if (currentTimeUnit === '') {
                alert('Выберите единицу времени!');
                return;
            }
            timeExpression.push({ value: parseFloat(currentInput), unit: currentTimeUnit });
            currentInput = '';
            currentTimeUnit = '';
        }
        timeExpression.push({ operator: op });
        updateDisplay();
        return;
    }

    // Если был результат (shouldResetDisplay=true), продолжаем с ним
    if (shouldResetDisplay && currentInput !== '') {
        fullExpression = currentInput;
        shouldResetDisplay = false;
    }

    if (currentInput === '' && fullExpression === '') return;
    
    // Проверка на двойные операторы
    const lastChar = fullExpression.slice(-1);
    if (['+', '-', '*', '/'].includes(lastChar) && ['+', '-', '*', '/'].includes(op)) {
        fullExpression = fullExpression.slice(0, -1) + op;
    } else {
        if (currentInput !== '') {
            fullExpression += op;
            currentInput = '';
        } else if (fullExpression !== '' && !['+', '-', '*', '/'].includes(lastChar)) {
            fullExpression += op;
        }
    }
    updateDisplay();
}

function appendBracket(bracket) {
    if (bracket === '(') {
        // Если перед скобкой цифра, добавляем умножение
        const lastChar = fullExpression.slice(-1);
        if (currentInput !== '' || (!isNaN(lastChar) && lastChar !== '')) {
            fullExpression += '*';
        }
        fullExpression += '(';
        openBrackets++;
        currentInput = '';
    } else if (bracket === ')') {
        if (openBrackets > 0) {
            // Проверяем, что последний символ не открывающая скобка
            if (fullExpression.slice(-1) !== '(') {
                fullExpression += ')';
                openBrackets--;
                currentInput = '';
            }
        }
    }
    updateDisplay();
}

function deleteLastChar() {
    if (currentInput !== '') {
        currentInput = currentInput.slice(0, -1);
        fullExpression = fullExpression.slice(0, -1);
    } else if (fullExpression !== '') {
        const lastChar = fullExpression.slice(-1);
        if (lastChar === '(') openBrackets--;
        if (lastChar === ')') openBrackets++;
        fullExpression = fullExpression.slice(0, -1);
        
        // Восстанавливаем currentInput если удалили оператор
        const operators = ['+', '-', '*', '/', '(', ')'];
        if (!operators.includes(lastChar)) {
            const parts = fullExpression.split(/[\+\-\*\/\(\)]/);
            currentInput = parts[parts.length - 1] || '';
        }
    }
    updateDisplay();
}

function calculatePercent() {
    // Если нет текущего ввода, ничего не делаем
    if (currentInput === '') return;
    
    const num = parseFloat(currentInput);
    if (isNaN(num)) return;
    
    // Ищем последний оператор и число перед ним
    const beforeCurrent = fullExpression.slice(0, -currentInput.length);
    const match = beforeCurrent.match(/(\d+\.?\d*)\s*[\+\-\*\/]\s*$/);
    
    if (match) {
        // Есть предыдущее число и оператор
        const baseNum = parseFloat(match[1]);
        const operator = beforeCurrent.trim().slice(-1);
        
        let percentValue;
        if (operator === '+' || operator === '-') {
            // Для + и - процент вычисляется от базового числа
            percentValue = (baseNum * num / 100);
        } else {
            // Для * и / процент это просто деление на 100
            percentValue = (num / 100);
        }
        
        // Заменяем текущий ввод на вычисленное значение процента
        fullExpression = beforeCurrent + percentValue.toString();
        currentInput = percentValue.toString();
    } else {
        // Нет предыдущего числа - просто делим на 100
        const percentValue = (num / 100);
        fullExpression = percentValue.toString();
        currentInput = percentValue.toString();
    }
    
    updateDisplay();
}

function clearAll() {
    currentInput = '';
    previousInput = '';
    operator = '';
    shouldResetDisplay = false;
    currentTimeUnit = '';
    timeExpression = [];
    currentSpeedUnit = '';
    speedValue = '';
    fullExpression = '';
    openBrackets = 0;
    resultDisplay.style.fontSize = '2.2rem';
    resultDisplay.style.lineHeight = '';
    resultDisplay.style.textAlign = '';
    updateDisplay();
}

function clearEntry() {
    currentInput = '';
    if (currentMode === 'time') {
        currentTimeUnit = '';
    } else if (currentMode === 'speed') {
        currentSpeedUnit = '';
        speedValue = '';
    }
    resultDisplay.style.fontSize = '2.2rem';
    resultDisplay.style.lineHeight = '';
    resultDisplay.style.textAlign = '';
    updateDisplay();
}

function calculate() {
    if (fullExpression === '') return;
    
    try {
        // Закрываем все открытые скобки
        let expr = fullExpression;
        while (openBrackets > 0) {
            expr += ')';
            openBrackets--;
        }
        
        // Безопасное вычисление выражения
        // Заменяем операторы для безопасности
        expr = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
        
        // Проверяем, что выражение содержит только допустимые символы
        if (!/^[0-9+\-*/.() ]+$/.test(expr)) {
            throw new Error('Недопустимое выражение');
        }
        
        // Вычисляем результат
        const result = Function('"use strict"; return (' + expr + ')')();
        
        if (!isFinite(result)) {
            alert('Ошибка вычисления!');
            return;
        }
        
        currentInput = result % 1 === 0 ? result.toString() : parseFloat(result.toFixed(10)).toString();
        fullExpression = currentInput;
        operator = '';
        previousInput = '';
        shouldResetDisplay = true;
        updateDisplay();
    } catch (error) {
        alert('Ошибка в выражении!');
        console.error(error);
    }
}

// Time functions
function addTimeUnit(unit) {
    if (currentInput === '') {
        alert('Введите число сначала!');
        return;
    }
    currentTimeUnit = unit;
    updateDisplay();
}

function updateTimeDisplay() {
    let expression = '';
    timeExpression.forEach(item => {
        if (item.operator) {
            expression += ` ${getOperatorSymbol(item.operator)} `;
        } else {
            expression += item.isCurrentTime ? 'Сейчас' : `${item.value} ${TIME_LABELS[item.unit]}`;
        }
    });

    if (currentInput !== '') {
        if (expression !== '') expression += ' ';
        expression += `${currentInput}`;
        if (currentTimeUnit !== '') expression += ` ${TIME_LABELS[currentTimeUnit]}`;
    }

    expressionDisplay.textContent = expression;

    if (timeExpression.length > 0) {
        resultDisplay.textContent = formatTimeResult(calculateTimeExpression());
    } else if (currentInput !== '') {
        resultDisplay.textContent = `${currentInput}${currentTimeUnit ? ' ' + TIME_LABELS[currentTimeUnit] : ''}`;
    } else {
        resultDisplay.textContent = '0';
    }
    adjustFontSize();
}

function calculateTimeExpression() {
    let totalSeconds = 0;
    let currentOperation = '+';
    timeExpression.forEach(item => {
        if (item.operator) {
            currentOperation = item.operator;
        } else {
            const seconds = item.isCurrentTime ? Math.floor(item.value) : Math.floor(item.value * TIME_UNITS[item.unit]);
            totalSeconds += currentOperation === '+' ? seconds : -seconds;
        }
    });
    return Math.floor(totalSeconds);
}

function formatTimeResult(totalSeconds) {
    if (totalSeconds === 0) return '0 сек';
    const hasCurrentTime = timeExpression.some(item => item.isCurrentTime);
    
    if (hasCurrentTime) {
        const isNegative = totalSeconds < 0;
        let absSeconds = Math.abs(totalSeconds);
        const days = Math.floor(absSeconds / 86400);
        const remainingSeconds = absSeconds % 86400;
        const hours = Math.floor(remainingSeconds / 3600);
        const minutes = Math.floor((remainingSeconds % 3600) / 60);
        const seconds = remainingSeconds % 60;
        
        if (days === 0 && !isNegative) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            let result = [];
            if (days > 0) result.push(`${days} дн`);
            if (hours > 0) result.push(`${hours} ч`);
            if (minutes > 0) result.push(`${minutes} мин`);
            if (seconds > 0 || result.length === 0) result.push(`${seconds} сек`);
            return (isNegative ? '−' : '') + result.join(' ');
        }
    }
    
    const isNegative = totalSeconds < 0;
    totalSeconds = Math.abs(totalSeconds);
    const years = Math.floor(totalSeconds / TIME_UNITS.year);
    const days = Math.floor((totalSeconds % TIME_UNITS.year) / TIME_UNITS.day);
    const hours = Math.floor((totalSeconds % TIME_UNITS.day) / TIME_UNITS.hour);
    const minutes = Math.floor((totalSeconds % TIME_UNITS.hour) / TIME_UNITS.min);
    const seconds = Math.floor(totalSeconds % TIME_UNITS.min);

    let result = [];
    if (years > 0) result.push(`${years} ${TIME_LABELS.year}`);
    if (days > 0) result.push(`${days} ${TIME_LABELS.day}`);
    if (hours > 0) result.push(`${hours} ${TIME_LABELS.hour}`);
    if (minutes > 0) result.push(`${minutes} ${TIME_LABELS.min}`);
    if (seconds > 0 || result.length === 0) result.push(`${seconds} ${TIME_LABELS.sec}`);

    return (isNegative ? '−' : '') + result.slice(0, 4).join(' ');
}

function showCurrentTime() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    
    timeExpression = [{ value: totalSeconds, unit: 'sec', isCurrentTime: true }];
    
    const currentTimeText = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    resultDisplay.textContent = currentTimeText;
    expressionDisplay.textContent = 'Сейчас:';
    currentInput = '';
    currentTimeUnit = '';
}

function calculateTime() {
    if (currentInput !== '' && currentTimeUnit !== '') {
        timeExpression.push({ value: parseFloat(currentInput), unit: currentTimeUnit });
        currentInput = '';
        currentTimeUnit = '';
    }
    if (timeExpression.length === 0) return;

    const result = calculateTimeExpression();
    timeExpression = [];
    resultDisplay.textContent = formatTimeResult(result);
    expressionDisplay.textContent = '';
    currentInput = '';
    currentTimeUnit = '';
}

function convertTime() {
    let totalSeconds;
    if (timeExpression.length > 0) {
        totalSeconds = calculateTimeExpression();
    } else if (currentInput !== '' && currentTimeUnit !== '') {
        totalSeconds = parseFloat(currentInput) * TIME_UNITS[currentTimeUnit];
    } else {
        alert('Введите время для конвертации!');
        return;
    }

    const fullBreakdown = getFullTimeBreakdown(totalSeconds);
    resultDisplay.textContent = fullBreakdown;
    expressionDisplay.textContent = 'Полное разложение времени:';
    currentInput = '';
    currentTimeUnit = '';
    timeExpression = [];
}

function getFullTimeBreakdown(totalSeconds) {
    if (totalSeconds === 0) return '0 лет 0 дн 0 ч 0 мин 0 сек';
    const isNegative = totalSeconds < 0;
    totalSeconds = Math.abs(totalSeconds);

    const years = Math.floor(totalSeconds / TIME_UNITS.year);
    const remainingAfterYears = totalSeconds % TIME_UNITS.year;
    const days = Math.floor(remainingAfterYears / TIME_UNITS.day);
    const remainingAfterDays = remainingAfterYears % TIME_UNITS.day;
    const hours = Math.floor(remainingAfterDays / TIME_UNITS.hour);
    const remainingAfterHours = remainingAfterDays % TIME_UNITS.hour;
    const minutes = Math.floor(remainingAfterHours / TIME_UNITS.min);
    const seconds = Math.floor(remainingAfterHours % TIME_UNITS.min);

    const result = `${years} лет ${days} дн ${hours} ч ${minutes} мин ${seconds} сек`;
    return isNegative ? `−${result}` : result;
}

// Speed functions
function setSpeedUnit(unit) {
    if (currentInput === '') {
        alert('Введите число сначала!');
        return;
    }
    currentSpeedUnit = unit;
    speedValue = currentInput;
    convertSpeed();
}

function updateSpeedDisplay() {
    if (currentInput !== '' && currentSpeedUnit === '') {
        expressionDisplay.textContent = 'Выберите единицу скорости:';
        resultDisplay.textContent = currentInput;
    } else if (currentInput !== '' && currentSpeedUnit !== '') {
        expressionDisplay.textContent = `${currentInput} ${SPEED_LABELS[currentSpeedUnit]} =`;
        resultDisplay.textContent = '...';
    } else {
        expressionDisplay.textContent = 'Введите скорость';
        resultDisplay.textContent = '0';
    }
    adjustFontSize();
}

function convertSpeed() {
    if (speedValue === '' || currentSpeedUnit === '') return;

    const value = parseFloat(speedValue);
    if (isNaN(value)) {
        alert('Введите корректное число!');
        return;
    }

    const isLinear = currentSpeedUnit in SPEED_UNITS.linear;
    const unitGroup = isLinear ? SPEED_UNITS.linear : SPEED_UNITS.angular;

    const baseValue = value * unitGroup[currentSpeedUnit];
    const results = [];
    
    for (const [unit, conversion] of Object.entries(unitGroup)) {
        if (unit !== currentSpeedUnit) {
            const converted = baseValue / conversion;
            const formatted = converted % 1 === 0 ? converted.toFixed(0) : converted.toFixed(2);
            results.push(`${formatted} ${SPEED_LABELS[unit]}`);
        }
    }

    expressionDisplay.textContent = `${speedValue} ${SPEED_LABELS[currentSpeedUnit]} =`;
    resultDisplay.innerHTML = results.join('<br>');
    resultDisplay.style.fontSize = '1.3rem';
    resultDisplay.style.lineHeight = '1.6';
    resultDisplay.style.textAlign = 'left';
}

function showAllSpeeds() {
    if (currentInput === '') {
        alert('Введите скорость!');
        return;
    }
    if (currentSpeedUnit === '') {
        alert('Выберите единицу скорости!');
        return;
    }

    speedValue = currentInput;
    const value = parseFloat(speedValue);
    
    if (isNaN(value)) {
        alert('Введите корректное число!');
        return;
    }

    const isLinear = currentSpeedUnit in SPEED_UNITS.linear;
    const unitGroup = isLinear ? SPEED_UNITS.linear : SPEED_UNITS.angular;

    const baseValue = value * unitGroup[currentSpeedUnit];
    const results = [];
    
    for (const [unit, conversion] of Object.entries(unitGroup)) {
        const converted = baseValue / conversion;
        const formatted = converted % 1 === 0 ? converted.toFixed(0) : converted.toFixed(2);
        results.push(`${formatted} ${SPEED_LABELS[unit]}`);
    }

    expressionDisplay.textContent = 'Все единицы:';
    resultDisplay.innerHTML = results.join('<br>');
    resultDisplay.style.fontSize = '1.1rem';
    resultDisplay.style.lineHeight = '1.8';
    resultDisplay.style.textAlign = 'left';
}

// Keyboard support
document.addEventListener('keydown', (event) => {
    const key = event.key;
    if (currentMode === 'normal') {
        if ('0123456789.'.includes(key)) {
            appendNumber(key);
        } else if (key === '+' || key === '-' || key === '*' || key === '/') {
            appendOperator(key);
        } else if (key === '(' || key === ')') {
            appendBracket(key);
        } else if (key === '%') {
            calculatePercent();
        } else if (key === 'Enter' || key === '=') {
            calculate();
        } else if (key === 'Escape') {
            clearAll();
        } else if (key === 'Backspace') {
            deleteLastChar();
        }
    } else {
        if ('0123456789.'.includes(key)) {
            appendNumber(key);
        } else if (key === '+' || key === '-') {
            appendOperator(key);
        } else if ((key === '*' || key === '/') && currentMode === 'normal') {
            appendOperator(key);
        } else if (key === 'Enter' || key === '=') {
            if (currentMode === 'time') calculateTime();
            else calculate();
        } else if (key === 'Escape') {
            clearAll();
        } else if (key === 'Backspace') {
            clearEntry();
        }
    }
});

// Simple auto-initialization
window.addEventListener('load', () => {
    setTimeout(() => {
        if (navigator.vibrate) {
            navigator.vibrate(1);
        }
    }, 100);
});

// Touch feedback - vibrate only on release (click)
document.body.addEventListener('click', (event) => {
    if (event.target.classList.contains('btn') || event.target.closest('.btn')) {
        try {
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        } catch (e) {
            console.log('Vibration not supported');
        }
    }
});

updateDisplay();