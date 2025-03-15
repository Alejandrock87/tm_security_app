// Establecer conexión con Socket.IO (declaración en base.html)
let socket = io('/', {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
});
let notificationPermission = localStorage.getItem('notificationPermission') === 'true';
let selectedFilter = 'all';
let selectedTroncales = [];
let selectedEstaciones = [];
let stationsData = []; // Almacenar datos de estaciones

document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando página de predicciones...');
    initializeFilters();
    initializeNotifications();
    loadAndCheckPredictions();
    setInterval(loadAndCheckPredictions, 60000); // Actualizar cada minuto

    // Configurar manejadores de WebSocket
    socket.on('connect', function() {
        console.log('Conexión WebSocket establecida');
    });

    socket.on('connect_error', function(error) {
        console.error('Error de conexión WebSocket:', error);
    });

    // Agregar manejador de eventos WebSocket para predicciones
    socket.on('predictions_updated', function(data) {
        console.log('Predicciones actualizadas recibidas:', data);
        if (data && data.predictions && Array.isArray(data.predictions)) {
            updatePredictionsList(data.predictions);
        } else {
            console.error('Formato de datos inválido en predictions_updated:', data);
        }
    });
});

// Función para actualizar la lista de predicciones
function updatePredictionsList(predictions) {
    const predictionsList = document.getElementById('predictionsList');
    if (!predictionsList) {
        console.error('No se encontró el elemento predictionsList');
        return;
    }

    try {
        const filteredPredictions = filterPredictions(predictions);

        if (!filteredPredictions.length) {
            predictionsList.innerHTML = `
                <div class="alert alert-info" role="alert">
                    <i class="fas fa-info-circle"></i>
                    No hay predicciones disponibles para la próxima hora con los filtros seleccionados.
                </div>`;
            return;
        }

        // Ordenar predicciones por tiempo
        filteredPredictions.sort((a, b) =>
            new Date(a.predicted_time) - new Date(b.predicted_time)
        );

        predictionsList.innerHTML = ''; // Limpiar lista actual
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
                <div class="station-info">
                    <small class="text-muted">Troncal: ${prediction.troncal || 'N/A'}</small>
                </div>
            `;

            predictionsList.appendChild(item);
            checkAndNotify(prediction);
        });
    } catch (error) {
        console.error('Error actualizando lista de predicciones:', error);
        predictionsList.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <i class="fas fa-exclamation-circle"></i>
                Error al actualizar las predicciones: ${error.message}
            </div>`;
    }
}

