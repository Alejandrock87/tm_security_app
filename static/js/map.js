
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
        console.error('Error al cargar los datos:', error.message);
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

function createHourlyChart(hourlyData) {
    const ctx = document.getElementById('hourlyChart');
    if (!ctx) return;
    
    if (window.hourlyChart) {
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
    
    if (window.incidentTypeChart) {
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
    
    stations.forEach(station => {
        if (station.troncal && !troncales.has(station.troncal)) {
            troncales.add(station.troncal);
            const option = document.createElement('option');
            option.value = station.troncal;
            option.textContent = station.troncal;
            troncalSelect.appendChild(option);
        }
        
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
}

function applyFilters() {
    const date = document.getElementById('dateFilter').value;
    const time = document.getElementById('timeFilter').value;
    const type = document.getElementById('incidentTypeFilter').value;
    const level = document.getElementById('securityLevelFilter').value;
    const troncal = document.getElementById('troncalFilter').value;
    const station = document.getElementById('stationFilter').value;

    let filteredIncidents = [...incidents];

    if (date) {
        filteredIncidents = filteredIncidents.filter(i => i.timestamp.includes(date));
    }
    if (time) {
        filteredIncidents = filteredIncidents.filter(i => {
            const incidentTime = i.timestamp.split('T')[1].substring(0, 5);
            return incidentTime === time;
        });
    }
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
    clearMap();

    if (selectedStation) {
        const stationIncidents = filteredIncidents.filter(
            incident => incident.nearest_station === selectedStation
        );
        stationIncidents.forEach(addIncidentToMap);
    } else {
        filteredIncidents.forEach(addIncidentToMap);
    }

    if (filteredIncidents.length === 1) {
        map.setView([filteredIncidents[0].latitude, filteredIncidents[0].longitude], 15);
    }
}

function addIncidentToMap(incident) {
    const marker = L.marker([incident.latitude, incident.longitude])
        .bindPopup(`
            <b>Tipo:</b> ${incident.incident_type}<br>
            <b>Fecha:</b> ${new Date(incident.timestamp).toLocaleDateString()}<br>
            <b>Hora:</b> ${new Date(incident.timestamp).toLocaleTimeString()}<br>
            <b>Estación:</b> ${incident.nearest_station}
        `);
    markers.push(marker);
    marker.addTo(map);
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
        if (selectedStation === station) {
            item.classList.add('active');
        }
        item.innerHTML = `
            <div class="d-flex w-100 justify-content-between">
                <h5 class="mb-1">${station}</h5>
                <small>${stationIncidents.length} incidente(s)</small>
            </div>
            <p class="mb-1">Nivel de Inseguridad: ${getSecurityLevel(station)}</p>
        `;
        item.onclick = () => {
            selectedStation = station;
            const markers = stationIncidents.map(incident => 
                addIncidentToMap(incident)
            );
            if (stationIncidents.length > 0) {
                const firstIncident = stationIncidents[0];
                map.setView([firstIncident.latitude, firstIncident.longitude], 15);
            }
            updateIncidentsList(filteredIncidents);
        };
        listContainer.appendChild(item);
    });
}

function createChart(data) {
    const ctx = document.getElementById('incidentChart');
    if (!ctx) return;
    
    if (window.incidentChart) {
        window.incidentChart.destroy();
    }

    const incidents = data.incidents_by_type || {};
    const labels = Object.keys(incidents);
    const values = Object.values(incidents);

    window.incidentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Número de Incidentes',
                data: values,
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
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

function getSecurityLevel(stationName) {
    const count = stationSecurityLevels[stationName] || 0;
    if (count > 5) return 'Alto';
    if (count >= 2) return 'Medio';
    return 'Bajo';
}

document.addEventListener('DOMContentLoaded', initMap);
