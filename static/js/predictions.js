// Establecer conexión con Socket.IO
let socket = io();
let notificationPermission = localStorage.getItem('notificationPermission') === 'true';
let selectedFilter = 'all';
let selectedTroncales = [];
let selectedEstaciones = [];

document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando página de predicciones...');
    initializeFilters();
    initializeNotifications();
    loadAndCheckPredictions();
    setInterval(loadAndCheckPredictions, 60000);
});

// Inicializar filtros
function initializeFilters() {
    const filterRadios = document.querySelectorAll('input[name="filterType"]');
    const troncalesFilter = document.getElementById('troncalesFilter');
    const estacionesFilter = document.getElementById('estacionesFilter');
    const troncalesCheckboxes = document.getElementById('troncalesCheckboxes');
    const estacionesCheckboxes = document.getElementById('estacionesCheckboxes');
    const estacionSearch = document.getElementById('estacionSearch');

    // Cargar troncales y estaciones
    fetch('/api/stations')
        .then(response => response.json())
        .then(data => {
            // Obtener troncales únicas
            const troncales = [...new Set(data.map(station => station.troncal))];
            troncales.forEach(troncal => {
                if (troncal && troncal !== 'N/A') {
                    const checkboxItem = createCheckboxItem(troncal, 'troncal');
                    troncalesCheckboxes.appendChild(checkboxItem);
                }
            });

            // Agregar todas las estaciones
            data.forEach(station => {
                const checkboxItem = createCheckboxItem(station.nombre, 'estacion');
                estacionesCheckboxes.appendChild(checkboxItem);
            });
        })
        .catch(error => console.error('Error cargando estaciones:', error));

    // Manejar búsqueda de estaciones
    estacionSearch.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const estaciones = estacionesCheckboxes.querySelectorAll('.checkbox-item');

        estaciones.forEach(item => {
            const label = item.querySelector('label').textContent.toLowerCase();
            item.style.display = label.includes(searchTerm) ? '' : 'none';
        });
    });

    // Manejar cambios en el tipo de filtro
    filterRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            selectedFilter = this.value;
            troncalesFilter.classList.toggle('hidden', selectedFilter !== 'troncales');
            estacionesFilter.classList.toggle('hidden', selectedFilter !== 'estaciones');
            loadAndCheckPredictions();
        });
    });
}

// Crear elemento checkbox
function createCheckboxItem(value, type) {
    const div = document.createElement('div');
    div.className = 'checkbox-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `${type}-${value}`;
    checkbox.value = value;

    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.textContent = value;

    checkbox.addEventListener('change', function() {
        if (type === 'troncal') {
            selectedTroncales = getSelectedValues('troncal');
        } else {
            selectedEstaciones = getSelectedValues('estacion');
        }
        loadAndCheckPredictions();
    });

    div.appendChild(checkbox);
    div.appendChild(label);
    return div;
}

// Obtener valores seleccionados
function getSelectedValues(type) {
    const container = type === 'troncal' ? 'troncalesCheckboxes' : 'estacionesCheckboxes';
    const checkboxes = document.querySelectorAll(`#${container} input[type="checkbox"]:checked`);
    return Array.from(checkboxes).map(cb => cb.value);
}

// Inicializar notificaciones
function initializeNotifications() {
    const notificationToggle = document.getElementById('notificationToggle');

    if (notificationPermission) {
        notificationToggle.checked = true;
    }

    notificationToggle.addEventListener('change', async function() {
        if (this.checked) {
            try {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    notificationPermission = true;
                    localStorage.setItem('notificationPermission', 'true');
                    socket.emit('subscribe_notifications', { 
                        userId: getUserId(),
                        filter: {
                            type: selectedFilter,
                            troncales: selectedTroncales,
                            estaciones: selectedEstaciones
                        }
                    });
                } else {
                    notificationToggle.checked = false;
                    alert('Para recibir notificaciones, necesitas permitirlas en la configuración de tu navegador');
                }
            } catch (error) {
                console.error('Error al solicitar permisos:', error);
                notificationToggle.checked = false;
            }
        } else {
            notificationPermission = false;
            localStorage.setItem('notificationPermission', 'false');
            socket.emit('unsubscribe_notifications', { userId: getUserId() });
        }
    });
}

