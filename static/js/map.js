let map;
let markers = [];
let currentChart = null;

document.addEventListener('DOMContentLoaded', function() {
    initMap();
    loadStations();
});

function initMap() {
    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    map = L.map('map').setView([4.6097, -74.0817], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
}

let stationsData = null;
let incidentsData = null;

async function loadStations() {
    try {
        if (!stationsData) {
            const stationsResponse = await fetch('/api/stations');
            stationsData = await stationsResponse.json();
        }
        
        const incidentsResponse = await fetch('/incidents');
        incidentsData = await incidentsResponse.json();

        const stations = await stationsResponse.json();
        const incidents = await incidentsResponse.json();

        // Agrupar incidentes por estación
        const incidentsByStation = {};
        incidents.forEach(incident => {
            if (!incidentsByStation[incident.nearest_station]) {
                incidentsByStation[incident.nearest_station] = {
                    total: 0,
                    types: {},
                    hourCount: Array(24).fill(0)
                };
            }
            incidentsByStation[incident.nearest_station].total++;

            // Contar por tipo de incidente
            if (!incidentsByStation[incident.nearest_station].types[incident.incident_type]) {
                incidentsByStation[incident.nearest_station].types[incident.incident_type] = 0;
            }
            incidentsByStation[incident.nearest_station].types[incident.incident_type]++;

            // Contar por hora
            const hour = new Date(incident.timestamp).getHours();
            incidentsByStation[incident.nearest_station].hourCount[hour]++;
        });

        // Crear marcadores de estaciones
        stations.forEach(station => {
            const stationStats = incidentsByStation[station.nombre] || { total: 0, types: {}, hourCount: Array(24).fill(0) };
            const mostDangerousHour = stationStats.hourCount.indexOf(Math.max(...stationStats.hourCount));

            const marker = L.marker([station.latitude, station.longitude])
                .bindPopup(createPopupContent(station.nombre, stationStats, mostDangerousHour))
                .addTo(map);

            markers.push(marker);
        });
    } catch (error) {
        console.error('Error loading map data:', error);
    }
}

function createPopupContent(stationName, stats, mostDangerousHour) {
    const typesHtml = Object.entries(stats.types)
        .sort(([,a], [,b]) => b - a)
        .map(([type, count]) => `<li>${type}: ${count} reportes</li>`)
        .join('');

    return `
        <div class="station-popup">
            <h3>${stationName}</h3>
            <p><strong>Total de reportes:</strong> ${stats.total}</p>
            <p><strong>Hora más insegura:</strong> ${mostDangerousHour}:00</p>
            <h4>Tipos de incidentes:</h4>
            <ul>${typesHtml}</ul>
        </div>
    `;
}