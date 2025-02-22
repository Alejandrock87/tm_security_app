// Variables globales
let socket = null;
let notificationCount = 0;
let notificationsEnabled = false;

// Función para mostrar toast notifications
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    // Agregar estilos inline para el toast
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

// Inicializar cuando el DOM está listo
document.addEventListener('DOMContentLoaded', () => {
    initializeServiceWorker();
    loadStations();
});

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

// Objeto para almacenar los filtros activos
let notificationFilters = {
    troncal: ['all'],
    station: ['all'],
    incidentType: ['all']
};

// Función para obtener las preferencias almacenadas en localStorage
function getNotificationSettings() {
    return JSON.parse(localStorage.getItem('notificationSettings')) || {
        troncal: ['all'],
        station: ['all'],
        incidentType: ['all'],
        enabled: true
    };
}

// Función para guardar preferencias
async function saveNotificationPreferences() {
    try {
        // Recolectar las preferencias seleccionadas
        const preferences = {
            troncal: getSelectedValues('troncalPreference'),
            station: getSelectedValues('stationPreference'),
            incidentType: getSelectedValues('typePreference')
        };

        // Guardar en localStorage
        localStorage.setItem('notificationPreferences', JSON.stringify(preferences));

        // Aquí puedes agregar la lógica para enviar al servidor si es necesario

        showToast("Preferencias guardadas correctamente", "success");
    } catch (error) {
        console.error("Error al guardar preferencias:", error);
        showToast("Error al guardar las preferencias", "error");
    }
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

        // Extraer Troncales únicas
        const troncales = [...new Set(stations.map(station => station.troncal))]
            .filter(troncal => troncal && troncal !== 'N/A')
            .sort();
        console.log('Troncales extraídas:', troncales);

        // Extraer Estaciones únicas usando el campo correcto 'nombre'
        const estaciones = [...new Set(stations.map(station => station.nombre))]
            .filter(nombre => nombre && nombre.trim() !== '')
            .sort();
        console.log('Estaciones extraídas:', estaciones);

        const settings = getNotificationSettings();

        // Poblar Troncales
        populateCheckboxGroup('troncalPreference', troncales, settings.troncal);

        // Poblar Estaciones
        populateCheckboxGroup('stationPreference', estaciones, settings.station);

        // Establecer preferencias para Tipos de Incidente (ya está estático en HTML)
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

    // Limpiar contenido existente
    group.innerHTML = '';

    // Crear checkboxes individuales
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

    // Establecer estado de los checkboxes individuales
    typeCheckboxes.forEach(cb => {
        cb.checked = selectedTypes.includes('all') || selectedTypes.includes(cb.value);
    });
}

