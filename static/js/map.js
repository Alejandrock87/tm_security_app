let map = null;
let markers = [];
let stationMarkers = [];
let stationsLayer = null;
let routesLayer = null;
let troncales = new Set();
let mapInitialized = false;
let stationSecurityLevels = {};
let incidents = [];
let selectedStation = null;

function updateStatistics(filteredIncidents) {
    // Calculate critical hours
    const hourCounts = {};
    filteredIncidents.forEach(incident => {
        const hour = new Date(incident.timestamp).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    // Calculate incident types
    const typeCounts = {};
    filteredIncidents.forEach(incident => {
        typeCounts[incident.incident_type] = (typeCounts[incident.incident_type] || 0) + 1;
    });

    // Update chart
    createChart({ incidents_by_type: typeCounts });

    // Update critical hours display
    const criticalHoursDiv = document.getElementById('criticalHours');
    if (criticalHoursDiv) {
        const sortedHours = Object.entries(hourCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);
        criticalHoursDiv.innerHTML = sortedHours
            .map(([hour, count]) => 
                `<div>${hour}:00 - ${Number(hour)+1}:00: ${count} incidentes</div>`)
            .join('');
    }
}

function initMap() {
    if (mapInitialized) return;

    map = L.map('map').setView([4.6097, -74.0817], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Initialize statistics on load
    fetchInitialData().then(() => {
        updateStatistics(incidents);
    });

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

        if (!statsResponse.ok || !incidentsResponse.ok || !stationsResponse.ok) {
            throw new Error('Error en la respuesta del servidor');
        }

        const [stationStats, incidentsData, stationsData] = await Promise.all([
            statsResponse.json(),
            incidentsResponse.json(),
            stationsResponse.json()
        ]);

        stationSecurityLevels = stationStats;
        incidents = incidentsData;

        // Update statistics immediately with all incidents
        updateStatistics(incidents);

        // Create hourly statistics chart
        const hourlyData = processHourlyData(incidents);
        createHourlyChart(hourlyData);

        // Create incident types chart
        const typeData = processIncidentTypes(incidents);
        createIncidentTypeChart(typeData);

        populateFilters(incidents, stationsData);
        updateMap(incidents);
        updateIncidentsList(incidents);
    } catch (error) {
        console.error('Error al cargar los datos:', error);
    }
}

function processHourlyData(incidents) {
    const hourCounts = {};
    incidents.forEach(incident => {
        const hour = new Date(incident.timestamp).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    return hourCounts;
}

function processIncidentTypes(incidents) {
    const typeCounts = {};
    incidents.forEach(incident => {
        typeCounts[incident.incident_type] = (typeCounts[incident.incident_type] || 0) + 1;
    });
    return typeCounts;
}

function createChart(data) {
    const ctx = document.getElementById('incidentChart');
    if (!ctx) return;

    // Get existing chart instance using Chart.js API
    const existingChart = Chart.getChart(ctx);
    if (existingChart) {
        existingChart.destroy();
    }

    const incidents = data.incidents_by_type || {};
    const labels = Object.keys(incidents);
    const values = Object.values(incidents);

    const chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
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
                    position: 'right',
                    labels: {
                        padding: 20,
                        font: {
                            size: 12
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Distribución de Incidentes por Tipo',
                    font: {
                        size: 16
                    }
                }
            }
        }
    });
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

    // Populate troncales and stations
    const troncalSelect = document.getElementById('troncalFilter');
    const stationSelect = document.getElementById('stationFilter');

    troncalSelect.innerHTML = '<option value="all">Todas las Troncales</option>';
    stationSelect.innerHTML = '<option value="all">Todas las Estaciones</option>';

    // Asegurarse de que las troncales se carguen correctamente
    const uniqueTroncales = new Set();
    stations.forEach(station => {
        if (station.troncal && station.troncal.trim() !== '') {
            uniqueTroncales.add(station.troncal.trim());
        }
    });

    // Ordenar troncales alfabéticamente
    const sortedTroncales = Array.from(uniqueTroncales).sort();
    
    sortedTroncales.forEach(troncal => {
        const option = document.createElement('option');
        option.value = troncal;
        option.textContent = troncal;
        troncalSelect.appendChild(option);
    });

        const stationOption = document.createElement('option');
        stationOption.value = station.nombre;
        stationOption.textContent = station.nombre;
        stationSelect.appendChild(stationOption);
    });
}

function clearMap() {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    const incidentsList = document.getElementById('incidentsList');
    if (incidentsList) incidentsList.innerHTML = '';
}

function resetFilters() {
    document.getElementById('dateFilter').value = '';
    document.getElementById('timeFilter').value = '';
    document.getElementById('incidentTypeFilter').value = 'all';
    document.getElementById('securityLevelFilter').value = 'all';
    document.getElementById('troncalFilter').value = 'all';
    document.getElementById('stationFilter').value = 'all';
    clearMap();
    selectedStation = null;
    applyFilters();
}

