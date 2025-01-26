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

        markers.forEach(marker => map.removeLayer(marker));
        markers = [];

        const incidentsByStation = groupIncidentsByStation(incidents);
        displayStations(stations, incidentsByStation);
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
        const markerColor = getMarkerColor(stationData.total);

        const marker = L.marker([station.latitude, station.longitude], {
            icon: L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="background-color: ${markerColor}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; display: flex; justify-content: center; align-items: center;">
                        <span style="color: white; font-weight: bold;">T</span>
                      </div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            })
        })
        .bindPopup(createStationPopup(station.nombre, stationData, securityLevel))
        .addTo(map);

        marker.on('click', () => {
            updateChart(stationData.incidents || []);
        });

        markers.push(marker);
    });

    function getMarkerColor(totalIncidents) {
        if (totalIncidents >= 50) return '#ff0000'; // Alto - Rojo
        if (totalIncidents >= 20) return '#ffa500'; // Medio - Naranja
        return '#008000'; // Bajo - Verde
    }
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

function updateChart(incidents) {
    const ctx = document.getElementById('incidentChart');
    if (!ctx) return;

    const typeStats = {};
    incidents.forEach(incident => {
        typeStats[incident.incident_type] = (typeStats[incident.incident_type] || 0) + 1;
    });

    const sortedStats = Object.entries(typeStats).sort(([,a], [,b]) => b - a);
    const total = sortedStats.reduce((sum, [,count]) => sum + count, 0);

    const data = sortedStats.map(([type, count]) => ({
        type,
        count,
        percentage: ((count / total) * 100).toFixed(1)
    }));

    if (window.currentChart) {
        window.currentChart.destroy();
        window.currentChart = null;
    }

    window.currentChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(item => `${item.type} (${item.percentage}%)`),
            datasets: [{
                data: data.map(item => item.count),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(54, 162, 235, 0.8)',
                    'rgba(255, 206, 86, 0.8)',
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(153, 102, 255, 0.8)',
                    'rgba(255, 159, 64, 0.8)'
                ],
                borderColor: 'white',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        padding: 20,
                        font: {
                            size: 11
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Distribución de Incidentes',
                    font: {
                        size: 16,
                        weight: 'bold'
                    },
                    padding: {
                        top: 10,
                        bottom: 20
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            return `${label}: ${value} incidentes`;
                        }
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