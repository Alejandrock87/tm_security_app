// Variables globales
let notificationsEnabled = false;
let notificationCount = 0;
let selectedTroncales = [];
let selectedEstaciones = [];
let stationsData = []; // Almacenar datos de estaciones

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Cargar datos iniciales y configurar listeners
        await Promise.all([
            loadStations(),
            loadPreferences()
        ]);

        setupFilterEventListeners();

        // Aplicar filtros iniciales basados en preferencias guardadas
        applyNotificationFilters();
        updateFilterVisuals();

        // Agregar manejadores de eventos para los acordeones al cargar el documento
        setupAccordionHandlers();

    } catch (error) {
        console.error('Error en inicialización:', error);
        showToast("Error al inicializar la página", "error");
    }
});

// Función para actualizar el estado visual de los botones
function updateButtonStates(notificationsEnabled) {
    const activateBtn = document.getElementById('activateNotifications');
    const saveBtn = document.getElementById('savePreferences');
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    if (!activateBtn || !saveBtn) {
        console.error('No se encontraron los botones necesarios');
        return;
    }

    if (isIOS) {
        // En iOS solo usamos notificaciones in-app
        if (notificationsEnabled) {
            activateBtn.textContent = 'Notificaciones In-App Activadas';
            activateBtn.classList.remove('btn-primary', 'btn-danger');
            activateBtn.classList.add('btn-success');
            saveBtn.disabled = false;
        } else {
            activateBtn.textContent = 'Activar Notificaciones';
            activateBtn.classList.remove('btn-success', 'btn-danger');
            activateBtn.classList.add('btn-primary');
            saveBtn.disabled = true;
        }
    } else {
        // Para otros dispositivos, verificar API de notificaciones
        if ('Notification' in window && Notification.permission === 'denied') {
            activateBtn.textContent = 'Notificaciones Bloqueadas';
            activateBtn.classList.remove('btn-primary', 'btn-success');
            activateBtn.classList.add('btn-danger');
            saveBtn.disabled = true;
            showToast('Notificaciones bloqueadas. Revisa la configuración del navegador', 'warning');
        } else if (notificationsEnabled) {
            activateBtn.textContent = 'Notificaciones Activadas';
            activateBtn.classList.remove('btn-primary', 'btn-danger');
            activateBtn.classList.add('btn-success');
            saveBtn.disabled = false;
        } else {
            activateBtn.textContent = 'Activar Notificaciones';
            activateBtn.classList.remove('btn-success', 'btn-danger');
            activateBtn.classList.add('btn-primary');
            saveBtn.disabled = true;
        }
    }
}

// Función para mostrar mensajes toast
function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    // Asegurar que el contenedor existe
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        document.body.appendChild(toastContainer);
    }

    toastContainer.appendChild(toast);

    // Forzar reflow para asegurar la animación
    toast.offsetHeight;

    // Añadir clase para mostrar con animación
    toast.classList.add('show');

    // Remover después de 3 segundos
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Implement the missing loadStations function
async function loadStations() {
    try {
        const response = await fetch('/api/stations');
        if (!response.ok) {
            throw new Error('Error al obtener las estaciones');
        }
        const stations = await response.json();
        console.log('Datos de estaciones recibidos:', stations);
        stationsData = stations; // Store stations data

        // Extraer Troncales únicas
        const troncales = [...new Set(stations.map(station => station.troncal))]
            .filter(troncal => troncal && troncal !== 'N/A')
            .sort();
        console.log('Troncales extraídas:', troncales);

        // Extraer Estaciones únicas
        const estaciones = [...new Set(stations.map(station => station.nombre))]
            .filter(nombre => nombre && nombre.trim() !== '')
            .sort();
        console.log('Estaciones extraídas:', estaciones);

        // Poblar los selectores
        populateCheckboxGroup('troncalPreference', troncales, ['all']);
        populateCheckboxGroup('stationPreference', estaciones, ['all']);

    } catch (error) {
        console.error('Error loading stations:', error);
        showToast('Error al cargar las estaciones', 'error');
    }
}