function applyFilters() {
    const type = document.getElementById('incidentTypeFilter').value;
    const level = document.getElementById('securityLevelFilter').value;
    const troncal = document.getElementById('troncalFilter').value;
    const station = document.getElementById('stationFilter').value;

    let filteredIncidents = [...incidents];

    if (type !== 'all') {
        filteredIncidents = filteredIncidents.filter(i => i.incident_type === type);
    }
    if (level !== 'all') {
        filteredIncidents = filteredIncidents.filter(i => getSecurityLevel(i.nearest_station) === level);
    }
    if (troncal !== 'all') {
        filteredIncidents = filteredIncidents.filter(i => i.troncal === troncal);
    }
    if (station !== 'all') {
        filteredIncidents = filteredIncidents.filter(i => i.nearest_station === station);
    }

    updateMap(filteredIncidents);
    updateIncidentsList(filteredIncidents);
    updateStatistics(filteredIncidents);
}

function updateMap(filteredIncidents) {
    if (!map) return;
    clearMap();

    if (Array.isArray(filteredIncidents) && filteredIncidents.length > 0) {
        filteredIncidents.forEach(addIncidentToMap);

        if (filteredIncidents.length === 1) {
            map.setView([filteredIncidents[0].latitude, filteredIncidents[0].longitude], 15);
        } else {
            map.setView([4.6097, -74.0817], 11);
        }
    }
}

function addIncidentToMap(incident) {
    const securityLevel = getSecurityLevel(incident.nearest_station);
    const markerColor = getMarkerColor(securityLevel);

    const marker = L.circleMarker([incident.latitude, incident.longitude], {
        radius: 8,
        fillColor: markerColor,
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    }).bindPopup(`
        <b>Tipo:</b> ${incident.incident_type}<br>
        <b>Fecha:</b> ${new Date(incident.timestamp).toLocaleDateString()}<br>
        <b>Hora:</b> ${new Date(incident.timestamp).toLocaleTimeString()}<br>
        <b>Estación:</b> ${incident.nearest_station}<br>
        <b>Nivel de Inseguridad:</b> ${securityLevel}
    `);
    markers.push(marker);
    marker.addTo(map);
}

function getMarkerColor(securityLevel) {
    switch (securityLevel) {
        case 'Alto':
            return '#ff0000';
        case 'Medio':
            return '#ffa500';
        case 'Bajo':
            return '#008000';
        default:
            return '#808080';
    }
}

function getSecurityLevel(stationName) {
    const count = stationSecurityLevels[stationName] || 0;
    if (count > 5) return 'Alto';
    if (count >= 2) return 'Medio';
    return 'Bajo';
}

function updateIncidentsList(filteredIncidents) {
    const listContainer = document.getElementById('incidentsList');
    listContainer.innerHTML = '';

    const groupedIncidents = {};
    filteredIncidents.forEach(incident => {
        if (!groupedIncidents[incident.nearest_station]) {
            groupedIncidents[incident.nearest_station] = [];
        }
        groupedIncidents[incident.nearest_station].push(incident);
    });

    Object.entries(groupedIncidents).forEach(([station, stationIncidents]) => {
        const item = document.createElement('a');
        item.className = 'list-group-item list-group-item-action';
        const securityLevel = getSecurityLevel(station);
        item.innerHTML = `
            <div class="d-flex w-100 justify-content-between">
                <h5 class="mb-1">${station}</h5>
                <small>${stationIncidents.length} incidente(s)</small>
            </div>
            <p class="mb-1">Nivel de Inseguridad: ${securityLevel}</p>
        `;
        listContainer.appendChild(item);
    });
}

function createHourlyChart(hourlyData) {
    const ctx = document.getElementById('hourlyChart');
    if (!ctx) return;
    
    // Verificar si existe el gráfico anterior y si tiene el método destroy
    if (window.hourlyChart && typeof window.hourlyChart.destroy === 'function') {
        window.hourlyChart.destroy();
    }

    const hours = Array.from({length: 24}, (_, i) => i);
    const data = hours.map(hour => hourlyData[hour] || 0);

    window.hourlyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: hours.map(h => `${h}:00`),
            datasets: [{
                label: 'Incidentes por Hora',
                data: data,
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function createIncidentTypeChart(typeData) {
    const ctx = document.getElementById('incidentTypeChart');
    if (!ctx) return;
    
    if (window.incidentTypeChart && typeof window.incidentTypeChart.destroy === 'function') {
        window.incidentTypeChart.destroy();
    }

    window.incidentTypeChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(typeData),
            datasets: [{
                data: Object.values(typeData),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.2)',
                    'rgba(54, 162, 235, 0.2)',
                    'rgba(255, 206, 86, 0.2)',
                    'rgba(75, 192, 192, 0.2)',
                    'rgba(153, 102, 255, 0.2)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)'
                ],
                borderWidth: 1
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


document.addEventListener('DOMContentLoaded', initMap);