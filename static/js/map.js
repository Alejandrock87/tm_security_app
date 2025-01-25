
let map;
let markers = [];

document.addEventListener('DOMContentLoaded', function() {
    initMap();
    loadFilters();
    loadIncidentData();
});

function initMap() {
    const mapElement = document.getElementById('map');
    if (!mapElement) return;
    
    map = L.map('map').setView([4.6097, -74.0817], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
}

async function loadIncidentData() {
    try {
        const response = await fetch('/incidents');
        const data = await response.json();
        if (data) {
            updateMap(data);
            createChart(data);
        }
    } catch (error) {
        console.error('Error loading map data:', error);
    }
}

function updateMap(incidents) {
    if (!map) return;
    
    // Limpiar marcadores existentes
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];

    incidents.forEach(incident => {
        const marker = L.marker([incident.latitude, incident.longitude])
            .bindPopup(`
                <strong>${incident.incident_type}</strong><br>
                Estación: ${incident.nearest_station}<br>
                Fecha: ${new Date(incident.timestamp).toLocaleString()}
            `);
        markers.push(marker);
        marker.addTo(map);
    });
}

function createChart(data) {
    const ctx = document.getElementById('incidentChart');
    if (!ctx) return;

    const incidents = {};
    data.forEach(incident => {
        incidents[incident.incident_type] = (incidents[incident.incident_type] || 0) + 1;
    });

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(incidents),
            datasets: [{
                data: Object.values(incidents),
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
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

async function loadFilters() {
    try {
        const response = await fetch('/api/stations');
        const stations = await response.json();
        
        const troncalSelect = document.getElementById('troncalFilter');
        const stationSelect = document.getElementById('stationFilter');
        
        if (troncalSelect && stations.length > 0) {
            const troncales = [...new Set(stations.map(station => station.troncal))];
            troncalSelect.innerHTML = '<option value="all">Todas las Troncales</option>' +
                troncales.map(troncal => `<option value="${troncal}">${troncal}</option>`).join('');
        }
        
        if (stationSelect && stations.length > 0) {
            stationSelect.innerHTML = '<option value="all">Todas las Estaciones</option>' +
                stations.map(station => `<option value="${station.nombre}">${station.nombre}</option>`).join('');
        }
    } catch (error) {
        console.error('Error al cargar los filtros:', error);
    }
}

function applyFilters() {
    const filters = {
        troncal: document.getElementById('troncalFilter').value,
        station: document.getElementById('stationFilter').value,
        incidentType: document.getElementById('incidentTypeFilter').value,
        securityLevel: document.getElementById('securityLevelFilter').value
    };
    
    loadIncidentData(filters);
}