// Función para cargar preferencias guardadas
async function loadPreferences() {
    try {
        let settings;
        try {
            const stored = localStorage.getItem('notificationPreferences');
            settings = stored ? JSON.parse(stored) : {
                troncal: [],
                station: [],
                incidentType: [],
                enabled: false
            };
        } catch (error) {
            console.error('Error al leer preferencias:', error);
            settings = {
                troncal: [],
                station: [],
                incidentType: [],
                enabled: false
            };
        }

        const stations = await fetch('/api/stations')
            .then(r => r.ok ? r.json() : Promise.reject('Error al obtener estaciones'))
            .catch(error => {
                console.error('Error fetching stations:', error);
                showToast('Error al cargar las estaciones', 'error');
                return [];
            });

        // Extraer troncales y estaciones únicas
        const troncales = [...new Set(stations.map(station => station.troncal))]
            .filter(troncal => troncal && troncal !== 'N/A')
            .sort();

        const estaciones = [...new Set(stations.map(station => station.nombre))]
            .filter(nombre => nombre && nombre.trim() !== '')
            .sort();

        // Actualizar variables globales con las preferencias guardadas
        selectedTroncales = settings.troncal || [];
        selectedEstaciones = settings.station || [];
        notificationsEnabled = settings.enabled || false;

        // Poblar los grupos de checkboxes
        populateCheckboxGroup('troncalPreference', troncales, selectedTroncales);
        updateEstacionesCheckboxes(stations);
        setIncidentTypePreferences(settings.incidentType || []);

        // Actualizar estados de "Seleccionar todo"
        updateSelectAllState('troncalPreference');
        updateSelectAllState('stationPreference');
        updateSelectAllState('typePreference');

        // Actualizar estado de los botones
        updateButtonStates(notificationsEnabled);

    } catch (error) {
        console.error('Error loading preferences:', error);
        showToast('Error al cargar las preferencias', 'error');
        // Aún con error, intentamos inicializar la UI con valores por defecto
        updateButtonStates(false);
    }
}

// Función para poblar un grupo de checkboxes
function populateCheckboxGroup(groupId, items, selectedItems) {
    const group = document.getElementById(groupId);
    if (!group) return;
    group.innerHTML = '';
    items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'form-check';
        const itemId = `${groupId}-${sanitizeId(item)}`;
        const isChecked = selectedItems.includes('all') || selectedItems.includes(item);
        itemDiv.innerHTML = `
            <input class="form-check-input" type="checkbox" value="${item}" id="${itemId}" ${isChecked ? 'checked' : ''}>
            <label class="form-check-label" for="${itemId}">${item}</label>
        `;
        group.appendChild(itemDiv);
    });

    // Configurar eventos para los checkboxes
    const checkboxes = group.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            if (groupId === 'troncalPreference') {
                selectedTroncales = getSelectedValues(groupId);
                updateEstacionesCheckboxes(stationsData);
            } else if (groupId === 'stationPreference') {
                selectedEstaciones = getSelectedValues(groupId);
            }
            updateSelectAllState(groupId);
        });
    });
}

// Función para establecer las preferencias de Tipos de Incidente
function setIncidentTypePreferences(selectedTypes) {
    const typeCheckboxes = document.querySelectorAll('#typePreference .form-check-input');
    typeCheckboxes.forEach(cb => {
        cb.checked = selectedTypes.includes('all') || selectedTypes.includes(cb.value);
    });
}

// Función para actualizar estaciones basada en troncales seleccionadas
function updateEstacionesCheckboxes(data) {
    const estacionesCheckboxes = document.getElementById('stationPreference');
    const selectAllEstaciones = document.getElementById('selectAllEstaciones');
    estacionesCheckboxes.innerHTML = '';

    // Filtrar estaciones según las troncales seleccionadas
    const filteredStations = selectedTroncales.length > 0 ?
        data.filter(station => selectedTroncales.includes(station.troncal)) :
        data;

    if (filteredStations.length === 0) {
        selectAllEstaciones.disabled = true;
        selectAllEstaciones.checked = false;
        const mensaje = document.createElement('div');
        mensaje.className = 'no-stations-message';
        mensaje.textContent = 'No hay estaciones disponibles para las troncales seleccionadas';
        estacionesCheckboxes.appendChild(mensaje);
        return;
    }

    selectAllEstaciones.disabled = false;

    // Obtener las estaciones previamente seleccionadas
    const settings = getNotificationSettings();
    const savedStations = settings.station || [];

    filteredStations.forEach(station => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'form-check';
        const itemId = `stationPreference-${sanitizeId(station.nombre)}`;
        const isChecked = savedStations.includes(station.nombre);

        itemDiv.innerHTML = `
            <input class="form-check-input" type="checkbox" value="${station.nombre}" 
                   id="${itemId}" ${isChecked ? 'checked' : ''}>
            <label class="form-check-label" for="${itemId}">${station.nombre}</label>
        `;
        estacionesCheckboxes.appendChild(itemDiv);
    });

    // Actualizar estado del checkbox "Seleccionar todo"
    const allChecked = document.querySelectorAll('#stationPreference .form-check-input:checked').length ===
        document.querySelectorAll('#stationPreference .form-check-input').length;
    selectAllEstaciones.checked = allChecked;
}

