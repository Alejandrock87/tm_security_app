
let map;
let markers = [];
let currentChart = null;

document.addEventListener('DOMContentLoaded', function() {
    initMap();
    loadMapData();
});

function initMap() {
    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    map = L.map('map').setView([4.6097, -74.0817], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
}

async function loadMapData() {
    try {
        const [stationsResponse, incidentsResponse] = await Promise.all([
            fetch('/api/stations'),
            fetch('/incidents')
        ]);

        const stations = await stationsResponse.json();
        const incidents = await incidentsResponse.json();

        // Limpiar marcadores existentes
        markers.forEach(marker => map.removeLayer(marker));
        markers = [];

        // Inicializar filtros
        initializeFilters(stations, incidents);

        // Mostrar incidentes en el mapa
        displayIncidents(incidents);

        // Actualizar gráfico
        updateChart(incidents);
    } catch (error) {
        console.error('Error loading map data:', error);
    }
}

function initializeFilters(stations, incidents) {
    const troncalFilter = document.getElementById('troncalFilter');
    const stationFilter = document.getElementById('stationFilter');
    
    if (!troncalFilter || !stationFilter) return;

    // Obtener troncales únicas
    const troncales = [...new Set(stations.map(station => station.troncal))];
    
    // Poblar filtro de troncales
    troncalFilter.innerHTML = '<option value="all">Todas las Troncales</option>';
    troncales.forEach(troncal => {
        if (troncal) {
            troncalFilter.innerHTML += `<option value="${troncal}">${troncal}</option>`;
        }
    });

    // Manejar cambio en filtros
    troncalFilter.addEventListener('change', () => filterIncidents());
    stationFilter.addEventListener('change', () => filterIncidents());
}

function displayIncidents(incidents) {
    incidents.forEach(incident => {
        const marker = L.marker([incident.latitude, incident.longitude])
            .bindPopup(`
                <strong>${incident.incident_type}</strong><br>
                Estación: ${incident.nearest_station}<br>
                Fecha: ${new Date(incident.timestamp).toLocaleString()}
            `)
            .addTo(map);
        markers.push(marker);
    });
}

function updateChart(incidents) {
    const ctx = document.getElementById('incidentChart');
    if (!ctx) return;

    // Agrupar incidentes por tipo
    const incidentTypes = {};
    incidents.forEach(incident => {
        incidentTypes[incident.incident_type] = (incidentTypes[incident.incident_type] || 0) + 1;
    });

    if (currentChart) {
        currentChart.destroy();
    }

    currentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(incidentTypes),
            datasets: [{
                label: 'Número de Incidentes',
                data: Object.values(incidentTypes),
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function filterIncidents() {
    loadMapData();
}