// Función para filtrar predicciones
function filterPredictions(predictions) {
    if (selectedFilter === 'all') return predictions;

    return predictions.filter(prediction => {
        if (selectedFilter === 'troncales') {
            return selectedTroncales.length === 0 || 
                   selectedTroncales.some(troncal => prediction.station.includes(troncal));
        } else if (selectedFilter === 'estaciones') {
            return selectedEstaciones.length === 0 || 
                   selectedEstaciones.includes(prediction.station);
        }
        return true;
    });
}

// Obtener clase de riesgo y estilo basado en el score
function getRiskInfo(risk_score) {
    const score = risk_score * 100;
    if (score > 70) {
        return {
            class: 'danger',
            label: 'Alto',
            color: 'var(--risk-high)'
        };
    } else if (score > 40) {
        return {
            class: 'warning',
            label: 'Medio',
            color: 'var(--risk-medium)'
        };
    }
    return {
        class: 'info',
        label: 'Bajo',
        color: 'var(--risk-low)'
    };
}

// Función para cargar y verificar predicciones
function loadAndCheckPredictions() {
    console.log('Cargando predicciones...');
    const predictionsList = document.getElementById('predictionsList');
    predictionsList.innerHTML = '<div class="loading-message">Cargando predicciones...</div>';

    fetch('/api/predictions')
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            console.log('Predicciones recibidas:', data);
            predictionsList.innerHTML = '';

            if (data.error) {
                predictionsList.innerHTML = `
                    <div class="alert alert-warning" role="alert">
                        <i class="fas fa-exclamation-triangle"></i>
                        ${data.error}
                    </div>`;
                return;
            }

            const filteredPredictions = filterPredictions(data);

            if (!filteredPredictions.length) {
                predictionsList.innerHTML = `
                    <div class="alert alert-info" role="alert">
                        <i class="fas fa-info-circle"></i>
                        No hay predicciones disponibles para los filtros seleccionados.
                    </div>`;
                return;
            }

            filteredPredictions.forEach(prediction => {
                console.log('Procesando predicción:', prediction);
                const riskInfo = getRiskInfo(prediction.risk_score);
                const item = document.createElement('div');
                item.className = `prediction-item prediction-item-${riskInfo.class}`;

                item.innerHTML = `
                    <div class="d-flex w-100 justify-content-between">
                        <h5 class="mb-1">${prediction.station}</h5>
                        <small>${getTimeUntilIncident(prediction.predicted_time)}</small>
                    </div>
                    <p class="mb-1">Posible ${prediction.incident_type}</p>
                    <small>Nivel de riesgo: ${(prediction.risk_score * 100).toFixed(1)}% (${riskInfo.label})</small>
                `;

                predictionsList.appendChild(item);
            });
        })
        .catch(error => {
            console.error('Error al cargar predicciones:', error);
            predictionsList.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <i class="fas fa-exclamation-circle"></i>
                    Error al cargar las predicciones. Por favor, intente de nuevo más tarde.
                </div>`;
        });
}

// Función para mostrar una notificación
function showNotification(prediction) {
    if (!notificationPermission) return;

    const riskInfo = getRiskInfo(prediction.risk_score);
    const notification = new Notification('Alerta de Seguridad', {
        body: `Posible ${prediction.incident_type} en ${prediction.station}\nNivel de riesgo: ${(prediction.risk_score * 100).toFixed(1)}% (${riskInfo.label})`,
        icon: '/static/icons/notification-icon.png',
        badge: '/static/icons/badge-icon.png',
        vibrate: [200, 100, 200]
    });

    notification.onclick = function() {
        window.focus();
        this.close();
    };
}

// Función para obtener el tiempo restante hasta el incidente
function getTimeUntilIncident(predicted_time) {
    const now = new Date();
    const predTime = new Date(predicted_time);
    const diffMinutes = Math.floor((predTime - now) / (1000 * 60));

    if (diffMinutes < 60) {
        return `En ${diffMinutes} minutos`;
    }
    const hours = Math.floor(diffMinutes / 60);
    return `En ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
}

// Función auxiliar para obtener el ID del usuario
function getUserId() {
    return document.querySelector('.predictions-content').dataset.userId || 'anonymous';
}