// Inicialización de Socket.IO y carga de preferencias
function initializeSocketIO() {
    try {
        socket = io();

        // Eventos de Socket.IO
        socket.on('connect', () => {
            console.log('Conectado a Socket.IO');
        });

        socket.on('disconnect', () => {
            console.log('Desconectado del servidor Socket.IO');
        });

        // Escuchar nuevos incidentes
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

    // Troncal
    const troncalMatch = settings.troncal.includes('all') || settings.troncal.includes(incident.troncal);

    // Estación
    const stationMatch = settings.station.includes('all') || settings.station.includes(incident.nearest_station);

    // Tipo de Incidente
    const typeMatch = settings.incidentType.includes('all') || settings.incidentType.includes(incident.incident_type);

    return troncalMatch && stationMatch && typeMatch;
}

// Función para mostrar notificaciones del navegador
function showBrowserNotification(incident) {
    if (shouldShowBrowserNotifications()) {
        new Notification('Nuevo Incidente', {
            body: `${capitalizeFirstLetter(incident.incident_type)} en ${incident.nearest_station}`,
            icon: '/static/icons/notification-icon.png' // Asegúrate de tener un ícono adecuado
        });
    }
}


// Solicitar permiso para notificaciones del navegador
async function requestNotificationPermission() {
    if (!("Notification" in window)) {
        showToast("Este navegador no soporta notificaciones de escritorio", "error");
        return false;
    }

    try {
        const permission = await Notification.requestPermission();
        console.log("Estado de permisos:", permission);
        
        if (permission === "denied") {
            showToast("Has bloqueado las notificaciones. Por favor, habilítalas en la configuración de tu navegador.", "warning");
            return false;
        }

        if (permission === "granted") {
            await registerServiceWorker();
            await subscribeToPushNotifications();
            document.getElementById('savePreferences').disabled = false;
            showToast("Notificaciones activadas correctamente", "success");
            
            // Enviar notificación de prueba
            new Notification("TransMilenio Security", {
                body: "Las notificaciones están funcionando correctamente",
                icon: '/static/icons/notification-icon.png'
            });
        return true;
    }

    try {
        const permission = await Notification.requestPermission();
        console.log("Permiso de notificación:", permission);
        if (permission === "granted") {
            await registerServiceWorker();
            await subscribeToPushNotifications();
            document.getElementById('savePreferences').disabled = false;
            showToast("Notificaciones activadas correctamente", "success");
            return true;
        } else {
            showToast("No se otorgó permiso para las notificaciones", "warning");
        }
    } catch (error) {
        console.error("Error al solicitar permisos:", error);
        showToast("Error al activar las notificaciones", "error");
    }
    return false;
}

async function saveNotificationPreferences() {
    if (Notification.permission !== "granted") {
        showToast("Primero debes activar las notificaciones", "warning");
        return;
    }

    try {
        const preferences = {
            troncal: Array.from(document.querySelectorAll('#troncalPreference input:checked')).map(cb => cb.value),
            station: Array.from(document.querySelectorAll('#stationPreference input:checked')).map(cb => cb.value),
            incidentType: Array.from(document.querySelectorAll('#typePreference input:checked')).map(cb => cb.value)
        };

        if (!preferences.troncal.length && !preferences.station.length && !preferences.incidentType.length) {
            showToast("Debes seleccionar al menos una preferencia", "warning");
            return;
        }

        localStorage.setItem('notificationPreferences', JSON.stringify(preferences));
        showToast("Preferencias guardadas correctamente", "success");
        
        // Notificar al usuario
        new Notification("TransMilenio Security", {
            body: "Tus preferencias de notificación han sido actualizadas",
            icon: '/static/icons/notification-icon.png'
        });
    } catch (error) {
        console.error("Error al guardar preferencias:", error);
        showToast("Error al guardar las preferencias", "error");
    }
}

// Función para registrar el service worker
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/static/js/service-worker.js');
            console.log('Service Worker registrado:', registration);
            return registration;
        } catch (error) {
            console.error('Error al registrar el Service Worker:', error);
            throw error;
        }
    }
    throw new Error('Service Worker no soportado');
}

// Función para suscribir a notificaciones push
async function subscribeToPushNotifications() {
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: window.vapidPublicKey
        });

        // Enviar la suscripción al servidor
        await fetch('/push/subscribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(subscription)
        });

        console.log('Suscrito a notificaciones push');
        return true;
    } catch (error) {
        console.error('Error al suscribir a notificaciones push:', error);
        return false;
    }
}

// Cargar preferencias guardadas
function loadSavedPreferences() {
    const savedPrefs = localStorage.getItem('notificationPreferences');
    if (savedPrefs) {
        const prefs = JSON.parse(savedPrefs);
        document.getElementById('notificationsEnabled').checked = prefs.enabled;
        // Restaurar otras preferencias...
    }
}


// Función para aplicar los filtros activos y cargar las notificaciones correspondientes
function applyNotificationFilters() {
    const activeFilters = Array.from(document.querySelectorAll('.notification-filters .filter-chip.active'))
        .map(chip => chip.getAttribute('data-filter'));

    // Actualizar el objeto de filtros
    notificationFilters = {
        troncal: ['all'],
        station: ['all'],
        incidentType: ['all']
    };

    activeFilters.forEach(filter => {
        switch(filter) {
            case 'troncal':
                notificationFilters.troncal = getSelectedValues('troncalPreference');
                break;
            case 'station':
                notificationFilters.station = getSelectedValues('stationPreference');
                break;
            case 'type':
                notificationFilters.incidentType = getSelectedValues('typePreference');
                break;
            case 'all':
                notificationFilters = {
                    troncal: ['all'],
                    station: ['all'],
                    incidentType: ['all']
                };
                break;
        }
    });

    // Cargar las notificaciones filtradas
    fetchFilteredNotifications();
}