// Función para obtener valores seleccionados de un grupo
function getSelectedValues(groupId) {
    const checkboxes = document.querySelectorAll(`#${groupId} .form-check-input:checked`);
    return Array.from(checkboxes).map(cb => cb.value);
}

// Función para actualizar estado de "Seleccionar todo"
function updateSelectAllState(groupId) {
    const selectAllId = groupId === 'troncalPreference' ? 'selectAllTroncales' :
        groupId === 'stationPreference' ? 'selectAllEstaciones' : 'selectAllTypes';
    const selectAll = document.getElementById(selectAllId);

    if (selectAll) {
        const checkboxes = document.querySelectorAll(`#${groupId} .form-check-input:not([disabled])`);
        const checkedBoxes = document.querySelectorAll(`#${groupId} .form-check-input:checked:not([disabled])`);
        selectAll.checked = checkboxes.length > 0 && checkboxes.length === checkedBoxes.length;
    }
}

// Función para solicitar permisos de notificación
async function requestNotificationPermission() {
    const activateBtn = document.getElementById('activateNotifications');
    const originalText = activateBtn.textContent;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    try {
        activateBtn.textContent = 'Activando notificaciones...';
        activateBtn.disabled = true;

        // En iOS, las notificaciones push no están soportadas en Safari
        if (isIOS) {
            // Activar solo notificaciones in-app para iOS
            notificationsEnabled = true;
            updateButtonStates(true);
            showToast('Notificaciones in-app activadas', 'success');

            // Mostrar mensaje específico para iOS
            showInAppNotification({
                incident_type: 'Sistema',
                nearest_station: 'General',
                description: 'Las notificaciones in-app están activadas. Recibirás alertas dentro de la aplicación.',
                timestamp: new Date()
            });
        } else {
            // Para otros dispositivos, intentar notificaciones push
            if ('Notification' in window) {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    notificationsEnabled = true;
                    updateButtonStates(true);
                    showToast('Notificaciones activadas correctamente', 'success');

                    showInAppNotification({
                        incident_type: 'Sistema',
                        nearest_station: 'General',
                        description: 'Las notificaciones están activadas. Recibirás alertas de incidentes según tus preferencias.',
                        timestamp: new Date()
                    });
                } else {
                    throw new Error('Permiso de notificaciones denegado');
                }
            } else {
                throw new Error('Tu navegador no soporta notificaciones');
            }
        }
    } catch (error) {
        console.error('Error:', error);
        showToast(error.message, 'error');
        updateButtonStates(false);
    } finally {
        activateBtn.disabled = false;
        activateBtn.textContent = notificationsEnabled ?
            (isIOS ? 'Notificaciones In-App Activadas' : 'Notificaciones Activadas') :
            originalText;
    }
}

// Función para guardar preferencias
async function saveNotificationPreferences() {
    const saveBtn = document.getElementById('savePreferences');
    const originalText = saveBtn.textContent;

    try {
        saveBtn.textContent = 'Guardando...';
        saveBtn.disabled = true;

        // Obtener valores actuales
        const preferences = {
            troncal: getSelectedValues('troncalPreference'),
            station: getSelectedValues('stationPreference'),
            incidentType: getSelectedValues('typePreference'),
            enabled: notificationsEnabled
        };

        // Actualizar variables globales
        selectedTroncales = preferences.troncal;
        selectedEstaciones = preferences.station;

        // Guardar en localStorage
        localStorage.setItem('notificationPreferences', JSON.stringify(preferences));

        showToast('Preferencias guardadas correctamente', 'success');
        saveBtn.textContent = '¡Guardado!';
        saveBtn.classList.remove('btn-primary');
        saveBtn.classList.add('btn-success', 'saved');

        // Restaurar estado original del botón después de 2 segundos
        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.classList.remove('btn-success', 'saved');
            saveBtn.classList.add('btn-primary');
            saveBtn.disabled = false;
        }, 2000);

        //Actualizar el historial de notificaciones
        updateNotificationHistory();


    } catch (error) {
        console.error('Error al guardar preferencias:', error);
        showToast('Error al guardar preferencias', 'error');
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
    }
}

// Función para obtener preferencias almacenadas
function getNotificationSettings() {
    try {
        const stored = localStorage.getItem('notificationPreferences');
        if (!stored) {
            return {
                troncal: [],
                station: [],
                incidentType: [],
                enabled: false
            };
        }
        return JSON.parse(stored);
    } catch (error) {
        console.error('Error al leer preferencias:', error);
        return {
            troncal: [],
            station: [],
            incidentType: [],
            enabled: false
        };
    }
}


