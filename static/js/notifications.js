// Connect to the SocketIO server
const socket = io();
let notificationCount = 0;

// Elemento del contador de notificaciones
const notificationBadge = document.getElementById('notification-badge');
const notificationsList = document.getElementById('notifications-list');

let notificationFilters = {
    troncal: [],
    station: [],
    incidentType: []
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

// Save notification preferences
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

// Helper function to get selected preferences
function getSelectedPreferences(selectId, allId) {
    const allCheckbox = document.getElementById(allId);
    const selected = [];
    if (allCheckbox.checked) {
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

// Initialize preferences when page loads
document.addEventListener('DOMContentLoaded', () => {
    const settings = getNotificationSettings();
    document.getElementById('notificationsEnabled').checked = settings.enabled;

    // Populate troncal options from the API
    fetch('/api/stations')
        .then(response => {
            if (!response.ok) {
                throw new Error('Error cargando estaciones');
            }
            return response.json();
        })
        .then(stations => {
            const troncales = new Set(stations.map(station => station.troncal_estacion));
            const troncalGroup = document.querySelector('#troncalPreference .preferences-group');
            if (troncalGroup) {
                troncales.forEach(troncal => {
                    if (troncal && troncal !== 'N/A') {
                        const formCheck = document.createElement('div');
                        formCheck.className = 'form-check';
                        const checkbox = document.createElement('input');
                        checkbox.className = 'form-check-input';
                        checkbox.type = 'checkbox';
                        checkbox.value = troncal;
                        checkbox.id = `troncal-${troncal}`;
                        checkbox.checked = settings.troncal.includes('all') || settings.troncal.includes(troncal);

                        const label = document.createElement('label');
                        label.className = 'form-check-label';
                        label.htmlFor = `troncal-${troncal}`;
                        label.textContent = troncal;

                        formCheck.appendChild(checkbox);
                        formCheck.appendChild(label);
                        troncalGroup.appendChild(formCheck);
                    }
                });

                // Handle "Todas las Troncales" checkbox
                const troncalAll = document.getElementById('troncalAll');
                troncalAll.addEventListener('change', function() {
                    const checkboxes = troncalGroup.querySelectorAll('.form-check-input:not(#troncalAll)');
                    checkboxes.forEach(cb => {
                        cb.checked = troncalAll.checked;
                    });
                });
            }

            // Populate station options
            const stationGroup = document.querySelector('#stationPreference .preferences-group');
            if (stationGroup) {
                stations.forEach(station => {
                    const formCheck = document.createElement('div');
                    formCheck.className = 'form-check';
                    const checkbox = document.createElement('input');
                    checkbox.className = 'form-check-input';
                    checkbox.type = 'checkbox';
                    checkbox.value = station.nombre_estacion;
                    checkbox.id = `station-${station.nombre_estacion}`;
                    checkbox.checked = settings.station.includes('all') || settings.station.includes(station.nombre_estacion);

                    const label = document.createElement('label');
                    label.className = 'form-check-label';
                    label.htmlFor = `station-${station.nombre_estacion}`;
                    label.textContent = station.nombre_estacion;

                    formCheck.appendChild(checkbox);
                    formCheck.appendChild(label);
                    stationGroup.appendChild(formCheck);
                });

                // Handle "Todas las Estaciones" checkbox
                const stationAll = document.getElementById('stationAll');
                stationAll.addEventListener('change', function() {
                    const checkboxes = stationGroup.querySelectorAll('.form-check-input:not(#stationAll)');
                    checkboxes.forEach(cb => {
                        cb.checked = stationAll.checked;
                    });
                });
            }
        })
        .catch(error => {
            console.error('Error loading stations:', error);
            showToast({ type: 'error', message: 'Error cargando estaciones' });
        });

    // Set incident type preferences
    const typeAll = document.getElementById('typeAll');
    typeAll.checked = settings.incidentType.includes('all');
    const typeCheckboxes = document.querySelectorAll('#typePreference .form-check-input:not(#typeAll)');
    typeCheckboxes.forEach(cb => {
        cb.checked = settings.incidentType.includes('all') || settings.incidentType.includes(cb.value);
    });

    // Handle "Todos los tipos" checkbox
    typeAll.addEventListener('change', function() {
        const checkboxes = document.querySelectorAll('#typePreference .form-check-input:not(#typeAll)');
        checkboxes.forEach(cb => {
            cb.checked = typeAll.checked;
        });
    });
});

// SocketIO event listeners
socket.on('connect', () => {
    console.log('Connected to SocketIO server');
});

socket.on('disconnect', () => {
    console.log('Disconnected from SocketIO server');
});

// Listen for new incident reports
socket.on('new_incident', (data) => {
    const settings = getNotificationSettings();
    if (!settings.enabled) return;

    // Check if the incident matches the user's preferences
    if (shouldShowNotification(data)) {
        addNotification(data);
        updateNotificationBadge(++notificationCount);

        // Optionally, show a browser notification
        if (Notification.permission === 'granted') {
            new Notification('Nuevo Incidente', {
                body: `${data.incident_type} en ${data.nearest_station}`,
                icon: '/static/icons/notification-icon.png' // Asegúrate de tener un ícono adecuado
            });
        }
    }
});

// Function to add a new notification to the list
function addNotification(incident) {
    const notificationElement = document.createElement('div');
    notificationElement.className = 'notification-item';

    const timestamp = new Date(incident.timestamp).toLocaleString();

    notificationElement.innerHTML = `
        <h6>${incident.incident_type}</h6>
        <p>Estación: ${incident.nearest_station}</p>
        <small>${timestamp}</small>
    `;

    if (notificationsList) {
        notificationsList.insertBefore(notificationElement, notificationsList.firstChild);
    }
}

// Function to update the notification badge
function updateNotificationBadge(count) {
    if (notificationBadge) {
        notificationBadge.textContent = count;
        notificationBadge.style.display = count > 0 ? 'inline' : 'none';
    }
}

// Function to determine if a notification should be shown based on preferences
function shouldShowNotification(incident) {
    const settings = getNotificationSettings();

    // Troncal
    const troncalMatch = settings.troncal.includes('all') || settings.troncal.includes(incident.troncal_estacion);

    // Estación
    const stationMatch = settings.station.includes('all') || settings.station.includes(incident.nearest_station);

    // Tipo de Incidente
    const typeMatch = settings.incidentType.includes('all') || settings.incidentType.includes(incident.incident_type);

    return troncalMatch && stationMatch && typeMatch;
}

// Function to show toast messages
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

    // Auto-remove after 5 seconds
    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 500);
    }, 5000);

    // Remove on close button click
    toast.querySelector('.btn-close').addEventListener('click', () => {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 500);
    });
}

