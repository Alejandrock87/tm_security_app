// Connect to the SocketIO server
const socket = io();
let notificationCount = 0;

// Elemento del contador de notificaciones
const notificationBadge = document.getElementById('notification-badge');
const notificationsList = document.getElementById('notifications-list');

let notificationFilters = {
    troncal: 'all',
    station: 'all',
    incidentType: 'all'
};

// Notification settings in localStorage
const getNotificationSettings = () => {
    return JSON.parse(localStorage.getItem('notificationSettings')) || {
        troncal: ['all'],
        station: ['all'],
        incidentType: ['all'],
        enabled: true
    };
};

function saveNotificationPreferences() {
    const settings = {
        enabled: document.getElementById('notificationsEnabled').checked,
        troncal: Array.from(document.getElementById('troncalPreference').selectedOptions).map(opt => opt.value),
        station: Array.from(document.getElementById('stationPreference').selectedOptions).map(opt => opt.value),
        incidentType: Array.from(document.getElementById('typePreference').selectedOptions).map(opt => opt.value)
    };

    localStorage.setItem('notificationSettings', JSON.stringify(settings));
    showToast({ type: 'success', message: 'Preferencias guardadas exitosamente' });
}

// Initialize preferences when page loads
document.addEventListener('DOMContentLoaded', () => {
    const settings = getNotificationSettings();
    document.getElementById('notificationsEnabled').checked = settings.enabled;

    // Populate troncal options from the API
    fetch('/api/stations')
        .then(response => response.json())
        .then(stations => {
            const troncales = new Set(stations.map(station => station.troncal));
            const troncalSelect = document.getElementById('troncalPreference');
            troncalSelect.innerHTML = '<option value="all">Todas las Troncales</option>';
            troncales.forEach(troncal => {
                if (troncal && troncal !== 'N/A') {
                    const option = document.createElement('option');
                    option.value = troncal;
                    option.textContent = troncal;
                    option.selected = settings.troncal.includes(troncal);
                    troncalSelect.appendChild(option);
                }
            });

            // Populate station options
            const stationSelect = document.getElementById('stationPreference');
            stationSelect.innerHTML = '<option value="all">Todas las Estaciones</option>';
            stations.forEach(station => {
                const option = document.createElement('option');
                option.value = station.nombre;
                option.textContent = station.nombre;
                option.selected = settings.station.includes(station.nombre);
                stationSelect.appendChild(option);
            });
        });

    // Set incident type preferences
    const typeSelect = document.getElementById('typePreference');
    Array.from(typeSelect.options).forEach(option => {
        option.selected = settings.incidentType.includes(option.value);
    });
});

socket.on('connect', () => {
    console.log('Connected to SocketIO server');
});

socket.on('disconnect', () => {
    console.log('Disconnected from SocketIO server');
});

// Escuchar nuevos reportes de incidentes
socket.on('new_incident', (data) => {
    addNotification(data);
    updateNotificationBadge(++notificationCount);
});

// Función para agregar una nueva notificación
function addNotification(incident) {
    const notificationElement = document.createElement('div');
    notificationElement.className = 'list-group-item';

    const timestamp = new Date(incident.timestamp).toLocaleString();

    notificationElement.innerHTML = `
        <div class="d-flex w-100 justify-content-between">
            <h6 class="mb-1">${incident.incident_type}</h6>
            <small>${timestamp}</small>
        </div>
        <p class="mb-1">Estación: ${incident.nearest_station}</p>
    `;

    if (notificationsList) {
        notificationsList.insertBefore(notificationElement, notificationsList.firstChild);
    }
}

// Función para actualizar el contador de notificaciones
function updateNotificationBadge(count) {
    if (notificationBadge) {
        notificationBadge.textContent = count;
        notificationBadge.style.display = count > 0 ? 'inline' : 'none';
    }
}

// Limpiar el contador cuando se abre el modal
document.getElementById('notificationsModal')?.addEventListener('show.bs.modal', () => {
    notificationCount = 0;
    updateNotificationBadge(0);
});


function shouldShowNotification(incident) {
    const settings = getNotificationSettings();
    return (settings.troncal === 'all' || settings.troncal.includes(incident.troncal)) &&
           (settings.station === 'all' || settings.station.includes(incident.nearest_station)) &&
           (settings.incidentType === 'all' || settings.incidentType.includes(incident.incident_type));
}

function showToast(data) {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'notification-toast';
    toast.innerHTML = `
        <div class="toast-header">
            <strong>${data.type || 'Notificación'}</strong>
            <small>${new Date().toLocaleTimeString()}</small>
        </div>
        <div class="toast-body">
            ${data.message || 'Nueva notificación'}
        </div>
    `;

    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 500);
    }, 5000);
}

function applyNotificationFilters() {
    const settings = {
        troncal: document.getElementById('troncalFilter').value,
        station: document.getElementById('stationFilter').value,
        incidentType: document.getElementById('incidentTypeFilter').value,
        enabled: document.getElementById('notificationsEnabled').checked
    };
    localStorage.setItem('notificationSettings', JSON.stringify(settings));
}

// Initialize notification settings when page loads
document.addEventListener('DOMContentLoaded', () => {
    const settings = getNotificationSettings();
    if (document.getElementById('notificationsEnabled')) {
        document.getElementById('notificationsEnabled').checked = settings.enabled;
    }
    if (document.getElementById('troncalFilter')) {
        document.getElementById('troncalFilter').value = settings.troncal;
    }
    if (document.getElementById('stationFilter')) {
        document.getElementById('stationFilter').value = settings.station;
    }
    if (document.getElementById('incidentTypeFilter')) {
        document.getElementById('incidentTypeFilter').value = settings.incidentType;
    }
});