// Configuración de eventos en los filtros de historial
function setupFilterEventListeners() {
    // Configurar eventos para "Seleccionar todo"
    const selectAllTroncales = document.getElementById('selectAllTroncales');
    const selectAllEstaciones = document.getElementById('selectAllEstaciones');
    const selectAllTypes = document.getElementById('selectAllTypes');

    if (selectAllTroncales) {
        selectAllTroncales.addEventListener('change', async function() {
            const checkboxes = document.querySelectorAll('#troncalPreference .form-check-input');
            const isChecked = this.checked;
            checkboxes.forEach(checkbox => {
                checkbox.checked = isChecked;
            });
            selectedTroncales = isChecked ? Array.from(checkboxes).map(cb => cb.value) : [];
            updateEstacionesCheckboxes(stationsData);
            await saveNotificationPreferences(); // Guardar cambios automáticamente
        });
    }

    if (selectAllEstaciones) {
        selectAllEstaciones.addEventListener('change', async function() {
            const checkboxes = document.querySelectorAll('#stationPreference .form-check-input:not([disabled])');
            const isChecked = this.checked;
            checkboxes.forEach(checkbox => {
                checkbox.checked = isChecked;
            });
            selectedEstaciones = isChecked ? Array.from(checkboxes).map(cb => cb.value) : [];
            await saveNotificationPreferences(); // Guardar cambios automáticamente
        });
    }

    if (selectAllTypes) {
        selectAllTypes.addEventListener('change', async function() {
            const checkboxes = document.querySelectorAll('#typePreference .form-check-input');
            const isChecked = this.checked;
            checkboxes.forEach(checkbox => {
                checkbox.checked = isChecked;
            });
            await saveNotificationPreferences(); // Guardar cambios automáticamente
        });
    }

    // Agregar listeners para cambios individuales
    document.querySelectorAll('.preferences-group .form-check-input').forEach(checkbox => {
        checkbox.addEventListener('change', async function() {
            const group = this.closest('.preferences-group');
            updateSelectAllState(group.id);

            if (group.id === 'troncalPreference') {
                selectedTroncales = getSelectedValues('troncalPreference');
                updateEstacionesCheckboxes(stationsData);
            } else if (group.id === 'stationPreference') {
                selectedEstaciones = getSelectedValues('stationPreference');
            }

            await saveNotificationPreferences(); // Guardar cambios automáticamente
        });
    });

    // Configurar búsqueda de estaciones
    const estacionSearch = document.getElementById('estacionSearch');
    if (estacionSearch) {
        estacionSearch.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const estaciones = document.querySelectorAll('#stationPreference .form-check');

            estaciones.forEach(item => {
                const label = item.querySelector('label').textContent.toLowerCase();
                item.style.display = label.includes(searchTerm) ? '' : 'none';
            });
        });
    }

    // Configurar filtros de historial
    document.querySelectorAll('.notification-filters .filter-chip').forEach(chip => {
        chip.addEventListener('click', function() {
            // Remover clase activa de todos los chips
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));

            // Activar el chip seleccionado
            this.classList.add('active');

            // Actualizar historial con el nuevo filtro
            updateNotificationHistory();
        });
    });

    // Actualizar historial inicial
    updateNotificationHistory();
}



// Función para agregar una nueva notificación al historial
function addNotification(incident) {
    if (!notificationsList) return;
    const notificationElement = document.createElement('div');
    notificationElement.className = 'notification-item';
    const timestamp = new Date(incident.timestamp).toLocaleString();
    notificationElement.innerHTML = `
        <h6>${capitalizeFirstLetter(incident.incident_type)}</h6>
        <p>Estación: ${incident.nearest_station}</p>
        <small>${timestamp}</small>
    `;
    notificationsList.insertBefore(notificationElement, notificationsList.firstChild);
}

// Función para actualizar el contador de notificaciones
function updateNotificationBadge(count) {
    if (notificationBadge) {
        notificationBadge.textContent = count;
        notificationBadge.style.display = count > 0 ? 'inline-block' : 'none';
    }
}

// Función para determinar si una notificación debe mostrarse según las preferencias
function shouldShowNotification(incident) {
    const settings = getNotificationSettings();
    const troncalMatch = settings.troncal.includes('all') || settings.troncal.includes(incident.troncal);
    const stationMatch = settings.station.includes('all') || settings.station.includes(incident.nearest_station);
    const typeMatch = settings.incidentType.includes('all') || settings.incidentType.includes(incident.incident_type);
    return troncalMatch && stationMatch && typeMatch;
}