// Handle filter chips for historial de notificaciones
document.querySelectorAll('.notification-filters .filter-chip').forEach(chip => {
    chip.addEventListener('click', function() {
        this.classList.toggle('active');
        applyNotificationFilters();
    });
});

// Function to apply filters to the notification history
function applyNotificationFilters() {
    const activeFilters = Array.from(document.querySelectorAll('.notification-filters .filter-chip.active'))
        .map(chip => chip.getAttribute('data-filter'));

    // Update the notificationFilters object
    notificationFilters = {
        troncal: [],
        station: [],
        incidentType: []
    };

    activeFilters.forEach(filter => {
        switch(filter) {
            case 'troncal':
                notificationFilters.troncal.push(...getSelectedPreferences('troncalPreference', 'troncalAll'));
                break;
            case 'station':
                notificationFilters.station.push(...getSelectedPreferences('stationPreference', 'stationAll'));
                break;
            case 'type':
                notificationFilters.incidentType.push(...getSelectedPreferences('typePreference', 'typeAll'));
                break;
            default:
                // 'all' selected
                notificationFilters = {
                    troncal: ['all'],
                    station: ['all'],
                    incidentType: ['all']
                };
        }
    });

    // Fetch and display the filtered notifications
    fetchFilteredNotifications();
}

// Function to fetch and display notifications based on filters
function fetchFilteredNotifications() {
    let query = '?';

    if (!notificationFilters.troncal.includes('all') && notificationFilters.troncal.length > 0) {
        query += `troncal=${notificationFilters.troncal.join(',')}&`;
    }

    if (!notificationFilters.station.includes('all') && notificationFilters.station.length > 0) {
        query += `station=${notificationFilters.station.join(',')}&`;
    }

    if (!notificationFilters.incidentType.includes('all') && notificationFilters.incidentType.length > 0) {
        query += `type=${notificationFilters.incidentType.join(',')}&`;
    }

    fetch(`/api/notifications/history${query}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
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
        })
        .catch(error => {
            console.error('Error al cargar historial de notificaciones:', error);
            notificationsList.innerHTML = '<p>Error al cargar notificaciones.</p>';
        });
}
