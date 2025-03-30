// Usando la conexión Socket.IO global
console.log('Cargando módulo de predicciones...');

let notificationPermission = localStorage.getItem('notificationPermission') === 'true';
let selectedFilter = 'all';
let selectedTroncales = [];
let selectedEstaciones = [];
let stationsData = [];
let timeRangeFilter = 'cercanas'; // 'cercanas', 'medianas', 'lejanas', 'todas'

function initializeSocketHandlers() {
    console.log('Configurando manejadores de Socket.IO para predicciones...');

    socket.on('connect', function() {
        console.log('Conexión WebSocket establecida en predictions.js');
        showInAppNotification({
            title: 'Conexión establecida',
            message: 'Conectado al servidor de predicciones en tiempo real',
            type: 'success'
        });
    });

    socket.on('connect_error', function(error) {
        console.error('Error de conexión WebSocket en predictions.js:', error);
        showInAppNotification({
            title: 'Error de conexión',
            message: 'No se pudo establecer conexión con el servidor',
            type: 'error'
        });
    });

    socket.on('disconnect', function() {
        console.log('Desconectado del servidor WebSocket en predictions.js');
        showInAppNotification({
            title: 'Desconexión',
            message: 'Se perdió la conexión con el servidor',
            type: 'warning'
        });
    });

    socket.on('predictions_updated', function(data) {
        console.log('Predicciones actualizadas recibidas:', data);
        if (data && data.predictions && Array.isArray(data.predictions)) {
            updatePredictionsList(data.predictions);
        } else {
            console.error('Formato de datos inválido en predictions_updated:', data);
            showInAppNotification({
                title: 'Error de datos',
                message: 'Formato de predicciones inválido',
                type: 'error'
            });
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando página de predicciones...');

    // Esperar a que socket esté inicializado
    if (socket && socket.connected) {
        console.log('Socket.IO ya está disponible, configurando manejadores...');
        initializeSocketHandlers();
    } else {
        console.log('Esperando inicialización de Socket.IO...');
        document.addEventListener('socketInitialized', () => {
            console.log('Socket.IO inicializado, configurando manejadores...');
            initializeSocketHandlers();
        });
    }

    initializeFilters();
    initializeNotifications();
    loadAndCheckPredictions();
    setInterval(loadAndCheckPredictions, 60000); // Actualizar cada minuto
});

// Función para actualizar la lista de predicciones
function updatePredictionsList(predictions) {
    const predictionsList = document.getElementById('predictionsList');
    if (!predictionsList) {
        console.error('No se encontró el elemento predictionsList');
        return;
    }

    try {
        console.log('Procesando predicciones:', predictions);
        
        // Guardar las predicciones originales para usar con los filtros de tiempo
        const allPredictions = [...predictions];
        
        // Aplicar filtros actuales
        const filteredPredictions = filterPredictions(predictions);
        console.log('Predicciones filtradas:', filteredPredictions);

        // Reconstruir la lista de predicciones
        predictionsList.innerHTML = '';
        
        // Agregar selector de rango de tiempo
        const timeSelector = document.createElement('div');
        timeSelector.className = 'time-range-selector mb-3';
        timeSelector.innerHTML = `
            <div class="card">
                <div class="card-header bg-primary text-white">
                    <strong>Rango de tiempo</strong>
                </div>
                <div class="card-body">
                    <div class="btn-group w-100" role="group">
                        <button type="button" class="btn ${timeRangeFilter === 'cercanas' ? 'btn-primary' : 'btn-outline-primary'}" 
                            data-range="cercanas">Próximas 3h</button>
                        <button type="button" class="btn ${timeRangeFilter === 'medianas' ? 'btn-primary' : 'btn-outline-primary'}" 
                            data-range="medianas">3-6h</button>
                        <button type="button" class="btn ${timeRangeFilter === 'lejanas' ? 'btn-primary' : 'btn-outline-primary'}" 
                            data-range="lejanas">6-12h</button>
                        <button type="button" class="btn ${timeRangeFilter === 'muy_lejanas' ? 'btn-primary' : 'btn-outline-primary'}" 
                            data-range="muy_lejanas">12-24h</button>
                        <button type="button" class="btn ${timeRangeFilter === 'todas' ? 'btn-primary' : 'btn-outline-primary'}" 
                            data-range="todas">Todas</button>
                    </div>
                </div>
            </div>
        `;
        predictionsList.appendChild(timeSelector);
        
        // Configurar eventos para los botones del selector de tiempo
        const timeButtons = timeSelector.querySelectorAll('.btn');
        timeButtons.forEach(button => {
            button.addEventListener('click', function() {
                timeRangeFilter = this.getAttribute('data-range');
                // Actualizar botones activos
                timeButtons.forEach(btn => {
                    btn.classList.remove('btn-primary');
                    btn.classList.add('btn-outline-primary');
                });
                this.classList.remove('btn-outline-primary');
                this.classList.add('btn-primary');
                // Actualizar la lista con el nuevo filtro
                updatePredictionsList(allPredictions);
            });
        });

        if (!filteredPredictions.length) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'alert alert-info';
            emptyMessage.innerHTML = `
                <i class="fas fa-info-circle"></i>
                No hay predicciones disponibles para el rango de tiempo seleccionado con los filtros actuales.
            `;
            predictionsList.appendChild(emptyMessage);
            return;
        }

        // Agregar encabezado informativo
        const headerMessage = document.createElement('div');
        headerMessage.className = 'alert alert-primary mb-3';
        
        // Personalizar mensaje según el rango seleccionado
        let rangeText = '';
        switch(timeRangeFilter) {
            case 'cercanas': rangeText = 'próximas 3 horas'; break;
            case 'medianas': rangeText = '3 a 6 horas'; break;
            case 'lejanas': rangeText = '6 a 12 horas'; break;
            case 'muy_lejanas': rangeText = '12 a 24 horas'; break;
            case 'todas': rangeText = 'próximas 24 horas'; break;
        }
        
        headerMessage.innerHTML = `
            <i class="fas fa-clock"></i>
            Mostrando predicciones para las ${rangeText} (${filteredPredictions.length} predicciones)
        `;
        predictionsList.appendChild(headerMessage);

        // Ordenar predicciones por tiempo y riesgo
        filteredPredictions.sort((a, b) => {
            const timeA = new Date(a.predicted_time);
            const timeB = new Date(b.predicted_time);
            if (timeA.getTime() === timeB.getTime()) {
                return b.risk_score - a.risk_score; // Mayor riesgo primero
            }
            return timeA - timeB;
        });

        // Crear contenedor para las predicciones
        const predictionsContainer = document.createElement('div');
        filteredPredictions.forEach(prediction => {
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

            predictionsContainer.appendChild(item);
            checkAndNotify(prediction);
        });
        
        predictionsList.appendChild(predictionsContainer);
    } catch (error) {
        console.error('Error actualizando lista de predicciones:', error);
        predictionsList.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <i class="fas fa-exclamation-circle"></i>
                Error al actualizar las predicciones: ${error.message}
            </div>`;
    }
}

// Función para filtrar predicciones
function filterPredictions(predictions) {
    // Filtrar por tiempo según el rango seleccionado
    const now = new Date();
    const threeHoursFromNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    const sixHoursFromNow = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    const twelveHoursFromNow = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    predictions = predictions.filter(prediction => {
        const predTime = new Date(prediction.predicted_time);
        
        if (timeRangeFilter === 'cercanas') {
            return predTime >= now && predTime <= threeHoursFromNow;
        } else if (timeRangeFilter === 'medianas') {
            return predTime > threeHoursFromNow && predTime <= sixHoursFromNow;
        } else if (timeRangeFilter === 'lejanas') {
            return predTime > sixHoursFromNow && predTime <= twelveHoursFromNow;
        } else if (timeRangeFilter === 'muy_lejanas') {
            return predTime > twelveHoursFromNow && predTime <= twentyFourHoursFromNow;
        } else { // 'todas'
            return predTime >= now && predTime <= twentyFourHoursFromNow;
        }
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

            // Intentar inicializar predicciones si no hay datos
            fetch('/initialize_predictions')
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        console.log('Predicciones inicializadas:', data);
                        loadAndCheckPredictions(); // Recargar después de inicializar
                    }
                })
                .catch(initError => {
                    console.error('Error inicializando predicciones:', initError);
                });
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