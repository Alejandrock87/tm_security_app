// Variables globales
let socket = null;
let notificationCount = 0;
const notificationBadge = document.getElementById('notification-badge');
const notificationsList = document.getElementById('notifications-list');

let notificationFilters = {
    troncal: [],
    station: [],
    incidentType: []
};

// Función para cargar estaciones y troncales
async function loadStations() {
    try {
        const response = await fetch('/api/stations');
        if (!response.ok) {
            throw new Error('Error en la respuesta del servidor');
        }
        const stations = await response.json();
        if (!Array.isArray(stations)) {
            throw new Error('Formato de datos inválido');
        }

        // Cargar troncales primero
        const troncales = [...new Set(stations.map(station => station.troncal))]
            .filter(troncal => troncal && troncal !== 'N/A')
            .sort();

        const troncalGroup = document.getElementById('troncalPreference');
        if (troncalGroup) {
            const preferencesGroup = troncalGroup.querySelector('.preferences-group');
            preferencesGroup.innerHTML = '';

            // Agregar opción "Todas las Troncales"
            const allTroncalDiv = document.createElement('div');
            allTroncalDiv.className = 'form-check';
            allTroncalDiv.innerHTML = `
                <input class="form-check-input" type="checkbox" value="all" id="troncalAll" checked>
                <label class="form-check-label" for="troncalAll">Todas las Troncales</label>
            `;
            preferencesGroup.appendChild(allTroncalDiv);

            // Agregar cada troncal
            troncales.forEach(troncal => {
                const troncalDiv = document.createElement('div');
                troncalDiv.className = 'form-check';
                troncalDiv.innerHTML = `
                    <input class="form-check-input" type="checkbox" value="${troncal}" id="troncal-${troncal}">
                    <label class="form-check-label" for="troncal-${troncal}">${troncal}</label>
                `;
                preferencesGroup.appendChild(troncalDiv);
            });
        }

        // Luego cargar estaciones
        const stationGroup = document.getElementById('stationPreference');
        if (stationGroup) {
            const preferencesGroup = stationGroup.querySelector('.preferences-group');
            preferencesGroup.innerHTML = '';

            // Agregar opción "Todas las Estaciones"
            const allStationsDiv = document.createElement('div');
            allStationsDiv.className = 'form-check';
            allStationsDiv.innerHTML = `
                <input class="form-check-input" type="checkbox" value="all" id="stationAll" checked>
                <label class="form-check-label" for="stationAll">Todas las Estaciones</label>
            `;
            preferencesGroup.appendChild(allStationsDiv);

            // Agregar cada estación
            stations
                .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))
                .forEach(station => {
                    if (station.nombre) {
                        const stationDiv = document.createElement('div');
                        stationDiv.className = 'form-check';
                        stationDiv.innerHTML = `
                            <input class="form-check-input" type="checkbox" value="${station.nombre}" id="station-${station.nombre}">
                            <label class="form-check-label" for="station-${station.nombre}">${station.nombre}</label>
                        `;
                        preferencesGroup.appendChild(stationDiv);
                    }
                });
        }

        // Configurar los eventos de los checkboxes
        setupCheckboxEvents();
    } catch (error) {
        console.error('Error loading stations and troncales:', error);
        showError('Error al cargar las estaciones y troncales');
    }
}

// Configurar eventos de los checkboxes
function setupCheckboxEvents() {
    const troncalAll = document.getElementById('troncalAll');
    const stationAll = document.getElementById('stationAll');

    if (troncalAll) {
        troncalAll.addEventListener('change', function() {
            const troncalCheckboxes = document.querySelectorAll('#troncalPreference .form-check-input:not(#troncalAll)');
            troncalCheckboxes.forEach(cb => {
                cb.checked = this.checked;
                cb.disabled = this.checked;
            });
        });
    }

    if (stationAll) {
        stationAll.addEventListener('change', function() {
            const stationCheckboxes = document.querySelectorAll('#stationPreference .form-check-input:not(#stationAll)');
            stationCheckboxes.forEach(cb => {
                cb.checked = this.checked;
                cb.disabled = this.checked;
            });
        });
    }
}

// Inicialización de Socket.IO
function initializeSocketIO() {
    if (typeof io !== 'undefined') {
        try {
            socket = io(window.location.origin, {
                transports: ['polling', 'websocket'],
                reconnectionAttempts: 5
            });

            // Eventos de Socket.IO
            socket.on('connect', () => {
                console.log('Conectado a Socket.IO');
                loadStations();
            });

            socket.on('connect_error', (error) => {
                console.error('Error de conexión Socket.IO:', error);
                loadStations(); // Intentar cargar estaciones incluso si hay error de socket
            });

            socket.on('disconnect', () => {
                console.log('Desconectado del servidor Socket.IO');
            });

        } catch (error) {
            console.error('Error inicializando Socket.IO:', error);
            loadStations(); // Intentar cargar estaciones incluso si falla la inicialización
        }
    } else {
        console.error('Socket.IO no está disponible');
    }
}

