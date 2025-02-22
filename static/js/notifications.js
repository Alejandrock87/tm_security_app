// Variables globales
let notificationsEnabled = false;

// Función para actualizar el estado visual de los botones
function updateButtonStates(notificationsEnabled) {
    const activateBtn = document.getElementById('activateNotifications');
    const saveBtn = document.getElementById('savePreferences');
    
    if (Notification.permission === 'denied') {
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

// Función para mostrar mensajes toast
function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.getElementById('toastContainer').appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Función para guardar preferencias
async function saveNotificationPreferences() {
    const saveBtn = document.getElementById('savePreferences');
    const originalText = saveBtn.textContent;
    
    try {
        saveBtn.textContent = 'Guardando...';
        saveBtn.disabled = true;
        const preferences = {
            troncal: getSelectedValues('troncalPreference'),
            station: getSelectedValues('stationPreference'),
            incidentType: getSelectedValues('typePreference')
        };
        localStorage.setItem('notificationPreferences', JSON.stringify(preferences));
        await new Promise(resolve => setTimeout(resolve, 500));
        showToast('Preferencias guardadas correctamente', 'success');
        saveBtn.textContent = '¡Guardado!';
        saveBtn.classList.add('btn-success');
        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.classList.remove('btn-success');
            saveBtn.disabled = false;
        }, 2000);
        
    } catch (error) {
        console.error('Error al guardar preferencias:', error);
        showToast('Error al guardar preferencias', 'error');
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
    }
}

// Función para solicitar permisos de notificación
async function requestNotificationPermission() {
    const activateBtn = document.getElementById('activateNotifications');
    const originalText = activateBtn.textContent;
    
    try {
        if (!('Notification' in window)) {
            showToast('Este navegador no soporta notificaciones', 'error');
            return;
        }
        if (Notification.permission === 'denied') {
            activateBtn.textContent = 'Notificaciones Bloqueadas';
            activateBtn.classList.remove('btn-primary', 'btn-success');
            activateBtn.classList.add('btn-danger');
            showToast('Por favor, desbloquea las notificaciones en la configuración de tu navegador', 'warning');
            return;
        }
        activateBtn.textContent = 'Solicitando permisos...';
        activateBtn.disabled = true;
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            notificationsEnabled = true;
            updateButtonStates(true);
            showToast('Notificaciones activadas correctamente', 'success');
            new Notification('Notificaciones Activadas', {
                body: 'Recibirás alertas de incidentes según tus preferencias',
                icon: '/static/icons/notification-icon.png'
            });
        } else {
            throw new Error('Permiso de notificaciones denegado');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast(error.message, 'error');
        updateButtonStates(false);
    } finally {
        activateBtn.disabled = false;
    }
}

// Función para mostrar mensajes al usuario
function showToast(message, type = 'info') {
    console.log(`${type}: ${message}`);
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = '4px';
    toast.style.backgroundColor = type === 'success' ? '#34a853' :
                                type === 'error' ? '#ea4335' :
                                type === 'warning' ? '#fbbc05' : '#1a73e8';
    toast.style.color = 'white';
    toast.style.zIndex = '1000';
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3000);
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

// Función para solicitar permiso de notificaciones (duplicate function, this one will be removed)
//async function requestNotificationPermission() { ... }

// Función para guardar preferencias (duplicate function, this one will be removed)
//async function saveNotificationPreferences() { ... }


let socket = null;
let notificationCount = 0;

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
const notificationBadge = document.getElementById('notification-badge');
const notificationsList = document.getElementById('notificationList');

// Objeto para almacenar los filtros activos (this will be removed)
//let notificationFilters = { ... };

// Función para obtener las preferencias almacenadas en localStorage
function getNotificationSettings() {
    return JSON.parse(localStorage.getItem('notificationSettings')) || {
        troncal: ['all'],
        station: ['all'],
        incidentType: ['all'],
        enabled: true
    };
}


// Helper function para obtener las preferencias seleccionadas
function getSelectedValues(prefGroupId) {
    const checkedBoxes = document.querySelectorAll(`#${prefGroupId} input[type="checkbox"]:checked`);
    return Array.from(checkedBoxes).map(cb => cb.value);
}

