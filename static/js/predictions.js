// Importar la función de compatibilidad
async function checkNotificationCompatibility() {
    // Verificar soporte básico de notificaciones
    if (!('Notification' in window)) {
        return {
            supported: false,
            reason: 'Este navegador no soporta notificaciones'
        };
    }

    // Verificar soporte de Service Workers
    if (!('serviceWorker' in navigator)) {
        return {
            supported: false,
            reason: 'Este navegador no soporta Service Workers, necesarios para las notificaciones'
        };
    }

    // Verificar si es un dispositivo móvil
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

        // En iOS, verificar soporte de PushManager antes de rechazar
        if (isIOS && !('PushManager' in window)) {
            return {
                supported: false,
                reason: 'Tu dispositivo iOS no soporta notificaciones push. Para recibir notificaciones, usa la aplicación desde un navegador compatible o desde un computador.'
            };
        }

        // En Android, verificar si estamos en Chrome
        const isAndroid = /Android/.test(navigator.userAgent);
        const isChrome = /Chrome/.test(navigator.userAgent);
        if (isAndroid && !isChrome) {
            return {
                supported: false,
                reason: 'Para recibir notificaciones en Android, por favor usa Chrome'
            };
        }
    }

    return {
        supported: true
    };
}

// Función para inicializar notificaciones
async function initializeNotifications() {
    const notificationToggle = document.getElementById('notificationToggle');

    // Verificar compatibilidad primero
    const compatibility = await checkNotificationCompatibility();
    if (!compatibility.supported) {
        if (notificationToggle) {
            notificationToggle.checked = false;
            notificationToggle.disabled = true;
            notificationToggle.parentElement.title = compatibility.reason;
        }
        return;
    }

    // Si las notificaciones ya están habilitadas, activar el toggle
    if (Notification.permission === 'granted') {
        if (notificationToggle) {
            notificationToggle.checked = true;
        }
    }

    // Configurar el evento change del toggle
    if (notificationToggle) {
        notificationToggle.addEventListener('change', async function() {
            try {
                if (this.checked) {
                    // Registrar Service Worker si no está registrado
                    if (!('serviceWorker' in navigator)) {
                        throw new Error('Service Worker no soportado');
                    }

                    const registration = await navigator.serviceWorker.ready;

                    // Solicitar permiso de notificaciones
                    const permission = await Notification.requestPermission();
                    if (permission === 'granted') {
                        try {
                            // Intentar suscribir a notificaciones push
                            const subscription = await registration.pushManager.subscribe({
                                userVisibleOnly: true,
                                applicationServerKey: await (await fetch('/api/vapid-public-key')).text()
                            });

                            // Enviar suscripción al servidor
                            const response = await fetch('/push/subscribe', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify(subscription)
                            });

                            if (!response.ok) {
                                throw new Error('Error al registrar la suscripción');
                            }

                            // Emitir evento de suscripción
                            socket.emit('subscribe_notifications', {
                                userId: getUserId(),
                                filter: {
                                    type: selectedFilter,
                                    troncales: selectedTroncales,
                                    estaciones: selectedEstaciones
                                }
                            });

                            // Mostrar notificación de prueba si es posible
                            if (!(/iPad|iPhone|iPod/.test(navigator.userAgent)) || ('PushManager' in window)) {
                                new Notification('Alertas Activadas', {
                                    body: 'Recibirás alertas de predicciones según tus preferencias',
                                    icon: '/static/icons/notification-icon.png'
                                });
                            }
                        } catch (error) {
                            console.error('Error al suscribir notificaciones push:', error);
                            this.checked = false;
                            throw new Error('Error al configurar notificaciones push');
                        }
                    } else {
                        this.checked = false;
                        throw new Error('Permiso de notificaciones denegado');
                    }
                } else {
                    // Desuscribirse de notificaciones
                    socket.emit('unsubscribe_notifications', { userId: getUserId() });
                }
            } catch (error) {
                console.error('Error:', error);
                this.checked = false;
                alert(error.message || 'Error al configurar las notificaciones');
            }
        });
    }
}

// Establecer conexión con Socket.IO
let socket = io();
let notificationPermission = localStorage.getItem('notificationPermission') === 'true';
let selectedFilter = 'all';
let selectedTroncales = [];
let selectedEstaciones = [];
let stationsData = []; // Almacenar datos de estaciones

document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando página de predicciones...');
    initializeFilters();
    initializeNotifications();  // Inicializar notificaciones
    loadAndCheckPredictions();
    setInterval(loadAndCheckPredictions, 60000); // Actualizar cada minuto
});

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

// Función para cargar y verificar predicciones
function loadAndCheckPredictions() {
    console.log('Cargando predicciones...');
    const predictionsList = document.getElementById('predictionsList');
    predictionsList.innerHTML = '<div class="loading-message">Cargando predicciones...</div>';

    fetch('/api/predictions')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Predicciones recibidas:', data);
            predictionsList.innerHTML = '';

            if (!Array.isArray(data)) {
                throw new Error('Formato de datos inválido');
            }

            const filteredPredictions = filterPredictions(data);

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

                // Verificar si es momento de notificar (1 hora antes)
                checkAndNotify(prediction);
            });
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

// Función para verificar y enviar notificación si es necesario
function checkAndNotify(prediction) {
    if (!notificationPermission) return;

    const now = new Date();
    const predTime = new Date(prediction.predicted_time);
    const diffMinutes = Math.floor((predTime - now) / (1000 * 60));

    // Notificar cuando falte aproximadamente una hora (entre 59 y 61 minutos)
    if (diffMinutes >= 59 && diffMinutes <= 61) {
        const riskInfo = getRiskInfo(prediction.risk_score);
        const notification = new Notification('Alerta de Seguridad', {
            body: `Posible ${prediction.incident_type} en ${prediction.station}\nNivel de riesgo: ${(prediction.risk_score * 100).toFixed(1)}% (${riskInfo.label})\nEn aproximadamente 1 hora`,
            icon: '/static/icons/notification-icon.png',
            badge: '/static/icons/badge-icon.png',
            vibrate: [200, 100, 200]
        });

        notification.onclick = function() {
            window.focus();
            this.close();
        };
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