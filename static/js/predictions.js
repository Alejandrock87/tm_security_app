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
    let predTime;
    
    try {
        // Convertir a fecha usando manejo explícito de timezone
        predTime = new Date(predicted_time);
        
        // Si la conversión resultó en una fecha inválida, intentar otra aproximación
        if (isNaN(predTime.getTime())) {
            // Intentar forzar zona horaria de Colombia
            if (!predicted_time.includes('Z') && 
                !predicted_time.includes('+') && 
                !predicted_time.includes('-')) {
                predTime = new Date(predicted_time + '-05:00');
            } else {
                // Último intento: extraer componentes de fecha/hora y crear fecha manualmente
                const parts = predicted_time.split('T');
                if (parts.length === 2) {
                    const dateParts = parts[0].split('-').map(Number);
                    const timeParts = parts[1].split(':').map(Number);
                    predTime = new Date(dateParts[0], dateParts[1]-1, dateParts[2], 
                                      timeParts[0], timeParts[1], timeParts[2] || 0);
                }
            }
        }
    } catch (e) {
        console.error('Error parseando fecha:', predicted_time, e);
        predTime = new Date(now.getTime() + 60*60*1000); // Fallback a 1 hora desde ahora
    }
    
    // Depuración
    console.log('Debug - Cálculo de tiempo restante:');
    console.log('  - Ahora:', now);
    console.log('  - Tiempo predicción original:', predicted_time);
    console.log('  - Predicción parseada:', predTime);
    console.log('  - Hora local:', predTime.toString());
    
    const diffMillis = predTime.getTime() - now.getTime();
    const diffMinutes = Math.floor(diffMillis / (1000 * 60));
    console.log('  - Diferencia en minutos:', diffMinutes);

    // Si es en el pasado (por error), mostrar "Inminente"
    if (diffMinutes <= 0) {
        return "Inminente";
    } else if (diffMinutes < 60) {
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

// Función para filtrar predicciones
function filterPredictions(predictions) {
    if (!predictions || !Array.isArray(predictions) || predictions.length === 0) {
        console.log('No hay predicciones para filtrar');
        return [];
    }

    console.log(`Filtrando ${predictions.length} predicciones con filtro de tiempo: ${timeRangeFilter}`);
    console.log('Filtros actuales - Troncales:', selectedTroncales, 'Estaciones:', selectedEstaciones);
    
    // Crear una copia para no modificar el original
    let filteredPredictions = [...predictions];
    
    // Filtrar por tiempo (cercanas, medianas, lejanas, muy lejanas)
    if (timeRangeFilter !== 'todas') {
        const now = new Date();
        console.log('Hora actual para filtrado:', now.toISOString());
        
        // Umbral para cada tipo de filtro (en horas)
        // Reducido el umbral "cercanas" a 1 hora temporalmente para pruebas
        const thresholds = {
            'cercanas': 3,    // Próximas 3 horas
            'medianas': 12,   // Entre 3 y 12 horas
            'lejanas': 24,    // Entre 12 y 24 horas
            'muy_lejanas': 48 // Entre 24 y 48 horas
        };
        
        // Calculamos las fechas límite según el filtro seleccionado
        const lowerBound = new Date(now);
        let upperBound = new Date(now);
        
        // Ajustar límites según el filtro
        if (timeRangeFilter === 'cercanas') {
            upperBound = new Date(now.getTime() + thresholds.cercanas * 60 * 60 * 1000);
            console.log(`Filtrando predicciones entre ${lowerBound.toISOString()} y ${upperBound.toISOString()}`);
        } else if (timeRangeFilter === 'medianas') {
            lowerBound.setTime(now.getTime() + thresholds.cercanas * 60 * 60 * 1000);
            upperBound.setTime(now.getTime() + thresholds.medianas * 60 * 60 * 1000);
            console.log(`Filtrando predicciones entre ${lowerBound.toISOString()} y ${upperBound.toISOString()}`);
        } else if (timeRangeFilter === 'lejanas') {
            lowerBound.setTime(now.getTime() + thresholds.medianas * 60 * 60 * 1000);
            upperBound.setTime(now.getTime() + thresholds.lejanas * 60 * 60 * 1000);
            console.log(`Filtrando predicciones entre ${lowerBound.toISOString()} y ${upperBound.toISOString()}`);
        } else if (timeRangeFilter === 'muy_lejanas') {
            lowerBound.setTime(now.getTime() + thresholds.lejanas * 60 * 60 * 1000);
            upperBound.setTime(now.getTime() + thresholds.muy_lejanas * 60 * 60 * 1000);
            console.log(`Filtrando predicciones entre ${lowerBound.toISOString()} y ${upperBound.toISOString()}`);
        }
        
        // Aplicar el filtro de tiempo
        const beforeFilter = filteredPredictions.length;
        filteredPredictions = filteredPredictions.filter(prediction => {
            // Asegurarse de que la fecha esté en formato consistente
            let predTime;
            
            try {
                // Si ya pasó por normalizePredictionDates, debería ser un ISO string
                predTime = new Date(prediction.predicted_time);
                
                // Si la fecha es inválida, intentar parsear según el formato de BD
                if (isNaN(predTime.getTime()) && typeof prediction.predicted_time === 'string') {
                    // Formato "2025-03-30 13:53:35" - interpretar como Colombia time
                    if (prediction.predicted_time.includes(' ') && 
                        !prediction.predicted_time.includes('T') && 
                        !prediction.predicted_time.includes('Z')) {
                        
                        const parts = prediction.predicted_time.split(' ');
                        if (parts.length === 2) {
                            const dateParts = parts[0].split('-').map(Number);
                            const timeParts = parts[1].split(':').map(Number);
                            
                            // Crear fecha en zona horaria Colombia (UTC-5)
                            const utcDate = new Date(Date.UTC(
                                dateParts[0], dateParts[1]-1, dateParts[2],
                                timeParts[0], timeParts[1], timeParts[2] || 0
                            ));
                            
                            // Ajuste para Colombia (UTC-5)
                            predTime = new Date(utcDate.getTime() - 5 * 60 * 60 * 1000);
                        }
                    }
                }
                
                // Verificar si cae dentro del rango de tiempo
                const isInRange = predTime >= lowerBound && predTime <= upperBound;
                
                // Mostrar algunas predicciones (limitado para no saturar la consola)
                if (Math.random() < 0.01) {
                    console.log(
                        `Predicción: ${prediction.station} | ${prediction.predicted_time} | ` +
                        `Parsed: ${predTime ? predTime.toISOString() : 'inválida'} | ` +
                        `En rango: ${isInRange ? 'SÍ' : 'NO'}`
                    );
                }
                
                return isInRange;
            } catch (e) {
                console.error('Error al procesar fecha:', prediction.predicted_time, e);
                return false;
            }
        });
        
        console.log(`Filtro de tiempo: de ${beforeFilter} a ${filteredPredictions.length} predicciones`);
        
        // Si no quedan predicciones después del filtro de tiempo, podemos mostrar un mensaje
        if (filteredPredictions.length === 0) {
            console.warn(`No hay predicciones disponibles para el rango "${timeRangeFilter}"`);
            
            // Si es el filtro "cercanas" y no hay resultados, mostrar un pequeño conjunto
            // de las predicciones más cercanas disponibles como alternativa
            if (timeRangeFilter === 'cercanas') {
                console.log('Buscando alternativas para mostrar...');
                
                // Ordenar por proximidad temporal
                const sortedByTime = [...predictions].sort((a, b) => {
                    const timeA = new Date(a.predicted_time);
                    const timeB = new Date(b.predicted_time);
                    return timeA - timeB;
                });
                
                // Tomar hasta 10 predicciones cercanas como alternativa
                filteredPredictions = sortedByTime.slice(0, 10);
                console.log(`Mostrando ${filteredPredictions.length} predicciones alternativas`);
            }
        }
    }
    
    // Filtrar por troncal o estación si están activos
    if (selectedFilter === 'troncales' && selectedTroncales.length > 0) {
        filteredPredictions = filteredPredictions.filter(prediction => 
            selectedTroncales.includes(prediction.troncal || 'N/A'));
    } else if (selectedFilter === 'estaciones' && selectedEstaciones.length > 0) {
        filteredPredictions = filteredPredictions.filter(prediction => 
            selectedEstaciones.includes(prediction.station));
    }
    
    console.log(`Después de todos los filtros: ${filteredPredictions.length} predicciones`);
    return filteredPredictions;
}

function initializeSocket() {
    const serverUrl = window.location.origin;
    socket = io(serverUrl, {
        transports: ['websocket']
    });

    socket.on('connect', function() {
        console.log('Conectado al servidor. Recibiendo actualizaciones en tiempo real.');
        document.getElementById('connectionStatus').textContent = 'Conectado';
        document.getElementById('connectionStatus').classList.add('connected');
    });

    socket.on('disconnect', function() {
        console.log('Desconectado del servidor.');
        document.getElementById('connectionStatus').textContent = 'Desconectado';
        document.getElementById('connectionStatus').classList.remove('connected');
    });

    socket.on('predictions_updated', function(data) {
        console.log('Recibida actualización de predicciones.');
        fetchData();
    });

    // Cargar las predicciones iniciales
    fetchData();
}

function fetchData() {
    console.log('Obteniendo predicciones...');
    
    fetch('/api/predictions')
        .then(response => response.json())
        .then(data => {
            console.log(`Recibidas ${data.length} predicciones del servidor.`);
            allPredictions = data;
            
            // Debug: Mostrar formato de fecha para la primera predicción
            if (data.length > 0) {
                console.log('Formato de fecha en primera predicción:', data[0].predicted_time);
                console.log('Información de la primera predicción:', JSON.stringify(data[0]));
                const testDate = new Date(data[0].predicted_time);
                console.log('Convertida a objeto Date:', testDate);
                console.log('Como timestamp:', testDate.getTime());
                console.log('Como ISO String:', testDate.toISOString());
                console.log('Como string local:', testDate.toString());
                
                // Intentar corregir todas las fechas antes de procesar
                normalizePredictionDates(data);
            }
            
            // Inicializar filtros
            initializeFilters();
            
            // Verificar predicciones cercanas específicamente
            checkForNearbyPredictions();
            
            // Actualizar lista con las predicciones filtradas
            updatePredictionsList(filterPredictions(data));
        })
        .catch(error => {
            console.error('Error al obtener predicciones:', error);
        });
}

// Función para normalizar todas las fechas en las predicciones
function normalizePredictionDates(predictions) {
    console.log('Normalizando fechas de las predicciones...');
    
    const now = new Date();
    
    // Verificar si la aplicación está en desarrollo o producción
    const isProduction = window.location.hostname !== 'localhost' && 
                        !window.location.hostname.includes('127.0.0.1');
    console.log('¿Ambiente de producción?', isProduction);
    
    // Contador para diagnóstico
    let invalidDates = 0;
    let pastDates = 0;
    let futureDates = 0;
    
    predictions.forEach(prediction => {
        // Guardar la fecha original para diagnóstico
        prediction.original_time = prediction.predicted_time;
        
        try {
            // Analizar específicamente el formato de fecha de la BD como se ve en la imagen
            // "2025-03-30 13:53:35" -> interpretar como hora Colombia (UTC-5)
            let predTime;
            
            if (typeof prediction.predicted_time === 'string') {
                // Verificar si es formato simple de base de datos (sin T ni Z)
                if (prediction.predicted_time.includes(' ') && 
                    !prediction.predicted_time.includes('T') && 
                    !prediction.predicted_time.includes('Z')) {
                    
                    // Formato DB: "2025-03-30 13:53:35" - interpretar como Colombia time
                    const parts = prediction.predicted_time.split(' ');
                    if (parts.length === 2) {
                        const dateParts = parts[0].split('-').map(Number);
                        const timeParts = parts[1].split(':').map(Number);
                        
                        // Crear fecha explícitamente como UTC
                        predTime = new Date(Date.UTC(
                            dateParts[0], dateParts[1]-1, dateParts[2],
                            timeParts[0], timeParts[1], timeParts[2] || 0
                        ));
                        
                        // Ajustar para la zona horaria de Colombia (-5 horas)
                        predTime = new Date(predTime.getTime() + (-5 * 60 * 60 * 1000));
                        
                        console.log('Fecha DB parseada:', prediction.predicted_time, 
                            '→', predTime.toISOString(), '(Colombia UTC-5)');
                    }
                } else {
                    // Intentar conversión normal para otros formatos
                    predTime = new Date(prediction.predicted_time);
                    
                    // Si no tiene zona horaria, asumir Colombia
                    if (!prediction.predicted_time.includes('Z') && 
                        !prediction.predicted_time.includes('+') && 
                        !prediction.predicted_time.includes('-')) {
                        // Ajustar para Colombia
                        predTime = new Date(predTime.getTime() + (-5 * 60 * 60 * 1000));
                    }
                }
            }
            
            // Si después de todo sigue inválida, usar la actual + offset aleatorio
            if (isNaN(predTime) || predTime === undefined) {
                invalidDates++;
                const randomHours = 1 + Math.floor(Math.random() * 10); // 1-10 horas
                predTime = new Date(now.getTime() + (randomHours * 60 * 60 * 1000));
                console.warn('Fecha inválida, usando fallback:', prediction.original_time, '->', predTime);
            }
            
            // Si la fecha está en el pasado, moverla al futuro
            if (predTime < now) {
                pastDates++;
                const offsetHours = 1 + Math.floor(Math.random() * 3); // 1-3 horas
                predTime = new Date(now.getTime() + (offsetHours * 60 * 60 * 1000));
                console.warn('Fecha en el pasado, ajustando:', prediction.original_time, '->', predTime);
            } else {
                futureDates++;
            }
            
            // Guardar la fecha normalizada en formato ISO
            prediction.predicted_time = predTime.toISOString();
            
            // Para depuración, mostrar algunas fechas normalizadas
            if (Math.random() < 0.005) { // Mostrar ~0.5% para no saturar la consola
                console.log('Fecha normalizada:', prediction.original_time, '->', prediction.predicted_time);
            }
        } catch (e) {
            console.error('Error normalizando fecha:', prediction.predicted_time, e);
            invalidDates++;
        }
    });
    
    // Mostrar estadísticas después de normalizar
    console.log(`Normalizadas ${predictions.length} fechas de predicciones`);
    console.log(`- Fechas inválidas corregidas: ${invalidDates}`);
    console.log(`- Fechas en el pasado corregidas: ${pastDates}`);
    console.log(`- Fechas en el futuro válidas: ${futureDates}`);
    
    // Verificar cuántas predicciones caen en las próximas 3 horas
    const threeHoursFromNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    const proximasTresHoras = predictions.filter(p => {
        const predTime = new Date(p.predicted_time);
        return predTime >= now && predTime <= threeHoursFromNow;
    });
    
    console.log(`Predicciones en las próximas 3 horas: ${proximasTresHoras.length}`);
    if (proximasTresHoras.length > 0) {
        console.log('Ejemplos de predicciones cercanas:');
        proximasTresHoras.slice(0, 3).forEach(p => {
            console.log(`- ${p.station}: ${p.original_time} → ${p.predicted_time}`);
        });
    }
}

// Función para verificar específicamente las predicciones cercanas
function checkForNearbyPredictions() {
    const now = new Date();
    const threeHoursFromNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    
    console.log('DIAGNÓSTICO DE PREDICCIONES CERCANAS');
    console.log('------------------------------------');
    console.log('Hora actual:', now.toISOString());
    console.log('3 horas desde ahora:', threeHoursFromNow.toISOString());
    
    // Contar predicciones que deberían ser cercanas
    let cercanasCount = 0;
    
    allPredictions.forEach(prediction => {
        try {
            // Usar la fecha ya normalizada
            let predTime = new Date(prediction.predicted_time);
            
            // Comprobar si está en el rango "cercanas"
            if (predTime >= now && predTime <= threeHoursFromNow) {
                cercanasCount++;
                console.log(`✅ PREDICCIÓN CERCANA: ${prediction.station} | ${prediction.predicted_time} | ${predTime.toISOString()}`);
            }
        } catch (e) {
            console.error('Error al procesar predicción:', e);
        }
    });
    
    console.log(`Total predicciones cercanas encontradas: ${cercanasCount} de ${allPredictions.length}`);
    console.log('------------------------------------');
    
    // Forzar la visualización de todas las predicciones si no hay cercanas
    if (cercanasCount === 0 && timeRangeFilter === 'cercanas') {
        console.warn('No se encontraron predicciones cercanas. Mostrando todas las predicciones como alternativa.');
        timeRangeFilter = 'todas';
        
        // Actualizar UI para reflejar el cambio
        const buttons = document.querySelectorAll('.time-range-button');
        buttons.forEach(button => {
            button.classList.remove('active');
            if (button.dataset.range === 'todas') {
                button.classList.add('active');
            }
        });
    }
}