// Función para cargar Troncales y Estaciones desde la API
async function loadPreferences() {
    try {
        const response = await fetch('/api/stations');
        if (!response.ok) {
            throw new Error('Error al obtener las estaciones');
        }
        const stations = await response.json();
        console.log('Datos de estaciones recibidos:', stations);
        const troncales = [...new Set(stations.map(station => station.troncal))]
            .filter(troncal => troncal && troncal !== 'N/A')
            .sort();
        console.log('Troncales extraídas:', troncales);
        const estaciones = [...new Set(stations.map(station => station.nombre))]
            .filter(nombre => nombre && nombre.trim() !== '')
            .sort();
        console.log('Estaciones extraídas:', estaciones);
        const settings = getNotificationSettings();
        populateCheckboxGroup('troncalPreference', troncales, settings.troncal);
        populateCheckboxGroup('stationPreference', estaciones, settings.station);
        setIncidentTypePreferences(settings.incidentType);
    } catch (error) {
        console.error('Error loading preferences:', error);
        showToast('Error al cargar las preferencias', 'error');
    }
}

// Función para poblar un grupo de checkboxes (Troncales o Estaciones)
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
}

// Función para establecer las preferencias de Tipos de Incidente
function setIncidentTypePreferences(selectedTypes) {
    const typeCheckboxes = document.querySelectorAll('#typePreference .form-check-input');
    typeCheckboxes.forEach(cb => {
        cb.checked = selectedTypes.includes('all') || selectedTypes.includes(cb.value);
    });
}

// Inicialización de Socket.IO y carga de preferencias
function initializeSocketIO() {
    try {
        socket = io();
        socket.on('connect', () => {
            console.log('Conectado a Socket.IO');
        });
        socket.on('disconnect', () => {
            console.log('Desconectado del servidor Socket.IO');
        });
        socket.on('new_incident', (data) => {
            const settings = getNotificationSettings();
            if (!settings.enabled) return;
            if (shouldShowNotification(data)) {
                addNotification(data);
                updateNotificationBadge(++notificationCount);
                showBrowserNotification(data);
            }
        });
    } catch (error) {
        console.error('Error inicializando Socket.IO:', error);
        showToast('Error al inicializar Socket.IO', 'error');
    }
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

// Función para mostrar notificaciones del navegador
function showBrowserNotification(incident) {
    if (shouldShowBrowserNotifications()) {
        new Notification('Nuevo Incidente', {
            body: `${capitalizeFirstLetter(incident.incident_type)} en ${incident.nearest_station}`,
            icon: '/static/icons/notification-icon.png' 
        });
    }
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

// Función para configurar eventos en los filtros de historial
function setupFilterEventListeners() {
    document.querySelectorAll('.notification-filters .filter-chip').forEach(chip => {
        chip.addEventListener('click', function() {
            const filterType = this.getAttribute('data-filter');
            const preferences = JSON.parse(localStorage.getItem('notificationPreferences') || '{}');

            // Si se hace clic en "Todas", desactivar otros filtros
            if (filterType === 'all') {
                document.querySelectorAll('.notification-filters .filter-chip').forEach(c => {
                    c.classList.remove('active');
                });
                this.classList.add('active');
                fetchFilteredNotifications(new URLSearchParams());
                return;
            }

            // Si hay otros filtros activos, desactivar "Todas"
            const allChip = document.querySelector('.filter-chip[data-filter="all"]');
            if (allChip) allChip.classList.remove('active');

            // Alternar el estado activo del filtro actual
            this.classList.toggle('active');

            // Aplicar filtros según las preferencias guardadas
            applyNotificationFilters();
        });
    });
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

// Inicialización cuando el DOM está listo
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Cargar datos iniciales y configurar listeners
        await Promise.all([
            loadStations(),
            loadPreferences()
        ]);

        setupFilterEventListeners();
        initializeSocketIO();

        // Aplicar filtros iniciales basados en preferencias guardadas
        applyNotificationFilters();
        updateFilterVisuals();

    } catch (error) {
        console.error('Error en inicialización:', error);
        showToast("Error al inicializar la página", "error");
    }
});

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

// This event listener is removed because the functionality is now handled by the new functions.
//document.addEventListener('DOMContentLoaded', () => { ... });