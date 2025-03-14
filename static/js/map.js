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
        console.log("Iniciando carga de datos del mapa...");
        const [stationsResponse, incidentsResponse] = await Promise.all([
            fetch('/api/stations'),
            fetch(`/incidents${buildQueryString(filters)}`)
        ]);

        let stations = await stationsResponse.json();
        const incidents = await incidentsResponse.json();
        console.log("Datos de estaciones recibidos:", stations);
        console.log("Datos de incidentes recibidos:", incidents);

        // Agrupar incidentes por estación
        const incidentsByStation = {};
        incidents.forEach(incident => {
            if (!incidentsByStation[incident.nearest_station]) {
                incidentsByStation[incident.nearest_station] = {
                    total: incident.station_total_incidents,
                    incidents: [],
                    types: {}
                };
            }
            incidentsByStation[incident.nearest_station].incidents.push(incident);

            // Contar tipos de incidentes
            if (!incidentsByStation[incident.nearest_station].types[incident.incident_type]) {
                incidentsByStation[incident.nearest_station].types[incident.incident_type] = 0;
            }
            incidentsByStation[incident.nearest_station].types[incident.incident_type]++;
        });

        console.log("Incidentes agrupados por estación:", incidentsByStation);

        // Aplicar filtros
        if (filters.troncal && filters.troncal !== 'all') {
            stations = stations.filter(station => station.troncal === filters.troncal);
        }
        if (filters.station && filters.station !== 'all') {
            stations = stations.filter(station => station.nombre === filters.station);
        }
        if (filters.incidentType && filters.incidentType !== 'all') {
            stations = stations.filter(station =>
                incidentsByStation[station.nombre]?.incidents?.some(
                    incident => incident.incident_type === filters.incidentType
                )
            );
        }

        // Limpiar marcadores existentes
        markers.forEach(marker => map.removeLayer(marker));
        markers = [];

        displayStations(stations, incidentsByStation);
        updateChart(incidents);

        // Ajustar vista del mapa
        if (stations.length > 0) {
            const bounds = L.latLngBounds(stations.map(station => [station.latitude, station.longitude]));
            map.fitBounds(bounds, { padding: [50, 50] });
        }

    } catch (error) {
        console.error('Error loading map data:', error);
        clearMarkers();
        showError('No hay datos disponibles para los filtros seleccionados');
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
        const totalIncidents = parseInt(stationData.total) || 0;
        const securityLevel = calculateSecurityLevel(totalIncidents);
        const markerColor = getMarkerColor(totalIncidents);

        console.log(`Procesando estación: ${station.nombre}`);
        console.log(`Total de incidentes: ${totalIncidents}`);
        console.log(`Nivel de seguridad: ${securityLevel}`);
        console.log(`Color asignado: ${markerColor}`);

        const marker = L.marker([station.latitude, station.longitude], {
            icon: L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="background-color: ${markerColor}; width: 30px; height: 30px; border-radius: 50%; border: 2px solid white; display: flex; justify-content: center; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                        <span style="color: white; font-weight: bold; font-size: 14px;">🚍</span>
                      </div>
                      <div style="background-color: rgba(255,255,255,0.95); padding: 2px 4px; border-radius: 3px; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; position: absolute; left: 50%; transform: translateX(-50%); bottom: 0; margin-top: 0; z-index: 1000; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                        <span style="font-size: 11px; font-weight: bold; color: #2d3436;">${station.nombre}</span>
                      </div>`,
                iconSize: [30, 70],
                iconAnchor: [15, 35],
                popupAnchor: [0, -35]
            })
        })
        .bindPopup(createStationPopup(station.nombre, stationData, securityLevel))
        .addTo(map);

        marker.on('click', () => {
            console.log(`Estación clickeada: ${station.nombre}`);
            console.log(`Datos de la estación:`, stationData);
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
    const typesHtml = Object.entries(data.types || {})
        .sort(([,a], [,b]) => b - a) // Ordenar por cantidad de incidentes
        .map(([type, count]) => `<li>${type}: ${count} reportes</li>`)
        .join('');

    const totalIncidents = parseInt(data.total) || 0;
    const colorClass = totalIncidents >= 50 ? 'high' : 
                      totalIncidents >= 20 ? 'medium' : 'low';

    return `
        <div class="station-popup">
            <h3>${stationName}</h3>
            <p><strong>Total de reportes:</strong> <span class="total-${colorClass}">${totalIncidents}</span></p>
            <p><strong>Nivel de inseguridad:</strong> <span class="security-level-${securityLevel.toLowerCase()}">${securityLevel}</span></p>
            <h4>Tipos de incidentes:</h4>
            <ul class="incident-list">${typesHtml}</ul>
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

function getMarkerColor(totalIncidents) {
    if (totalIncidents >= 50) return '#ff0000'; // Alto - Rojo
    if (totalIncidents >= 20) return '#ffa500'; // Medio - Naranja
    return '#008000'; // Bajo - Verde
}

function buildQueryString(filters) {
    if (!filters || Object.keys(filters).length === 0) return '';
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') params.append(key, value);
    });
    return params.toString() ? `?${params.toString()}` : '';
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
        throw error;
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
        const incidentType = document.getElementById('incidentTypeFilter').value;
        if (incidentType !== 'all') {
            filters.incidentType = incidentType;
        }
    }
    if (document.getElementById('enableSecurityLevelFilter').checked) {
        const securityLevel = document.getElementById('securityLevelFilter').value;
        if (securityLevel !== 'all') {
            filters.securityLevel = securityLevel;
        }
    }

    loadMapData(filters);
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
    // Reset filter values
    document.getElementById('troncalFilter').value = 'all';
    document.getElementById('stationFilter').value = 'all';
    document.getElementById('incidentTypeFilter').value = 'all';
    document.getElementById('securityLevelFilter').value = 'all';

    // Reset checkboxes
    document.getElementById('enableTroncalFilter').checked = false;
    document.getElementById('enableStationFilter').checked = false;
    document.getElementById('enableIncidentTypeFilter').checked = false;
    document.getElementById('enableSecurityLevelFilter').checked = false;

    loadMapData();
}

// Event listeners for filters (redundant, removed one)

function clearMarkers() {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
}

function showError(message) {
    // Implement your error display logic here
    alert(message); // A simple alert for now.  Replace with more sophisticated error handling.
}