// Función para construir los parámetros de consulta según los filtros
function buildQueryParams() {
    const params = [];
    const activeFilters = document.querySelectorAll('.notification-filters .filter-chip.active');
    const allFilter = Array.from(activeFilters).some(chip => chip.getAttribute('data-filter') === 'all');

    if (!allFilter) {
        activeFilters.forEach(filter => {
            const filterType = filter.getAttribute('data-filter');
            if (filterType === 'troncal') {
                const selectedTroncals = Array.from(document.querySelectorAll('#troncalPreference input:checked:not(#troncalAll)'))
                    .map(cb => cb.value);
                if (selectedTroncals.length > 0) {
                    params.push(`troncal=${encodeURIComponent(selectedTroncals.join(','))}`);
                }
            } else if (filterType === 'station') {
                const selectedStations = Array.from(document.querySelectorAll('#stationPreference input:checked:not(#stationAll)'))
                    .map(cb => cb.value);
                if (selectedStations.length > 0) {
                    params.push(`station=${encodeURIComponent(selectedStations.join(','))}`);
                }
            } else if (filterType === 'type') {
                const selectedTypes = Array.from(document.querySelectorAll('#typePreference input:checked:not(#typeAll)'))
                    .map(cb => cb.value);
                if (selectedTypes.length > 0) {
                    params.push(`incident_type=${encodeURIComponent(selectedTypes.join(','))}`);
                }
            }
        });
    }

    return params.length > 0 ? `?${params.join('&')}` : '';
}

// Función para obtener y mostrar las notificaciones filtradas
function fetchFilteredNotifications() {
    const queryParams = buildQueryParams();
    console.log('Parámetros de consulta para notificaciones:', queryParams);

    fetch(`/api/notifications${queryParams}`)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(notifications => {
            console.log('Datos de notificaciones recibidos:', notifications);
            if (notificationsList) {
                notificationsList.innerHTML = '';
                if (notifications && notifications.length > 0) {
                    notifications.forEach(notification => {
                        const item = document.createElement('div');
                        item.className = 'notification-item';
                        const timestamp = new Date(notification.timestamp).toLocaleString();
                        item.innerHTML = `
                            <h6>${capitalizeFirstLetter(notification.incident_type)}</h6>
                            <p>Estación: ${notification.nearest_station}</p>
                            <small>${timestamp}</small>
                        `;
                        notificationsList.appendChild(item);
                    });
                } else {
                    notificationsList.innerHTML = '<p class="text-center">No hay notificaciones para mostrar.</p>';
                }
            }
        })
        .catch(error => {
            console.error('Error al cargar historial de notificaciones:', error);
            if (notificationsList) {
                notificationsList.innerHTML = '<p class="text-center">Error al cargar notificaciones.</p>';
            }
        });
}

// Función para actualizar la lista de notificaciones en el DOM
function updateNotificationsList(data) {
    if (!notificationsList) return;

    notificationsList.innerHTML = '';
    if (data.notifications && data.notifications.length > 0) {
        data.notifications.forEach(notification => {
            const item = document.createElement('div');
            item.className = 'notification-item';
            const timestamp = new Date(notification.timestamp).toLocaleString();
            item.innerHTML = `
                <h6>${capitalizeFirstLetter(notification.title)}</h6>
                <p>${notification.message}</p>
                <small>${timestamp}</small>
            `;
            notificationsList.appendChild(item);
        });
    } else {
        notificationsList.innerHTML = '<p>No hay notificaciones para mostrar.</p>';
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

// Función para configurar eventos en los filtros de historial
function setupFilterEventListeners() {
    document.querySelectorAll('.notification-filters .filter-chip').forEach(chip => {
        chip.addEventListener('click', function() {
            if (this.getAttribute('data-filter') === 'all') {
                // Si se selecciona "Todas", desactivar otros filtros
                document.querySelectorAll('.notification-filters .filter-chip').forEach(c => {
                    if (c !== this) c.classList.remove('active');
                });
                this.classList.add('active');
            } else {
                // Si se selecciona otro filtro, desactivar "Todas" si está activo
                const allChip = document.querySelector('.notification-filters .filter-chip[data-filter="all"]');
                if (allChip && allChip.classList.contains('active')) {
                    allChip.classList.remove('active');
                }
                // Permitir múltiples selecciones
                this.classList.toggle('active');
            }

            applyNotificationFilters();
        });
    });
}

// Inicialización cuando el DOM está listo
document.addEventListener('DOMContentLoaded', async () => {
    // Solicitar permiso para notificaciones del navegador
    await requestNotificationPermission();

    // Cargar las preferencias de notificaciones
    loadPreferences();

    // Inicializar Socket.IO
    initializeSocketIO();


    // Configurar eventos de filtros
    setupFilterEventListeners();
});

// Inicializar al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    checkInitialNotificationState();
});