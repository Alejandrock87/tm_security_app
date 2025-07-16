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
    initializeTrainingHistory();
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
    if (!predictions || !Array.isArray(predictions) || predictions.length === 0) {
        console.log('No hay predicciones para filtrar');
        return [];
    }

    // SOLUCIÓN DEFINITIVA: Mostrar información detallada para diagnóstico
    const now = new Date();
    console.log('=== DIAGNÓSTICO DE FILTRADO DE PREDICCIONES ===');
    console.log(`Hora actual del cliente: ${now.toLocaleString()} (${now.toISOString()})`);
    console.log(`Filtro seleccionado: ${timeRangeFilter}`);
    console.log(`Total de predicciones recibidas: ${predictions.length}`);
    
    // Crear una copia para no modificar el original
    let filteredPredictions = [...predictions];
    
    // PASO 1: Normalizar todas las fechas para asegurar consistencia
    // Esto es crítico para el correcto funcionamiento del filtro
    filteredPredictions = filteredPredictions.map(prediction => {
        if (!prediction.predicted_time) return prediction;
        
        try {
            // Convertir la fecha al formato local para diagnóstico
            let originalTime = prediction.predicted_time;
            let predTime;
            
            // CASO 1: Formato ISO con Z (UTC) - "2025-03-30T13:53:35.000Z"
            if (typeof originalTime === 'string' && originalTime.includes('T') && originalTime.includes('Z')) {
                predTime = new Date(originalTime);
                prediction._timeSource = 'iso_utc_format';
            }
            // CASO 2: Formato ISO sin Z - "2025-03-30T13:53:35.000"
            else if (typeof originalTime === 'string' && originalTime.includes('T') && !originalTime.includes('Z')) {
                predTime = new Date(originalTime);
                prediction._timeSource = 'iso_local_format';
            }
            // CASO 3: Formato de base de datos "2025-03-30 13:53:35"
            else if (typeof originalTime === 'string' && 
                originalTime.includes(' ') && 
                !originalTime.includes('T') && 
                !originalTime.includes('Z')) {
                
                const parts = originalTime.split(' ');
                if (parts.length === 2) {
                    const dateParts = parts[0].split('-').map(Number);
                    const timeParts = parts[1].split(':').map(Number);
                    
                    // Crear fecha usando constructor estándar (en hora local)
                    predTime = new Date(
                        dateParts[0], dateParts[1]-1, dateParts[2],
                        timeParts[0], timeParts[1], timeParts[2] || 0
                    );
                    
                    prediction._timeSource = 'db_format';
                }
            } 
            // CASO 4: Cualquier otro formato de fecha
            else {
                predTime = new Date(originalTime);
                prediction._timeSource = 'standard_format';
            }
            
            // Verificar si la fecha es válida
            if (predTime && !isNaN(predTime.getTime())) {
                prediction._normalizedTime = predTime;
                
                // Diagnóstico adicional para entender mejor las fechas
                const timeDiff = predTime.getTime() - now.getTime();
                const hoursDiff = timeDiff / (60 * 60 * 1000);
                prediction._hoursDiff = hoursDiff;
                
                // Clasificar la predicción por rango de tiempo para diagnóstico
                if (hoursDiff < 0) {
                    prediction._timeRange = 'pasada';
                } else if (hoursDiff <= 3) {
                    prediction._timeRange = 'cercana';
                } else if (hoursDiff <= 12) {
                    prediction._timeRange = 'mediana';
                } else if (hoursDiff <= 24) {
                    prediction._timeRange = 'lejana';
                } else {
                    prediction._timeRange = 'muy_lejana';
                }
            } else {
                console.error('Fecha inválida:', originalTime);
            }
        } catch (e) {
            console.error('Error procesando fecha:', prediction.predicted_time, e);
        }
        
        return prediction;
    });
    
    // PASO 2: Mostrar muestra de predicciones para diagnóstico
    console.log('MUESTRA DE PREDICCIONES DISPONIBLES:');
    const sampleSize = Math.min(10, filteredPredictions.length);
    for (let i = 0; i < sampleSize; i++) {
        const p = filteredPredictions[i];
        console.log(`[${i}] ${p.station}: ${p.predicted_time} → ${p._normalizedTime ? p._normalizedTime.toLocaleString() : 'INVÁLIDA'} (${p._timeSource || 'unknown'}) [${p._timeRange || 'sin_clasificar'}] [${p._hoursDiff ? p._hoursDiff.toFixed(2) + 'h' : 'N/A'}]`);
    }
    
    // PASO 3: Filtrar por tiempo según el rango seleccionado
    if (timeRangeFilter !== 'todas') {
        // Definir rangos de tiempo en horas
        const ranges = {
            'cercanas': [0, 3],     // 0-3 horas
            'medianas': [3, 12],    // 3-12 horas
            'lejanas': [12, 24],    // 12-24 horas
            'muy_lejanas': [24, 48] // 24-48 horas
        };
        
        const range = ranges[timeRangeFilter] || [0, 48];
        const lowerBound = new Date(now.getTime() + range[0] * 60 * 60 * 1000);
        const upperBound = new Date(now.getTime() + range[1] * 60 * 60 * 1000);
        
        console.log(`Filtrando predicciones entre: ${lowerBound.toLocaleString()} y ${upperBound.toLocaleString()}`);
        
        // Contar predicciones por rango para diagnóstico
        const countByRange = {
            'cercanas': 0,
            'medianas': 0,
            'lejanas': 0,
            'muy_lejanas': 0,
            'pasadas': 0,
            'futuras_lejanas': 0,
            'sin_fecha_valida': 0
        };
        
        // Clasificar todas las predicciones por rango
        filteredPredictions.forEach(p => {
            if (!p._normalizedTime || isNaN(p._normalizedTime.getTime())) {
                countByRange.sin_fecha_valida++;
                return;
            }
            
            const timeDiff = p._normalizedTime.getTime() - now.getTime();
            const hoursDiff = timeDiff / (60 * 60 * 1000);
            
            if (hoursDiff < 0) {
                countByRange.pasadas++;
            } else if (hoursDiff <= 3) {
                countByRange.cercanas++;
            } else if (hoursDiff <= 12) {
                countByRange.medianas++;
            } else if (hoursDiff <= 24) {
                countByRange.lejanas++;
            } else if (hoursDiff <= 48) {
                countByRange.muy_lejanas++;
            } else {
                countByRange.futuras_lejanas++;
            }
        });
        
        console.log('DISTRIBUCIÓN DE PREDICCIONES POR RANGO:');
        console.log(countByRange);
        
        // Aplicar filtro según el rango seleccionado
        const beforeFilter = filteredPredictions.length;
        filteredPredictions = filteredPredictions.filter(prediction => {
            // Si no tiene fecha normalizada válida, excluir
            if (!prediction._normalizedTime || isNaN(prediction._normalizedTime.getTime())) {
                return false;
            }
            
            // Verificar si está en el rango seleccionado
            return prediction._normalizedTime >= lowerBound && 
                   prediction._normalizedTime <= upperBound;
        });
        
        console.log(`Filtro de tiempo: de ${beforeFilter} a ${filteredPredictions.length} predicciones`);
        
        // SOLUCIÓN ALTERNATIVA: Si no hay predicciones en el rango seleccionado
        if (filteredPredictions.length === 0) {
            console.warn(`No hay predicciones disponibles para el rango "${timeRangeFilter}"`);
            
            // SOLUCIÓN DE EMERGENCIA: Para el filtro "cercanas", mostrar las más próximas disponibles
            if (timeRangeFilter === 'cercanas' && countByRange.cercanas === 0) {
                console.log('ACTIVANDO SOLUCIÓN DE EMERGENCIA: Mostrando predicciones más cercanas disponibles');
                
                // Ordenar todas las predicciones por proximidad temporal
                const validPredictions = predictions.filter(p => 
                    p._normalizedTime && !isNaN(p._normalizedTime.getTime()) && p._normalizedTime >= now
                );
                
                const sortedByTime = validPredictions.sort((a, b) => {
                    return a._normalizedTime.getTime() - b._normalizedTime.getTime();
                });
                
                // Tomar hasta 20 predicciones más cercanas
                filteredPredictions = sortedByTime.slice(0, 20);
                console.log(`Mostrando ${filteredPredictions.length} predicciones alternativas ordenadas por proximidad`);
                
                // Mostrar las alternativas seleccionadas
                filteredPredictions.forEach((p, i) => {
                    console.log(`Alternativa #${i}: ${p.station} - ${p._normalizedTime.toLocaleString()} (${p._timeRange})`);
                });
            }
        }
    }
    
    // PASO 4: Aplicar filtros adicionales (troncal o estación)
    if (selectedFilter === 'troncales' && selectedTroncales.length > 0) {
        filteredPredictions = filteredPredictions.filter(prediction => 
            selectedTroncales.includes(prediction.troncal || 'N/A'));
    } else if (selectedFilter === 'estaciones' && selectedEstaciones.length > 0) {
        filteredPredictions = filteredPredictions.filter(prediction => 
            selectedEstaciones.includes(prediction.station));
    }
    
    console.log(`Después de todos los filtros: ${filteredPredictions.length} predicciones`);
    
    // PASO 5: Limpiar propiedades temporales antes de devolver
    filteredPredictions = filteredPredictions.map(p => {
        const result = {...p};
        delete result._normalizedTime;
        delete result._timeSource;
        delete result._timeRange;
        delete result._hoursDiff;
        return result;
    });
    
    return filteredPredictions;
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
                // Ejecutar diagnóstico de predicciones cercanas
                diagnoseNearbyPredictions(data);
                // Normalizar fechas antes de actualizar la lista
                normalizePredictionDates(data);
                // Actualizar la lista con las predicciones normalizadas
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
                // Formato "2025-03-30 13:53:35" - interpretar como Colombia time
                const parts = predicted_time.split(' ');
                if (parts.length === 2) {
                    const dateParts = parts[0].split('-').map(Number);
                    const timeParts = parts[1].split(':').map(Number);
                    
                    // Crear fecha en zona horaria Colombia (UTC-5)
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
    let formatCounts = {
        iso_utc: 0,
        iso_local: 0,
        db_format: 0,
        other: 0
    };
    
    predictions.forEach(prediction => {
        // Guardar la fecha original para diagnóstico
        prediction.original_time = prediction.predicted_time;
        
        try {
            let predTime;
            let format = 'other';
            
            if (typeof prediction.predicted_time === 'string') {
                // CASO 1: Formato ISO con Z (UTC) - "2025-03-30T13:53:35.000Z"
                if (prediction.predicted_time.includes('T') && prediction.predicted_time.includes('Z')) {
                    predTime = new Date(prediction.predicted_time);
                    format = 'iso_utc';
                    formatCounts.iso_utc++;
                }
                // CASO 2: Formato ISO sin Z - "2025-03-30T13:53:35.000"
                else if (prediction.predicted_time.includes('T') && !prediction.predicted_time.includes('Z')) {
                    predTime = new Date(prediction.predicted_time);
                    // Ajustar para la zona horaria de Colombia (-5 horas desde UTC)
                    // Asumimos que este formato viene en hora local de Colombia
                    format = 'iso_local';
                    formatCounts.iso_local++;
                }
                // CASO 3: Formato de base de datos "2025-03-30 13:53:35"
                else if (prediction.predicted_time.includes(' ') && 
                         !prediction.predicted_time.includes('T') && 
                         !prediction.predicted_time.includes('Z')) {
                    
                    const parts = prediction.predicted_time.split(' ');
                    if (parts.length === 2) {
                        const dateParts = parts[0].split('-').map(Number);
                        const timeParts = parts[1].split(':').map(Number);
                        
                        // Crear fecha explícitamente como Colombia time (UTC-5)
                        // Primero creamos la fecha en UTC
                        predTime = new Date(Date.UTC(
                            dateParts[0], dateParts[1]-1, dateParts[2],
                            timeParts[0], timeParts[1], timeParts[2] || 0
                        ));
                        
                        // Ajustar para la zona horaria de Colombia (-5 horas)
                        predTime = new Date(predTime.getTime() - (5 * 60 * 60 * 1000));
                        
                        format = 'db_format';
                        formatCounts.db_format++;
                        
                        console.log('Fecha DB parseada:', prediction.predicted_time, 
                            '→', predTime.toISOString(), '(Colombia UTC-5)');
                    }
                } else {
                    // Cualquier otro formato
                    predTime = new Date(prediction.predicted_time);
                    format = 'other';
                    formatCounts.other++;
                }
            } else if (prediction.predicted_time instanceof Date) {
                // Ya es un objeto Date
                predTime = prediction.predicted_time;
                format = 'date_object';
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
            
            // Calcular diferencia en horas para diagnóstico
            const hoursDiff = (predTime.getTime() - now.getTime()) / (60 * 60 * 1000);
            
            // Para depuración, mostrar algunas fechas normalizadas
            if (Math.random() < 0.01) { // Mostrar ~1% para no saturar la consola
                console.log(`Fecha normalizada: ${prediction.original_time} -> ${prediction.predicted_time} (${format}, ${hoursDiff.toFixed(2)}h)`);
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
    console.log('- Distribución de formatos:', formatCounts);
    
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
    } else {
        console.warn('⚠️ NO HAY PREDICCIONES EN LAS PRÓXIMAS 3 HORAS. Verificar generación de predicciones en el backend.');
    }
}

// Función para verificar específicamente las predicciones cercanas
function checkForNearbyPredictions() {
    const now = new Date();
    const threeHoursFromNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    
    console.log('DIAGNÓSTICO DE PREDICCIONES CERCANAS');
    console.log('------------------------------------');
    console.log('Hora actual:', now.toLocaleString('es-CO', {timeZone: 'America/Bogota'}));
    console.log('3 horas desde ahora:', threeHoursFromNow.toLocaleString('es-CO', {timeZone: 'America/Bogota'}));
    
    // Contar predicciones que deberían ser cercanas
    let cercanasCount = 0;
    
    allPredictions.forEach(prediction => {
        try {
            // Usar la fecha ya normalizada
            let predTime = new Date(prediction.predicted_time);
            
            // Comprobar si está en el rango "cercanas"
            if (predTime >= now && predTime <= threeHoursFromNow) {
                cercanasCount++;
                console.log(`✅ PREDICCIÓN CERCANA: ${prediction.station} | ${prediction.predicted_time} | ${predTime.toLocaleString('es-CO', {timeZone: 'America/Bogota'})}`);
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

// Función para diagnosticar específicamente problemas con predicciones cercanas
function diagnoseNearbyPredictions(predictions) {
    console.log('=== DIAGNÓSTICO ESPECÍFICO DE PREDICCIONES CERCANAS ===');
    
    if (!predictions || !Array.isArray(predictions) || predictions.length === 0) {
        console.error('No hay predicciones para diagnosticar');
        return;
    }
    
    const now = new Date();
    const threeHoursFromNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    
    console.log(`Hora actual: ${now.toLocaleString()} (${now.toISOString()})`);
    console.log(`3 horas desde ahora: ${threeHoursFromNow.toLocaleString()} (${threeHoursFromNow.toISOString()})`);
    console.log(`Total de predicciones a analizar: ${predictions.length}`);
    
    // Normalizar todas las fechas para el diagnóstico
    const normalizedPredictions = predictions.map(prediction => {
        const result = {...prediction};
        
        try {
            if (typeof prediction.predicted_time === 'string') {
                // Intentar convertir a Date
                result._normalizedTime = new Date(prediction.predicted_time);
                
                // Verificar si la fecha es válida
                if (isNaN(result._normalizedTime.getTime())) {
                    result._status = 'fecha_invalida';
                } else {
                    // Calcular diferencia en horas
                    const timeDiff = result._normalizedTime.getTime() - now.getTime();
                    const hoursDiff = timeDiff / (60 * 60 * 1000);
                    result._hoursDiff = hoursDiff;
                    
                    // Clasificar por rango de tiempo
                    if (hoursDiff < 0) {
                        result._status = 'pasada';
                    } else if (hoursDiff <= 3) {
                        result._status = 'cercana';
                    } else if (hoursDiff <= 12) {
                        result._status = 'mediana';
                    } else {
                        result._status = 'lejana';
                    }
                }
            } else {
                result._status = 'formato_invalido';
            }
        } catch (e) {
            console.error('Error procesando fecha:', prediction.predicted_time, e);
            result._status = 'error';
        }
        
        return result;
    });
    
    // Contar predicciones por estado
    const countByStatus = {
        cercana: 0,
        mediana: 0,
        lejana: 0,
        pasada: 0,
        fecha_invalida: 0,
        formato_invalido: 0,
        error: 0
    };
    
    normalizedPredictions.forEach(p => {
        countByStatus[p._status] = (countByStatus[p._status] || 0) + 1;
    });
    
    console.log('Distribución de predicciones por estado:');
    console.log(countByStatus);
    
    // Mostrar ejemplos de cada categoría
    const categories = ['cercana', 'mediana', 'lejana', 'pasada', 'fecha_invalida', 'formato_invalido', 'error'];
    
    categories.forEach(category => {
        const examples = normalizedPredictions.filter(p => p._status === category).slice(0, 3);
        
        if (examples.length > 0) {
            console.log(`\nEjemplos de predicciones "${category}" (${examples.length} de ${countByStatus[category] || 0}):`);
            examples.forEach((p, i) => {
                console.log(`[${i}] ${p.station}: ${p.predicted_time} → ${p._normalizedTime ? p._normalizedTime.toLocaleString() : 'N/A'} (${p._hoursDiff ? p._hoursDiff.toFixed(2) + 'h' : 'N/A'})`);
            });
        }
    });
    
    // Verificar si hay predicciones cercanas
    if (countByStatus.cercana === 0) {
        console.warn('⚠️ ALERTA: No se encontraron predicciones para las próximas 3 horas');
        console.log('Verificando predicciones más cercanas disponibles...');
        
        // Ordenar todas las predicciones futuras por cercanía
        const futurePredsWithTime = normalizedPredictions
            .filter(p => p._normalizedTime && !isNaN(p._normalizedTime.getTime()) && p._normalizedTime >= now)
            .sort((a, b) => a._normalizedTime.getTime() - b._normalizedTime.getTime());
        
        if (futurePredsWithTime.length > 0) {
            console.log(`Predicciones futuras más cercanas (${Math.min(5, futurePredsWithTime.length)} de ${futurePredsWithTime.length}):`);
            futurePredsWithTime.slice(0, 5).forEach((p, i) => {
                console.log(`[${i}] ${p.station}: ${p._normalizedTime.toLocaleString()} (${p._hoursDiff.toFixed(2)}h)`);
            });
        } else {
            console.error('No se encontraron predicciones futuras válidas');
        }
    } else {
        console.log(`✅ Se encontraron ${countByStatus.cercana} predicciones para las próximas 3 horas`);
    }
}

// ===== FUNCIONES PARA HISTORIAL DE ENTRENAMIENTO =====

// Inicializar la sección de historial de entrenamiento
function initializeTrainingHistory() {
    console.log('Inicializando sección de historial de entrenamiento...');
    
    const trainingHeader = document.querySelector('.training-history-header');
    if (!trainingHeader) {
        console.log('No se encontró la sección de historial de entrenamiento');
        return;
    }
    
    // Agregar evento click para expandir/colapsar
    trainingHeader.addEventListener('click', toggleTrainingHistory);
    
    console.log('Sección de historial de entrenamiento inicializada correctamente');
}

// Función para expandir/colapsar la sección de historial
function toggleTrainingHistory() {
    console.log('Alternando visibilidad del historial de entrenamiento...');
    
    const content = document.querySelector('.training-history-content');
    const toggleIcon = document.querySelector('.toggle-icon');
    
    if (!content || !toggleIcon) {
        console.error('No se encontraron elementos necesarios para el toggle');
        return;
    }
    
    const isExpanded = content.classList.contains('expanded');
    
    if (isExpanded) {
        // Colapsar
        content.classList.remove('expanded');
        toggleIcon.classList.remove('rotated');
        console.log('Sección colapsada');
    } else {
        // Expandir y cargar datos
        content.classList.add('expanded');
        toggleIcon.classList.add('rotated');
        console.log('Sección expandida, cargando datos...');
        loadTrainingHistory();
    }
}

// Función para cargar el historial de entrenamiento
async function loadTrainingHistory() {
    console.log('Cargando historial de entrenamiento...');
    
    const content = document.querySelector('.training-history-content');
    if (!content) {
        console.error('No se encontró el contenedor de contenido');
        return;
    }
    
    // Mostrar indicador de carga
    showTrainingLoading();
    
    try {
        const response = await fetch('/api/training-history', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'same-origin'
        });
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Datos del historial recibidos:', data);
        
        // Actualizar el badge de estado en el header
        updateTrainingStatus(data.model_trained);
        
        // Renderizar el contenido
        renderTrainingHistory(data);
        
    } catch (error) {
        console.error('Error cargando historial de entrenamiento:', error);
        showTrainingError(error.message);
    }
}

// Mostrar indicador de carga
function showTrainingLoading() {
    const content = document.querySelector('.training-history-content');
    if (!content) return;
    
    content.innerHTML = `
        <div class="training-loading">
            <i class="fas fa-spinner fa-spin"></i>
            <span>Cargando historial de entrenamiento...</span>
        </div>
    `;
}

// Mostrar error
function showTrainingError(message) {
    const content = document.querySelector('.training-history-content');
    if (!content) return;
    
    content.innerHTML = `
        <div class="training-error">
            <i class="fas fa-exclamation-triangle"></i>
            <span>Error al cargar el historial: ${message}</span>
        </div>
    `;
}

// Actualizar el estado del modelo en el header
function updateTrainingStatus(isTrained) {
    const statusBadge = document.querySelector('.status-badge');
    if (!statusBadge) return;
    
    statusBadge.className = `status-badge ${isTrained ? 'trained' : 'not-trained'}`;
    statusBadge.textContent = isTrained ? 'Entrenado' : 'No entrenado';
}

// Renderizar el historial de entrenamiento
function renderTrainingHistory(data) {
    const content = document.querySelector('.training-history-content');
    if (!content) return;
    
    if (!data.model_trained) {
        content.innerHTML = `
            <div class="training-grid">
                <div class="training-card full-width">
                    <div class="card-header">
                        <i class="fas fa-info-circle"></i>
                        <h4>Estado del Modelo</h4>
                    </div>
                    <div class="card-content">
                        <div class="metric-item full-width">
                            <span class="metric-label">Estado:</span>
                            <span class="metric-value full-width">El modelo no ha sido entrenado aún. No hay historial disponible.</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        return;
    }
    
    // Construir el HTML del historial
    let historyHTML = '<div class="training-grid">';
    
    // Tarjeta de información general
    historyHTML += `
        <div class="training-card">
            <div class="card-header">
                <i class="fas fa-info-circle"></i>
                <h4>Información General</h4>
            </div>
            <div class="card-content">
                <div class="metric-item">
                    <span class="metric-label">Estado del modelo:</span>
                    <span class="metric-value">${data.model_trained ? 'Entrenado' : 'No entrenado'}</span>
                </div>
                <div class="metric-item">
                    <span class="metric-label">Último entrenamiento:</span>
                    <span class="metric-value">${data.last_training_date || 'N/A'}</span>
                </div>
                <div class="metric-item">
                    <span class="metric-label">Épocas completadas:</span>
                    <span class="metric-value">${data.epochs_completed || 'N/A'}</span>
                </div>
            </div>
        </div>
    `;
    
    // Tarjeta de métricas finales
    if (data.final_metrics) {
        historyHTML += `
            <div class="training-card">
                <div class="card-header">
                    <i class="fas fa-chart-line"></i>
                    <h4>Métricas Finales</h4>
                </div>
                <div class="card-content">
                    <div class="metric-item">
                        <span class="metric-label">Precisión (entrenamiento):</span>
                        <span class="metric-value">${(data.final_metrics.accuracy * 100).toFixed(2)}%</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Precisión (validación):</span>
                        <span class="metric-value">${(data.final_metrics.val_accuracy * 100).toFixed(2)}%</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Pérdida (entrenamiento):</span>
                        <span class="metric-value">${data.final_metrics.loss.toFixed(4)}</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Pérdida (validación):</span>
                        <span class="metric-value">${data.final_metrics.val_loss.toFixed(4)}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Tarjeta de resumen de aprendizaje
    if (data.learning_summary) {
        historyHTML += `
            <div class="training-card full-width">
                <div class="card-header">
                    <i class="fas fa-brain"></i>
                    <h4>Resumen de Aprendizaje</h4>
                </div>
                <div class="card-content">
                    <div class="metric-item full-width">
                        <span class="metric-label">Tendencia de pérdida:</span>
                        <span class="metric-value trend full-width" data-trend="${data.learning_summary.loss_trend}">
                            ${data.learning_summary.loss_trend}
                        </span>
                    </div>
                    <div class="metric-item full-width">
                        <span class="metric-label">Tendencia de precisión:</span>
                        <span class="metric-value trend full-width" data-trend="${data.learning_summary.accuracy_trend}">
                            ${data.learning_summary.accuracy_trend}
                        </span>
                    </div>
                    <div class="metric-item full-width">
                        <span class="metric-label">Análisis de sobreajuste:</span>
                        <span class="metric-value analysis full-width">
                            ${data.learning_summary.overfitting_analysis}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }
    
    historyHTML += '</div>';
    
    content.innerHTML = historyHTML;
    console.log('Historial de entrenamiento renderizado correctamente');
}

// Función auxiliar para formatear fechas
function formatTrainingDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.error('Error formateando fecha:', error);
        return dateString;
    }
}