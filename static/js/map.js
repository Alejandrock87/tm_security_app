
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
        const [statsResponse, incidentsResponse, stationsResponse] = await Promise.all([
            fetch('/station_statistics'),
            fetch('/incidents'),
            fetch('/api/stations')
        ]);
        
        stationSecurityLevels = await statsResponse.json();
        incidents = await incidentsResponse.json();
        const stations = await stationsResponse.json();
        
        populateFilters(incidents, stations);
        updateMap(incidents);
        updateIncidentsList(incidents);
        updateStatistics(incidents);
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

function populateFilters(incidents, stations) {
    // Populate incident types
    const incidentTypes = [...new Set(incidents.map(i => i.incident_type))];
    const incidentTypeSelect = document.getElementById('incidentTypeFilter');
    incidentTypeSelect.innerHTML = '<option value="all">Todos los tipos</option>';
    incidentTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        incidentTypeSelect.appendChild(option);
    });

    // Populate troncales
    const troncalSelect = document.getElementById('troncalFilter');
    troncalSelect.innerHTML = '<option value="all">Todas las Troncales</option>';
    stations.forEach(station => {
        if (station.troncal && !troncales.has(station.troncal)) {
            troncales.add(station.troncal);
            const option = document.createElement('option');
            option.value = station.troncal;
            option.textContent = station.troncal;
            troncalSelect.appendChild(option);
        }
    });

    // Populate stations
    const stationSelect = document.getElementById('stationFilter');
    stationSelect.innerHTML = '<option value="all">Todas las Estaciones</option>';
    stations.forEach(station => {
        const option = document.createElement('option');
        option.value = station.nombre;
        option.textContent = station.nombre;
        stationSelect.appendChild(option);
    });
}

function resetFilters() {
    document.getElementById('dateFilter').value = '';
    document.getElementById('timeFilter').value = '';
    document.getElementById('incidentTypeFilter').value = 'all';
    document.getElementById('securityLevelFilter').value = 'all';
    document.getElementById('troncalFilter').value = 'all';
    document.getElementById('stationFilter').value = 'all';
    applyFilters();
}

function applyFilters() {
    const date = document.getElementById('dateFilter').value;
    const time = document.getElementById('timeFilter').value;
    const type = document.getElementById('incidentTypeFilter').value;
    const level = document.getElementById('securityLevelFilter').value;
    const troncal = document.getElementById('troncalFilter').value;
    const station = document.getElementById('stationFilter').value;

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
        if (troncal !== 'all' && incident.troncal !== troncal) return false;
        if (station !== 'all' && incident.nearest_station !== station) return false;
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

    // If only one incident is selected, center map on it
    if (filteredIncidents.length === 1) {
        map.setView([filteredIncidents[0].latitude, filteredIncidents[0].longitude], 15);
    }
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
        item.onclick = () => {
            map.setView([incident.latitude, incident.longitude], 15);
            markers.forEach(marker => {
                if (marker.getLatLng().lat === incident.latitude && 
                    marker.getLatLng().lng === incident.longitude) {
                    marker.openPopup();
                }
            });
        };
        listContainer.appendChild(item);
    });
}

function getSecurityLevel(stationName) {
    const count = stationSecurityLevels[stationName] || 0;
    if (count > 5) return 'high';
    if (count >= 2) return 'medium';
    return 'low';
}

document.addEventListener('DOMContentLoaded', initMap);