// Configurar eventos de Socket.IO
function setupSocketEvents() {
    if (!socket) return;

    socket.on('new_incident', (data) => {
        const settings = getNotificationSettings();
        if (!settings.enabled) return;

        if (shouldShowNotification(data)) {
            addNotification(data);
            updateNotificationBadge(++notificationCount);

            if (Notification.permission === 'granted') {
                new Notification('Nuevo Incidente', {
                    body: `${data.incident_type} en ${data.nearest_station}`,
                    icon: '/static/icons/notification-icon.png'
                });
            }
        }
    });
}

// Funciones de utilidad
function getNotificationSettings() {
    return JSON.parse(localStorage.getItem('notificationSettings')) || {
        troncal: ['all'],
        station: ['all'],
        incidentType: ['all'],
        enabled: true
    };
}

function saveNotificationPreferences() {
    const settings = {
        enabled: document.getElementById('notificationsEnabled').checked,
        troncal: getSelectedPreferences('troncalPreference', 'troncalAll'),
        station: getSelectedPreferences('stationPreference', 'stationAll'),
        incidentType: getSelectedPreferences('typePreference', 'typeAll')
    };

    localStorage.setItem('notificationSettings', JSON.stringify(settings));
    showToast({ type: 'success', message: 'Preferencias guardadas exitosamente' });
}

function getSelectedPreferences(selectId, allId) {
    const allCheckbox = document.getElementById(allId);
    const selected = [];
    if (allCheckbox && allCheckbox.checked) {
        selected.push('all');
    } else {
        const checkboxes = document.querySelectorAll(`#${selectId} .form-check-input:not(#${allId})`);
        checkboxes.forEach(cb => {
            if (cb.checked) {
                selected.push(cb.value);
            }
        });
    }
    return selected.length > 0 ? selected : ['all'];
}

function addNotification(incident) {
    if (!notificationsList) return;

    const notificationElement = document.createElement('div');
    notificationElement.className = 'notification-item';
    const timestamp = new Date(incident.timestamp).toLocaleString();

    notificationElement.innerHTML = `
        <h6>${incident.incident_type}</h6>
        <p>Estación: ${incident.nearest_station}</p>
        <small>${timestamp}</small>
    `;

    notificationsList.insertBefore(notificationElement, notificationsList.firstChild);
}

function updateNotificationBadge(count) {
    if (notificationBadge) {
        notificationBadge.textContent = count;
        notificationBadge.style.display = count > 0 ? 'inline' : 'none';
    }
}

function shouldShowNotification(incident) {
    const settings = getNotificationSettings();
    const troncalMatch = settings.troncal.includes('all') || settings.troncal.includes(incident.troncal_estacion);
    const stationMatch = settings.station.includes('all') || settings.station.includes(incident.nearest_station);
    const typeMatch = settings.incidentType.includes('all') || settings.incidentType.includes(incident.incident_type);
    return troncalMatch && stationMatch && typeMatch;
}

function showToast(data) {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.zIndex = '1050';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `floating-alert ${data.type === 'error' ? 'alert-danger' : (data.type === 'success' ? 'alert-success' : 'alert-info')}`;
    toast.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <div>${data.message}</div>
            <button type="button" class="btn-close" aria-label="Close"></button>
        </div>
    `;

    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 500);
    }, 5000);

    toast.querySelector('.btn-close').addEventListener('click', () => {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 500);
    });
}

// Inicialización cuando el DOM está listo
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar Socket.IO
    initializeSocketIO();


    function loadStations() {
        fetch('/api/stations')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Error en la respuesta del servidor');
                }
                return response.json();
            })
            .then(stations => {
                if (!Array.isArray(stations)) {
                    throw new Error('Formato de datos inválido');
                }
                populateStationOptions(stations);
            })
            .catch(error => {
                console.error('Error loading stations:', error);
                showError('Error al cargar las estaciones. Por favor, intente nuevamente.');
            });
    }

    function populateStationOptions(stations) {
        const stationSelect = document.getElementById('stationFilter');
        if (!stationSelect) return;

        stationSelect.innerHTML = '<option value="all">Todas las Estaciones</option>';

        stations
            .sort((a, b) => a.nombre.localeCompare(b.nombre))
            .forEach(station => {
                if (station.nombre) {
                    const option = document.createElement('option');
                    option.value = station.nombre;
                    option.textContent = station.nombre;
                    stationSelect.appendChild(option);
                }
            });
    }

    function showError(message) {
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        } else {
            console.error(message);
        }
    }
    // Configurar event listeners para filtros
    setupFilterEventListeners();
});

function populateTroncalOptions(troncales, settings) {
    const troncalGroup = document.querySelector('#troncalPreference .preferences-group');
    if (!troncalGroup) return;

    troncales.forEach(troncal => {
        if (troncal && troncal !== 'N/A') {
            const formCheck = createCheckboxElement(
                `troncal-${troncal}`,
                troncal,
                settings.troncal.includes('all') || settings.troncal.includes(troncal)
            );
            troncalGroup.appendChild(formCheck);
        }
    });

    setupAllCheckboxHandler('troncalAll', '#troncalPreference');
}

function populateStationList(stations, settings) {
    const stationGroup = document.querySelector('#stationPreference .preferences-group');
    if (!stationGroup) return;

    stations.forEach(station => {
        const formCheck = createCheckboxElement(
            `station-${station.nombre_estacion}`,
            station.nombre_estacion,
            settings.station.includes('all') || settings.station.includes(station.nombre_estacion)
        );
        stationGroup.appendChild(formCheck);
    });

    setupAllCheckboxHandler('stationAll', '#stationPreference');
}

function createCheckboxElement(id, value, checked) {
    const formCheck = document.createElement('div');
    formCheck.className = 'form-check';

    const checkbox = document.createElement('input');
    checkbox.className = 'form-check-input';
    checkbox.type = 'checkbox';
    checkbox.value = value;
    checkbox.id = id;
    checkbox.checked = checked;

    const label = document.createElement('label');
    label.className = 'form-check-label';
    label.htmlFor = id;
    label.textContent = value;

    formCheck.appendChild(checkbox);
    formCheck.appendChild(label);
    return formCheck;
}

function setupAllCheckboxHandler(allCheckboxId, groupSelector) {
    const allCheckbox = document.getElementById(allCheckboxId);
    if (!allCheckbox) return;

    allCheckbox.addEventListener('change', function() {
        const checkboxes = document.querySelectorAll(`${groupSelector} .form-check-input:not(#${allCheckboxId})`);
        checkboxes.forEach(cb => {
            cb.checked = allCheckbox.checked;
        });
    });
}