// Función para cargar y verificar predicciones
function loadAndCheckPredictions() {
    console.log('Cargando predicciones...');
    const predictionsList = document.getElementById('predictionsList');
    if (!predictionsList) {
        console.error('No se encontró el elemento predictionsList');
        return;
    }

    predictionsList.innerHTML = '<div class="loading-message">Cargando predicciones...</div>';

    fetch('/api/predictions')
        .then(response => {
            console.log('Respuesta recibida:', response);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Predicciones recibidas:', data);
            if (Array.isArray(data)) {
                updatePredictionsList(data);
            } else if (data.error) {
                throw new Error(data.error);
            } else {
                throw new Error('Formato de datos inválido');
            }
        })
        .catch(error => {
            console.error('Error al cargar predicciones:', error);
            predictionsList.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <i class="fas fa-exclamation-circle"></i>
                    Error al cargar las predicciones: ${error.message}
                </div>`;
        });
}

// Inicializar filtros
function initializeFilters() {
    const filterRadios = document.querySelectorAll('input[name="filterType"]');
    const troncalesFilter = document.getElementById('troncalesFilter');
    const estacionesFilter = document.getElementById('estacionesFilter');
    const troncalesCheckboxes = document.getElementById('troncalesCheckboxes');
    const estacionesCheckboxes = document.getElementById('estacionesCheckboxes');
    const estacionSearch = document.getElementById('estacionSearch');
    const selectAllTroncales = document.getElementById('selectAllTroncales');
    const selectAllEstaciones = document.getElementById('selectAllEstaciones');

    // Cargar troncales y estaciones
    fetch('/api/stations')
        .then(response => response.json())
        .then(data => {
            stationsData = data;
            // Obtener troncales únicas
            const troncales = [...new Set(data.map(station => station.troncal))].filter(troncal => troncal && troncal !== 'N/A');

            // Limpiar checkboxes existentes
            troncalesCheckboxes.innerHTML = '';
            estacionesCheckboxes.innerHTML = '';

            // Agregar troncales
            troncales.forEach(troncal => {
                const checkboxItem = createCheckboxItem(troncal, 'troncal');
                troncalesCheckboxes.appendChild(checkboxItem);
            });

            // Agregar estaciones inicialmente (todas)
            updateEstacionesCheckboxes(data);
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

            // Reiniciar selecciones al cambiar el filtro
            if (this.value === 'all') {
                selectAllTroncales.checked = false;
                selectAllEstaciones.checked = false;
                selectedTroncales = [];
                selectedEstaciones = [];
                updateEstacionesCheckboxes(stationsData);
            }

            loadAndCheckPredictions();
        });
    });

    // Manejar "Seleccionar todo" para troncales
    selectAllTroncales.addEventListener('change', function() {
        const checkboxes = troncalesCheckboxes.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = this.checked;
        });
        selectedTroncales = this.checked ?
            Array.from(checkboxes).map(cb => cb.value) : [];

        // Actualizar lista de estaciones basada en troncales seleccionadas
        updateEstacionesCheckboxes(stationsData);
        // Resetear selección de estaciones cuando cambian las troncales
        selectAllEstaciones.checked = false;
        selectedEstaciones = [];
        loadAndCheckPredictions();
    });

    // Manejar "Seleccionar todo" para estaciones
    selectAllEstaciones.addEventListener('change', function() {
        const checkboxes = estacionesCheckboxes.querySelectorAll('input[type="checkbox"]:not([disabled])');
        checkboxes.forEach(checkbox => {
            checkbox.checked = this.checked;
        });
        selectedEstaciones = this.checked ?
            Array.from(checkboxes).map(cb => cb.value) : [];
        loadAndCheckPredictions();
    });
}

// Función para actualizar estaciones basada en troncales seleccionadas
function updateEstacionesCheckboxes(data) {
    const estacionesCheckboxes = document.getElementById('estacionesCheckboxes');
    const selectAllEstaciones = document.getElementById('selectAllEstaciones');
    estacionesCheckboxes.innerHTML = '';

    // Filtrar estaciones según las troncales seleccionadas
    const filteredStations = selectedTroncales.length > 0 ?
        data.filter(station => selectedTroncales.includes(station.troncal)) :
        data;

    // Si no hay estaciones disponibles, deshabilitar "Seleccionar todo"
    selectAllEstaciones.disabled = filteredStations.length === 0;
    if (filteredStations.length === 0) {
        selectAllEstaciones.checked = false;
        const mensaje = document.createElement('div');
        mensaje.className = 'no-stations-message';
        mensaje.textContent = 'No hay estaciones disponibles para las troncales seleccionadas';
        estacionesCheckboxes.appendChild(mensaje);
        return;
    }

    // Agregar las estaciones filtradas
    filteredStations.forEach(station => {
        const checkboxItem = createCheckboxItem(station.nombre, 'estacion');
        estacionesCheckboxes.appendChild(checkboxItem);
    });

    // Actualizar estado del checkbox "Seleccionar todo" según las selecciones actuales
    const allChecked = selectedEstaciones.length === filteredStations.length;
    selectAllEstaciones.checked = allChecked;
}

// Crear elemento checkbox
function createCheckboxItem(value, type) {
    const div = document.createElement('div');
    div.className = 'checkbox-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `${type}-${value}`;
    checkbox.value = value;
    checkbox.checked = type === 'troncal' ?
        selectedTroncales.includes(value) :
        selectedEstaciones.includes(value);

    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.textContent = value;

    checkbox.addEventListener('change', function() {
        if (type === 'troncal') {
            selectedTroncales = getSelectedValues('troncal');
            // Actualizar lista de estaciones cuando cambian las troncales seleccionadas
            updateEstacionesCheckboxes(stationsData);
        } else {
            selectedEstaciones = getSelectedValues('estacion');
            // Actualizar estado del checkbox "Seleccionar todo"
            updateSelectAllEstacionesState();
        }
        loadAndCheckPredictions();
    });

    div.appendChild(checkbox);
    div.appendChild(label);
    return div;
}

// Actualizar estado del checkbox "Seleccionar todo" para estaciones
function updateSelectAllEstacionesState() {
    const selectAllEstaciones = document.getElementById('selectAllEstaciones');
    const checkboxes = document.querySelectorAll('#estacionesCheckboxes input[type="checkbox"]:not([disabled])');
    const checkedBoxes = document.querySelectorAll('#estacionesCheckboxes input[type="checkbox"]:checked:not([disabled])');

    selectAllEstaciones.checked = checkboxes.length > 0 && checkboxes.length === checkedBoxes.length;
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

    if (localStorage.getItem('inAppNotificationsEnabled') === 'true') {
        notificationToggle.checked = true;
    }

    notificationToggle.addEventListener('change', function() {
        if (this.checked) {
            localStorage.setItem('inAppNotificationsEnabled', 'true');
            showInAppNotification({
                title: 'Notificaciones Activadas',
                message: 'Recibirás alertas de predicciones en tiempo real',
                type: 'success'
            });
            socket.emit('subscribe_notifications', {
                userId: getUserId(),
                filter: {
                    type: selectedFilter,
                    troncales: selectedTroncales,
                    estaciones: selectedEstaciones
                }
            });
        } else {
            localStorage.setItem('inAppNotificationsEnabled', 'false');
            socket.emit('unsubscribe_notifications', { userId: getUserId() });
        }
    });
}

// Función para mostrar notificaciones in-app
function showInAppNotification(notification) {
    const toastContainer = document.getElementById('toastContainer') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${notification.type || 'info'} show`;

    toast.innerHTML = `
        <div class="toast-header">
            <strong>${notification.title || 'Alerta'}</strong>
            <small>${new Date().toLocaleTimeString()}</small>
        </div>
        <div class="toast-body">
            ${notification.message}
        </div>
    `;

    toastContainer.appendChild(toast);

    // Remover la notificación después de 5 segundos
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// Crear contenedor de notificaciones si no existe
function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    document.body.appendChild(container);
    return container;
}

// Función para filtrar predicciones
function filterPredictions(predictions) {
    // Primero filtrar por tiempo - solo mostrar predicciones dentro de la próxima hora
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    predictions = predictions.filter(prediction => {
        const predTime = new Date(prediction.predicted_time);
        return predTime >= now && predTime <= oneHourFromNow;
    });

    // Luego aplicar filtros de usuario
    if (selectedFilter === 'all') return predictions;

    return predictions.filter(prediction => {
        if (selectedFilter === 'troncales') {
            return selectedTroncales.length === 0 ||
                selectedTroncales.includes(prediction.troncal);
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


// Función para verificar y mostrar notificación de predicción
function checkAndNotify(prediction) {
    if (localStorage.getItem('inAppNotificationsEnabled') !== 'true') return;

    const now = new Date();
    const predTime = new Date(prediction.predicted_time);
    const diffMinutes = Math.floor((predTime - now) / (1000 * 60));

    // Notificar cuando falte aproximadamente una hora
    if (diffMinutes >= 59 && diffMinutes <= 61) {
        const riskInfo = getRiskInfo(prediction.risk_score);
        showInAppNotification({
            title: 'Alerta de Predicción',
            message: `Posible ${prediction.incident_type} en ${prediction.station}\nNivel de riesgo: ${(prediction.risk_score * 100).toFixed(1)}% (${riskInfo.label})\nEn aproximadamente 1 hora`,
            type: riskInfo.class
        });
    }
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