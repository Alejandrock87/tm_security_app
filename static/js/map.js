
let map = null;
let markers = [];
let stationMarkers = [];
let stationsLayer = null;
let routesLayer = null;
let troncales = new Set();
let mapInitialized = false;
let stationSecurityLevels = {};
let incidents = [];

function initMap() {
    if (mapInitialized) return;

    map = L.map('map').setView([4.6097, -74.0817], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Add legend
    const legend = L.control({position: 'bottomright'});
    legend.onAdd = function (map) {
        const div = L.DomUtil.create('div', 'info legend');
        div.innerHTML = '<h4>Niveles de Inseguridad</h4>' +
            '<i style="background: #ff0000"></i> Alto<br>' +
            '<i style="background: #ffa500"></i> Medio<br>' +
            '<i style="background: #008000"></i> Bajo';
        return div;
    };
    legend.addTo(map);

    fetchInitialData();
    mapInitialized = true;
}

async function fetchInitialData() {
    try {
        const [statsResponse, incidentsResponse] = await Promise.all([
            fetch('/station_statistics'),
            fetch('/incidents')
        ]);
        
        stationSecurityLevels = await statsResponse.json();
        incidents = await incidentsResponse.json();
        
        loadGeoJSONLayers();
        populateFilters();
        updateStatistics();
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

function populateFilters() {
    const incidentTypes = [...new Set(incidents.map(i => i.incident_type))];
    const incidentTypeSelect = document.getElementById('incidentTypeFilter');
    
    incidentTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        incidentTypeSelect.appendChild(option);
    });
}

function applyFilters() {
    const date = document.getElementById('dateFilter').value;
    const time = document.getElementById('timeFilter').value;
    const type = document.getElementById('incidentTypeFilter').value;
    const level = document.getElementById('securityLevelFilter').value;
    const troncal = document.getElementById('troncalFilter').value;

    const filteredIncidents = incidents.filter(incident => {
        if (date && !incident.timestamp.includes(date)) return false;
        if (time) {
            const incidentTime = incident.timestamp.split('T')[1].substring(0, 5);
            if (incidentTime !== time) return false;
        }
        if (type !== 'all' && incident.incident_type !== type) return false;
        if (level !== 'all') {
            const stationLevel = getSecurityLevel(incident.nearest_station);
            if (stationLevel !== level) return false;
        }
        return true;
    });

    updateMap(filteredIncidents);
    updateIncidentsList(filteredIncidents);
    updateStatistics(filteredIncidents);
}

function updateMap(filteredIncidents) {
    // Clear existing markers
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];

    // Add filtered incidents to map
    filteredIncidents.forEach(incident => {
        const marker = L.marker([incident.latitude, incident.longitude])
            .bindPopup(`
                <b>Tipo:</b> ${incident.incident_type}<br>
                <b>Fecha:</b> ${new Date(incident.timestamp).toLocaleDateString()}<br>
                <b>Hora:</b> ${new Date(incident.timestamp).toLocaleTimeString()}<br>
                <b>Estación:</b> ${incident.nearest_station}
            `);
        markers.push(marker);
        marker.addTo(map);
    });
}

function updateIncidentsList(filteredIncidents) {
    const listContainer = document.getElementById('incidentsList');
    listContainer.innerHTML = '';

    filteredIncidents.forEach(incident => {
        const item = document.createElement('a');
        item.className = 'list-group-item list-group-item-action';
        item.innerHTML = `
            <div class="d-flex w-100 justify-content-between">
                <h5 class="mb-1">${incident.incident_type}</h5>
                <small>${new Date(incident.timestamp).toLocaleDateString()}</small>
            </div>
            <p class="mb-1">${incident.nearest_station}</p>
            <small>${new Date(incident.timestamp).toLocaleTimeString()}</small>
        `;
        listContainer.appendChild(item);
    });
}

function updateStatistics(filteredIncidents) {
    updateHourlyChart(filteredIncidents);
    updateIncidentTypeChart(filteredIncidents);
}

function updateHourlyChart(incidents) {
    const hourlyData = new Array(24).fill(0);
    incidents.forEach(incident => {
        const hour = new Date(incident.timestamp).getHours();
        hourlyData[hour]++;
    });

    const ctx = document.getElementById('hourlyChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Array.from({length: 24}, (_, i) => `${i}:00`),
            datasets: [{
                label: 'Incidentes por Hora',
                data: hourlyData,
                backgroundColor: 'rgba(54, 162, 235, 0.5)'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function updateIncidentTypeChart(incidents) {
    const typeCount = {};
    incidents.forEach(incident => {
        typeCount[incident.incident_type] = (typeCount[incident.incident_type] || 0) + 1;
    });

    const ctx = document.getElementById('incidentTypeChart').getContext('2d');
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(typeCount),
            datasets: [{
                data: Object.values(typeCount),
                backgroundColor: [
                    '#FF6384',
                    '#36A2EB',
                    '#FFCE56',
                    '#4BC0C0',
                    '#9966FF'
                ]
            }]
        },
        options: {
            responsive: true
        }
    });
}

function getSecurityLevel(stationName) {
    const count = stationSecurityLevels[stationName] || 0;
    if (count > 5) return 'high';
    if (count >= 2) return 'medium';
    return 'low';
}

document.addEventListener('DOMContentLoaded', initMap);