// Función para mostrar notificaciones in-app
function showInAppNotification(notification) {
    const notificationList = document.getElementById('notifications-list');
    if (notificationList) {
        const notificationItem = document.createElement('div');
        notificationItem.className = 'list-group-item bg-dark text-white border-secondary';

        const timestamp = new Date(notification.timestamp).toLocaleString();
        notificationItem.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div class="notification-content">
                    <strong>${capitalizeFirstLetter(notification.incident_type)}</strong>
                    <p class="mb-1">Estación: ${notification.nearest_station}</p>
                    ${notification.description ? `<p class="mb-0 small">${notification.description}</p>` : ''}
                </div>
                <small class="text-muted">${timestamp}</small>
            </div>
        `;

        // Insertar al principio de la lista
        notificationList.insertBefore(notificationItem, notificationList.firstChild);

        // Actualizar contador
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            const count = parseInt(badge.textContent || '0') + 1;
            badge.textContent = count;
            badge.style.display = 'inline-block';
        }

        // También mostrar un toast
        showToast(`Nuevo incidente en ${notification.nearest_station}`, 'info');
    }
}

// Reemplazar la función anterior de showBrowserNotification
function showBrowserNotification(incident) {
    showInAppNotification(incident);
}


// Función para actualizar el estado visual de los filtros
function updateFilterVisuals() {
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.classList.remove('active');
    });

    const activeFilters = getActiveFilters();
    activeFilters.forEach(filter => {
        const chip = document.querySelector(`.filter-chip[data-filter="${filter}"]`);
        if (chip) chip.classList.add('active');
    });
}

// Función para obtener los filtros activos
function getActiveFilters() {
    const preferences = JSON.parse(localStorage.getItem('notificationPreferences') || '{}');
    const activeFilters = [];

    if (!preferences.troncal && !preferences.station && !preferences.incidentType) {
        return ['all'];
    }

    if (preferences.troncal && preferences.troncal.length > 0) activeFilters.push('troncal');
    if (preferences.station && preferences.station.length > 0) activeFilters.push('station');
    if (preferences.incidentType && preferences.incidentType.length > 0) activeFilters.push('type');

    return activeFilters.length > 0 ? activeFilters : ['all'];
}

// Función para aplicar los filtros activos y cargar las notificaciones correspondientes
function applyNotificationFilters() {
    const preferences = JSON.parse(localStorage.getItem('notificationPreferences') || '{}');
    const activeFilters = getActiveFilters();

    // Construir parámetros de consulta
    const queryParams = new URLSearchParams();

    if (!activeFilters.includes('all')) {
        if (activeFilters.includes('troncal') && preferences.troncal) {
            queryParams.append('troncal', preferences.troncal.join(','));
        }
        if (activeFilters.includes('station') && preferences.station) {
            queryParams.append('station', preferences.station.join(','));
        }
        if (activeFilters.includes('type') && preferences.incidentType) {
            queryParams.append('incident_type', preferences.incidentType.join(','));
        }
    }

    // Cargar notificaciones filtradas
    fetchFilteredNotifications(queryParams);
}

// Función para obtener y mostrar las notificaciones filtradas
async function fetchFilteredNotifications(queryParams) {
    try {
        const response = await fetch(`/api/notifications?${queryParams.toString()}`);
        if (!response.ok) throw new Error('Error al cargar notificaciones');

        const notifications = await response.json();
        updateNotificationsList(notifications);
    } catch (error) {
        console.error('Error al cargar notificaciones:', error);
        showToast('Error al cargar las notificaciones', 'error');
    }
}

// Función para actualizar la lista de notificaciones en el DOM
function updateNotificationsList(notifications) {
    const notificationsList = document.getElementById('notificationList');
    if (!notificationsList) return;

    notificationsList.innerHTML = '';

    if (notifications && notifications.length > 0) {
        notifications.forEach(notification => {
            const item = document.createElement('div');
            item.className = 'notification-item';
            const timestamp = new Date(notification.timestamp).toLocaleString();

            item.innerHTML = `
                <div class="notification-header">
                    <h6 class="incident-type">${capitalizeFirstLetter(notification.incident_type)}</h6>
                    <span class="notification-time">${timestamp}</span>
                </div>
                <p class="station-name">Estación: ${notification.nearest_station}</p>
                ${notification.description ? `<p class="incident-description">${notification.description}</p>` : ''}
            `;

            notificationsList.appendChild(item);
        });
    } else {
        notificationsList.innerHTML = '<p class="no-notifications">No hay notificaciones que coincidan con los filtros seleccionados.</p>';
    }
}


// Función para capitalizar la primera letra de una cadena
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Función para sanitizar IDs (reemplazar espacios y caracteres especiales por guiones bajos)
function sanitizeId(text) {
    return text.replace(/\s+/g, '_').replace(/[^\w\-]/g, '');
}

// Función para determinar si se deben mostrar notificaciones del navegador
function shouldShowBrowserNotifications() {
    return 'Notification' in window && Notification.permission === 'granted';
}

const notificationBadge = document.getElementById('notification-badge');
const notificationsList = document.getElementById('notificationList');

// Helper function para obtener las preferencias seleccionadas
function getSelectedValues(prefGroupId) {
    const checkedBoxes = document.querySelectorAll(`#${prefGroupId} input[type="checkbox"]:checked`);
    return Array.from(checkedBoxes).map(cb => cb.value);
}

// Verificar estado inicial de notificaciones
function checkInitialNotificationState() {
    if ('Notification' in window) {
        notificationsEnabled = Notification.permission === 'granted';
        updateNotificationUI();
    }
}

// Actualizar UI basado en estado de notificaciones
function updateNotificationUI() {
    const activateBtn = document.getElementById('activateNotifications');
    const saveBtn = document.getElementById('savePreferences');
    if (activateBtn) {
        activateBtn.textContent = notificationsEnabled ?
            'Notificaciones Activadas' : 'Activar Notificaciones';
        activateBtn.disabled = notificationsEnabled;
    }
    if (saveBtn) {
        saveBtn.disabled = !notificationsEnabled;
    }
}

// Inicializar Service Worker sin solicitar permisos
async function initializeServiceWorker() {
    try {
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.register('/service-worker.js');
            console.log('Service Worker registrado:', registration);
            checkInitialNotificationState();
            loadPreferences();
            setupFilterEventListeners();
            return registration;
        }
    } catch (error) {
        console.error('Error al registrar Service Worker:', error);
        showToast("Error al inicializar las notificaciones", "error");
    }
}