function setupFilterEventListeners() {
    document.querySelectorAll('.notification-filters .filter-chip').forEach(chip => {
        chip.addEventListener('click', function() {
            this.classList.toggle('active');
            applyNotificationFilters();
        });
    });
}

function applyNotificationFilters() {
    const activeFilters = Array.from(document.querySelectorAll('.notification-filters .filter-chip.active'))
        .map(chip => chip.getAttribute('data-filter'));

    updateNotificationFilters(activeFilters);
    fetchFilteredNotifications();
}

function updateNotificationFilters(activeFilters) {
    notificationFilters = {
        troncal: [],
        station: [],
        incidentType: []
    };

    activeFilters.forEach(filter => {
        switch(filter) {
            case 'troncal':
                notificationFilters.troncal = getSelectedPreferences('troncalPreference', 'troncalAll');
                break;
            case 'station':
                notificationFilters.station = getSelectedPreferences('stationPreference', 'stationAll');
                break;
            case 'type':
                notificationFilters.incidentType = getSelectedPreferences('typePreference', 'typeAll');
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
}

function fetchFilteredNotifications() {
    const queryParams = buildQueryParams();

    fetch(`/api/notifications/history${queryParams}`)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            updateNotificationsList(data);
        })
        .catch(error => {
            console.error('Error al cargar historial de notificaciones:', error);
            if (notificationsList) {
                notificationsList.innerHTML = '<p>Error al cargar notificaciones.</p>';
            }
        });
}

function buildQueryParams() {
    const params = [];

    if (!notificationFilters.troncal.includes('all') && notificationFilters.troncal.length > 0) {
        params.push(`troncal=${notificationFilters.troncal.join(',')}`);
    }
    if (!notificationFilters.station.includes('all') && notificationFilters.station.length > 0) {
        params.push(`station=${notificationFilters.station.join(',')}`);
    }
    if (!notificationFilters.incidentType.includes('all') && notificationFilters.incidentType.length > 0) {
        params.push(`type=${notificationFilters.incidentType.join(',')}`);
    }

    return params.length > 0 ? `?${params.join('&')}` : '';
}

function updateNotificationsList(data) {
    if (!notificationsList) return;

    notificationsList.innerHTML = '';
    if (data.notifications && data.notifications.length > 0) {
        data.notifications.forEach(notification => {
            const item = document.createElement('div');
            item.className = 'notification-item';
            const timestamp = new Date(notification.timestamp).toLocaleString();
            item.innerHTML = `
                <h6>${notification.title}</h6>
                <p>${notification.message}</p>
                <small>${timestamp}</small>
            `;
            notificationsList.appendChild(item);
        });
    } else {
        notificationsList.innerHTML = '<p>No hay notificaciones para mostrar.</p>';
    }
}

function populateIncidentTypeOptions(settings) {
    const incidentTypeGroup = document.querySelector('#typePreference .preferences-group');
    if (!incidentTypeGroup) return;

    // Assuming you have an array of incident types available somewhere
    const incidentTypes = ['Incendio', 'Accidente', 'Retraso']; // Replace with your actual incident types

    incidentTypes.forEach(type => {
        const formCheck = createCheckboxElement(
            `type-${type}`,
            type,
            settings.incidentType.includes('all') || settings.incidentType.includes(type)
        );
        incidentTypeGroup.appendChild(formCheck);
    });

    setupAllCheckboxHandler('typeAll', '#typePreference');
}