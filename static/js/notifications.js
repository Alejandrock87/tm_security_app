
// Connect to the SocketIO server
const socket = io();
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

socket.on('new_incident', (data) => {
    const settings = getNotificationSettings();
    if (settings.enabled && shouldShowNotification(data)) {
        showToast(data);
        updateNotificationsList(data);
    }
});

function shouldShowNotification(incident) {
    const settings = getNotificationSettings();
    return (settings.troncal === 'all' || incident.troncal === settings.troncal) &&
           (settings.station === 'all' || incident.nearest_station === settings.station) &&
           (settings.incidentType === 'all' || incident.incident_type === settings.incidentType);
}

function showToast(incident) {
    const toast = document.createElement('div');
    toast.className = 'notification-toast';
    toast.innerHTML = `
        <div class="toast-header">
            <strong>Nuevo Incidente</strong>
            <small>${new Date(incident.timestamp).toLocaleTimeString()}</small>
        </div>
        <div class="toast-body">
            ${incident.incident_type} en ${incident.nearest_station}
        </div>
    `;
    
    document.getElementById('toastContainer').appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 500);
    }, 5000);
}

function updateNotificationsList(newIncident) {
    const notificationList = document.getElementById('notificationList');
    if (!notificationList) return;

    const listItem = document.createElement('div');
    listItem.className = 'notification-item';
    listItem.innerHTML = `
        <div class="notification-header">
            <span class="incident-type">${newIncident.incident_type}</span>
            <span class="timestamp">${new Date(newIncident.timestamp).toLocaleString()}</span>
        </div>
        <div class="notification-body">
            <span class="station">Estación: ${newIncident.nearest_station}</span>
            <span class="troncal">Troncal: ${newIncident.troncal}</span>
        </div>
    `;
    
    notificationList.insertBefore(listItem, notificationList.firstChild);
    updateNotificationBadge();
}

function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        const count = parseInt(badge.textContent || '0') + 1;
        badge.textContent = count;
        badge.style.display = count > 0 ? 'block' : 'none';
    }
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