// Verificar estado actual de notificaciones
function checkNotificationStatus() {
    if ('Notification' in window) {
        notificationsEnabled = Notification.permission === 'granted';
        updateUI();
    }
}

// Actualizar UI basado en el estado
function updateUI() {
    const activateBtn = document.getElementById('activateNotifications');
    const preferencesBtn = document.getElementById('savePreferences');
    if (activateBtn) {
        activateBtn.textContent = notificationsEnabled ?
            'Notificaciones Activadas' : 'Activar Notificaciones';
        activateBtn.disabled = notificationsEnabled;
    }
    if (preferencesBtn) {
        preferencesBtn.disabled = !notificationsEnabled;
    }
}


// Función para registrar el Service Worker
async function registerServiceWorker() {
    try {
        if (!('serviceWorker' in navigator)) {
            throw new Error('Service Worker no soportado');
        }
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        console.log('Service Worker registrado:', registration);
        return registration;
    } catch (error) {
        console.error('Error al registrar Service Worker:', error);
        throw error;
    }
}

// Función para suscribir a notificaciones push
async function subscribeToPushNotifications() {
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: await (await fetch('/api/vapid-public-key')).text()
        });
        const response = await fetch('/push/subscribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(subscription)
        });
        if (!response.ok) {
            throw new Error('Failed to subscribe to push notifications');
        }
        return subscription;
    } catch (error) {
        console.error('Error en suscripción push:', error);
        throw error;
    }
}


// Función para actualizar el historial de notificaciones
async function updateNotificationHistory() {
    try {
        const notificationsList = document.getElementById('notificationList');
        if (!notificationsList) return;

        // Obtener preferencias actuales
        const preferences = getNotificationSettings();
        const showAll = document.querySelector('.show-all-notifications')?.classList.contains('active');
        const activeFilter = document.querySelector('.filter-chip.active')?.dataset.filter || 'all';

        // Construir parámetros de consulta
        const queryParams = new URLSearchParams();

        // Si no estamos mostrando todas las notificaciones
        if (!showAll) {
            if (activeFilter === 'all') {
                // Aplicar todas las preferencias seleccionadas
                if (preferences.troncal?.length) {
                    queryParams.append('troncal', preferences.troncal.join(','));
                }
                if (preferences.station?.length) {
                    queryParams.append('station', preferences.station.join(','));
                }
                if (preferences.incidentType?.length) {
                    queryParams.append('incident_type', preferences.incidentType.join(','));
                }
            } else {
                // Aplicar solo el filtro específico seleccionado
                const filterMap = {
                    'troncal': preferences.troncal,
                    'station': preferences.station,
                    'type': preferences.incidentType
                };

                const paramMap = {
                    'troncal': 'troncal',
                    'station': 'station',
                    'type': 'incident_type'
                };

                if (filterMap[activeFilter]?.length) {
                    queryParams.append(paramMap[activeFilter], filterMap[activeFilter].join(','));
                }
            }
        }

        // Obtener notificaciones
        const response = await fetch(`/api/notifications?${queryParams.toString()}`);
        if (!response.ok) throw new Error('Error al cargar notificaciones');
        const notifications = await response.json();

        // Limpiar y actualizar la lista
        notificationsList.innerHTML = '';

        if (notifications.length === 0) {
            notificationsList.innerHTML = `
                <div class="no-notifications">
                    <p>No hay notificaciones que coincidan con los filtros seleccionados.</p>
                </div>`;
            return;
        }

        // Ordenar por fecha más reciente
        notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Renderizar notificaciones
        notifications.forEach(notification => {
            const item = document.createElement('div');
            item.className = 'notification-item';
            const timestamp = new Date(notification.timestamp).toLocaleString();

            item.innerHTML = `
                <div class="notification-header">
                    <h6 class="incident-type">${capitalizeFirstLetter(notification.incident_type)}</h6>
                    <span class="notification-time">${timestamp}</span>
                </div>
                <p class="station-name">
                    <strong>Estación:</strong> ${notification.nearest_station}
                    <span class="troncal-info">(${notification.troncal})</span>
                </p>
                ${notification.description ?
                    `<p class="incident-description">${notification.description}</p>` : ''}
            `;

            notificationsList.appendChild(item);
        });

    } catch (error) {
        console.error('Error al actualizar historial:', error);
        showToast('Error al cargar el historial de notificaciones', 'error');
    }
}

