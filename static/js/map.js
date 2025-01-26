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

async function loadMapData(filters = {}) {
    try {
        const [stationsResponse, incidentsResponse] = await Promise.all([
            fetch('/api/stations'),
            fetch(`/incidents${buildQueryString(filters)}`)
        ]);

        function buildQueryString(filters) {
            if (!filters || Object.keys(filters).length === 0) return '';
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value && value !== 'all') params.append(key, value);
            });
            return params.toString() ? `?${params.toString()}` : '';
        }

        let stations = await stationsResponse.json();
        const incidents = await incidentsResponse.json();

        // Filter stations based on selected filters
        if (filters.troncal && filters.troncal !== 'all') {
            stations = stations.filter(station => station.troncal === filters.troncal);
        }
        if (filters.station && filters.station !== 'all') {
            stations = stations.filter(station => station.nombre === filters.station);
        }

        // Clear existing markers
        markers.forEach(marker => map.removeLayer(marker));
        markers = [];

        const incidentsByStation = groupIncidentsByStation(incidents);
        displayStations(stations, incidentsByStation);
        updateChart(incidents);

        // Adjust map view to show all filtered stations
        if (stations.length > 0) {
            const bounds = L.latLngBounds(stations.map(station => [station.latitude, station.longitude]));
            map.fitBounds(bounds, { padding: [50, 50] });
        }

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

async function loadTroncales() {
    try {
        const response = await fetch('/api/stations');
        const stations = await response.json();
        const troncales = [...new Set(stations.map(station => station.troncal))].filter(Boolean).sort();
        
        const troncalSelect = document.getElementById('troncalFilter');
        troncalSelect.innerHTML = '<option value="all">Todas las Troncales</option>';
        troncales.forEach(troncal => {
            troncalSelect.innerHTML += `<option value="${troncal}">${troncal}</option>`;
        });
    } catch (error) {
        console.error('Error loading troncales:', error);
    }
}

async function loadStations(troncal = 'all') {
    try {
        const response = await fetch('/api/stations');
        const stations = await response.json();
        let filteredStations = stations;
        
        if (troncal !== 'all') {
            filteredStations = stations.filter(station => station.troncal === troncal);
        }
        
        const stationSelect = document.getElementById('stationFilter');
        stationSelect.innerHTML = '<option value="all">Todas las Estaciones</option>';
        filteredStations.sort((a, b) => a.nombre.localeCompare(b.nombre)).forEach(station => {
            stationSelect.innerHTML += `<option value="${station.nombre}">${station.nombre}</option>`;
        });
    } catch (error) {
        console.error('Error loading stations:', error);
    }
}

function applyFilters() {
    const filters = {};
    
    if (document.getElementById('enableTroncalFilter').checked) {
        filters.troncal = document.getElementById('troncalFilter').value;
    }
    if (document.getElementById('enableStationFilter').checked) {
        filters.station = document.getElementById('stationFilter').value;
    }
    if (document.getElementById('enableIncidentTypeFilter').checked) {
        filters.incidentType = document.getElementById('incidentTypeFilter').value;
    }
    if (document.getElementById('enableSecurityLevelFilter').checked) {
        filters.securityLevel = document.getElementById('securityLevelFilter').value;
    }
    
    loadMapData(filters);
}

async function loadStations(troncal = 'all') {
    try {
        const response = await fetch('/api/stations');
        const stations = await response.json();
        let filteredStations = stations;
        
        if (troncal !== 'all') {
            filteredStations = stations.filter(station => station.troncal === troncal);
        }
        
        const stationSelect = document.getElementById('stationFilter');
        stationSelect.innerHTML = '<option value="all">Todas las Estaciones</option>';
        filteredStations
            .sort((a, b) => a.nombre.localeCompare(b.nombre))
            .forEach(station => {
                if (station.nombre) {
                    stationSelect.innerHTML += `<option value="${station.nombre}">${station.nombre}</option>`;
                }
            });
    } catch (error) {
        console.error('Error loading stations:', error);
    }
}

async function loadTroncales() {
    try {
        const response = await fetch('/api/stations');
        const stations = await response.json();
        const troncales = [...new Set(stations.map(station => station.troncal))]
            .filter(Boolean)
            .sort();
        
        const troncalSelect = document.getElementById('troncalFilter');
        troncalSelect.innerHTML = '<option value="all">Todas las Troncales</option>';
        troncales.forEach(troncal => {
            if (troncal && troncal !== 'N/A') {
                troncalSelect.innerHTML += `<option value="${troncal}">${troncal}</option>`;
            }
        });

        // Load all stations initially
        await loadStations();
    } catch (error) {
        console.error('Error loading troncales:', error);
    }
}

// Initialize checkboxes on page load
document.addEventListener('DOMContentLoaded', function() {
    loadTroncales();
    
    // Add event listener for troncal changes
    document.getElementById('troncalFilter').addEventListener('change', function() {
        if (document.getElementById('enableTroncalFilter').checked) {
            loadStations(this.value);
        }
    });

    // Add event listeners for filter checkboxes
    document.getElementById('enableTroncalFilter').addEventListener('change', function() {
        if (!this.checked) {
            loadStations('all');
        } else if (document.getElementById('troncalFilter').value !== 'all') {
            loadStations(document.getElementById('troncalFilter').value);
        }
    });
});

function resetFilters() {
    document.getElementById('troncalFilter').value = 'all';
    document.getElementById('stationFilter').value = 'all';
    document.getElementById('incidentTypeFilter').value = 'all';
    document.getElementById('securityLevelFilter').value = 'all';
    loadMapData();
}

// Event listeners for filters
document.addEventListener('DOMContentLoaded', function() {
    loadTroncales();
    
    document.getElementById('troncalFilter').addEventListener('change', function() {
        loadStations(this.value);
    });
});