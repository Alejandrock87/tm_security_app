
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

        // Agrupar incidentes por estación
        const incidentsByStation = groupIncidentsByStation(incidents);

        // Mostrar estaciones en el mapa
        displayStations(stations, incidentsByStation);

        // Inicializar filtros
        initializeFilters(stations, incidents);

        // Actualizar gráfico
        updateChart(incidents);
    } catch (error) {
        console.error('Error loading map data:', error);
    }
}

function groupIncidentsByStation(incidents) {
    const grouped = {};
    incidents.forEach(incident => {
        if (!grouped[incident.nearest_station]) {
            grouped[incident.nearest_station] = {
                total: 0,
                types: {},
                incidents: []
            };
        }
        grouped[incident.nearest_station].total++;
        grouped[incident.nearest_station].incidents.push(incident);
        
        if (!grouped[incident.nearest_station].types[incident.incident_type]) {
            grouped[incident.nearest_station].types[incident.incident_type] = 0;
        }
        grouped[incident.nearest_station].types[incident.incident_type]++;
    });
    return grouped;
}

function displayStations(stations, incidentsByStation) {
    stations.forEach(station => {
        const stationData = incidentsByStation[station.nombre] || { total: 0, types: {} };
        const securityLevel = calculateSecurityLevel(stationData.total);
        
        const marker = L.marker([station.latitude, station.longitude])
            .bindPopup(createStationPopup(station.nombre, stationData, securityLevel))
            .addTo(map);
            
        marker.on('click', () => {
            updateChart(stationData.incidents || []);
        });
        
        markers.push(marker);
    });
}

function calculateSecurityLevel(totalIncidents) {
    if (totalIncidents >= 50) return 'Alto';
    if (totalIncidents >= 20) return 'Medio';
    return 'Bajo';
}

function createStationPopup(stationName, data, securityLevel) {
    const typesHtml = Object.entries(data.types)
        .map(([type, count]) => `<li>${type}: ${count} reportes</li>`)
        .join('');

    return `
        <div class="station-popup">
            <h3>${stationName}</h3>
            <p><strong>Total de reportes:</strong> ${data.total}</p>
            <p><strong>Nivel de inseguridad:</strong> <span class="security-level-${securityLevel.toLowerCase()}">${securityLevel}</span></p>
            <h4>Tipos de incidentes:</h4>
            <ul>${typesHtml}</ul>
        </div>
    `;
}

function initializeFilters(stations, incidents) {
    // Poblar filtro de estaciones
    const stationFilter = document.getElementById('stationFilter');
    const uniqueStations = [...new Set(stations.map(s => s.nombre))].sort();
    stationFilter.innerHTML = '<option value="all">Todas las Estaciones</option>' +
        uniqueStations.map(station => `<option value="${station}">${station}</option>`).join('');

    // Poblar filtro de tipos de incidentes
    const typeFilter = document.getElementById('incidentTypeFilter');
    const uniqueTypes = [...new Set(incidents.map(i => i.incident_type))].sort();
    typeFilter.innerHTML = '<option value="all">Todos los tipos</option>' +
        uniqueTypes.map(type => `<option value="${type}">${type}</option>`).join('');
}

function updateChart(incidents) {
    const ctx = document.getElementById('incidentChart');
    if (!ctx) return;

    // Agrupar por tipo de incidente
    const typeStats = {};
    incidents.forEach(incident => {
        typeStats[incident.incident_type] = (typeStats[incident.incident_type] || 0) + 1;
    });

    // Ordenar por cantidad
    const sortedStats = Object.entries(typeStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5); // Mostrar solo los 5 tipos más comunes

    if (currentChart) {
        currentChart.destroy();
    }

    currentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedStats.map(([type]) => type),
            datasets: [{
                label: 'Número de Incidentes',
                data: sortedStats.map(([,count]) => count),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(54, 162, 235, 0.8)',
                    'rgba(255, 206, 86, 0.8)',
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(153, 102, 255, 0.8)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Top 5 Tipos de Incidentes'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Cantidad de Reportes'
                    }
                }
            }
        }
    });
}

function applyFilters() {
    loadMapData();
}

function resetFilters() {
    document.getElementById('troncalFilter').value = 'all';
    document.getElementById('stationFilter').value = 'all';
    document.getElementById('incidentTypeFilter').value = 'all';
    document.getElementById('securityLevelFilter').value = 'all';
    loadMapData();
}