// Configurar el botón "Mostrar todas"
document.querySelector('.show-all-notifications')?.addEventListener('click', function() {
    this.classList.toggle('active');
    this.innerHTML = this.classList.contains('active')
        ? '<i class="fas fa-filter"></i> Mostrar según preferencias'
        : '<i class="fas fa-filter"></i> Mostrar todas';
    updateNotificationHistory();
});

function setupAccordionHandlers(){
    // Configurar acordeón principal
    const accordionHeader = document.querySelector('.accordion-header');
    if (accordionHeader) {
        accordionHeader.addEventListener('click', function() {
            const target = this.getAttribute('data-target');
            const content = document.querySelector(target);
            if (content) {
                content.classList.toggle('show');
                this.setAttribute('aria-expanded', content.classList.contains('show'));
            }
        });
    }

    // Configurar acordeones de secciones
    document.querySelectorAll('.section-header').forEach(header => {
        header.addEventListener('click', function() {
            const target = this.getAttribute('data-target');
            const content = document.querySelector(target);
            if (content) {
                content.classList.toggle('show');
                this.setAttribute('aria-expanded', content.classList.contains('show'));
            }
        });
    });
}

// Función para verificar si las notificaciones son soportadas
function areNotificationsSupported() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
        return true; // En iOS usamos notificaciones in-app
    }
    return 'Notification' in window;
}

// Función para obtener preferencias almacenadas con manejo de errores mejorado
function getNotificationSettings() {
    try {
        const stored = localStorage.getItem('notificationPreferences');
        if (!stored) {
            return {
                troncal: [],
                station: [],
                incidentType: [],
                enabled: false
            };
        }
        return JSON.parse(stored);
    } catch (error) {
        console.error('Error al leer preferencias:', error);
        return {
            troncal: [],
            station: [],
            incidentType: [],
            enabled: false
        };
    }
}

// Función para determinar si se deben mostrar notificaciones del navegador
function shouldShowBrowserNotifications() {
    return 'Notification' in window && Notification.permission === 'granted';
}

const notificationBadge = document.getElementById('notification-badge');
const notificationsList = document.getElementById('notificationList');

// Helper function para obtener las preferencias seleccionadas
function getSelectedValues(prefGroupId) {
    const checkedBoxes = document.querySelectorAll(`#${prefGroupId} input[type="checkbox"]:checked`);
    return Array.from(checkedBoxes).map(cb => cb.value);
}

// Verificar estado inicial de notificaciones
function checkInitialNotificationState() {
    if ('Notification' in window) {
        notificationsEnabled = Notification.permission === 'granted';
        updateNotificationUI();
    }
}

// Actualizar UI basado en estado de notificaciones
function updateNotificationUI() {
    const activateBtn = document.getElementById('activateNotifications');
    const saveBtn = document.getElementById('savePreferences');
    if (activateBtn) {
        activateBtn.textContent = notificationsEnabled ?
            'Notificaciones Activadas' : 'Activar Notificaciones';
        activateBtn.disabled = notificationsEnabled;
    }
    if (saveBtn) {
        saveBtn.disabled = !notificationsEnabled;
    }
}

// Inicializar Service Worker sin solicitar permisos
async function initializeServiceWorker() {
    try {
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.register('/service-worker.js');
            console.log('Service Worker registrado:', registration);
            checkInitialNotificationState();
            loadPreferences();
            setupFilterEventListeners();
            return registration;
        }
    } catch (error) {
        console.error('Error al registrar Service Worker:', error);
        showToast("Error al inicializar las notificaciones", "error");
    }
}

// Verificar estado actual de notificaciones
function checkNotificationStatus() {
    if ('Notification' in window) {
        notificationsEnabled = Notification.permission === 'granted';
        updateUI();
    }
}

// Actualizar UI basado en el estado
function updateUI() {
    const activateBtn = document.getElementById('activateNotifications');
    const preferencesBtn = document.getElementById('savePreferences');
    if (activateBtn) {
        activateBtn.textContent = notificationsEnabled ?
            'Notificaciones Activadas' : 'Activar Notificaciones';
        activateBtn.disabled = notificationsEnabled;
    }
    if (preferencesBtn) {
        preferencesBtn.disabled = !notificationsEnabled;
    }
}


// Función para registrar el Service Worker
async function registerServiceWorker() {
    try {
        if (!('serviceWorker' in navigator)) {
            throw new Error('Service Worker no soportado');
        }
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        console.log('Service Worker registrado:', registration);
        return registration;
    } catch (error) {
        console.error('Error al registrar Service Worker:', error);
        throw error;
    }
}

// Función para suscribir a notificaciones push
async function subscribeToPushNotifications() {
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: await (await fetch('/api/vapid-public-key')).text()
        });
        const response = await fetch('/push/subscribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(subscription)
        });
        if (!response.ok) {
            throw new Error('Failed to subscribe to push notifications');
        }
        return subscription;
    } catch (error) {
        console.error('Error en suscripción push:', error);
        throw error;
    }
}


// Función para actualizar el historial de notificaciones
async function updateNotificationHistory() {
    try {
        const notificationsList = document.getElementById('notificationList');
        if (!notificationsList) return;

        // Obtener preferencias actuales
        const preferences = getNotificationSettings();
        const showAll = document.querySelector('.show-all-notifications')?.classList.contains('active');
        const activeFilter = document.querySelector('.filter-chip.active')?.dataset.filter || 'all';

        // Construir parámetros de consulta
        const queryParams = new URLSearchParams();

        // Si no estamos mostrando todas las notificaciones
        if (!showAll) {
            if (activeFilter === 'all') {
                // Aplicar todas las preferencias seleccionadas
                if (preferences.troncal?.length) {
                    queryParams.append('troncal', preferences.troncal.join(','));
                }
                if (preferences.station?.length) {
                    queryParams.append('station', preferences.station.join(','));
                }
                if (preferences.incidentType?.length) {
                    queryParams.append('incident_type', preferences.incidentType.join(','));
                }
            } else {
                // Aplicar solo el filtro específico seleccionado
                const filterMap = {
                    'troncal': preferences.troncal,
                    'station': preferences.station,
                    'type': preferences.incidentType
                };

                const paramMap = {
                    'troncal': 'troncal',
                    'station': 'station',
                    'type': 'incident_type'
                };

                if (filterMap[activeFilter]?.length) {
                    queryParams.append(paramMap[activeFilter], filterMap[activeFilter].join(','));
                }
            }
        }

        // Obtener notificaciones
        const response = await fetch(`/api/notifications?${queryParams.toString()}`);
        if (!response.ok) throw new Error('Error al cargar notificaciones');
        const notifications = await response.json();

        // Limpiar y actualizar la lista
        notificationsList.innerHTML = '';

        if (notifications.length === 0) {
            notificationsList.innerHTML = `
                <div class="no-notifications">
                    <p>No hay notificaciones que coincidan con los filtros seleccionados.</p>
                </div>`;
            return;
        }

        // Ordenar por fecha más reciente
        notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Renderizar notificaciones
        notifications.forEach(notification => {
            const item = document.createElement('div');
            item.className = 'notification-item';
            const timestamp = new Date(notification.timestamp).toLocaleString();

            item.innerHTML = `
                <div class="notification-header">
                    <h6 class="incident-type">${capitalizeFirstLetter(notification.incident_type)}</h6>
                    <span class="notification-time">${timestamp}</span>
                </div>
                <p class="station-name">
                    <strong>Estación:</strong> ${notification.nearest_station}
                    <span class="troncal-info">(${notification.troncal})</span>
                </p>
                ${notification.description ?
                    `<p class="incident-description">${notification.description}</p>` : ''}
            `;

            notificationsList.appendChild(item);
        });

    } catch (error) {
        console.error('Error al actualizar historial:', error);
        showToast('Error al cargar el historial de notificaciones', 'error');
    }
}

// Configurar el botón "Mostrar todas"
document.querySelector('.show-all-notifications')?.addEventListener('click', function() {
    this.classList.toggle('active');
    this.innerHTML = this.classList.contains('active')
        ? '<i class="fas fa-filter"></i> Mostrar según preferencias'
        : '<i class="fas fa-filter"></i> Mostrar todas';
    updateNotificationHistory();
});