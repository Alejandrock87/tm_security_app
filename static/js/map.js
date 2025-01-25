let map;
let markers = [];
let currentChart = null;

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

async function loadIncidentData(filters = {}) {
    try {
        // Validar y limpiar los filtros
        const cleanFilters = {
            troncal: filters.troncal && filters.troncal !== 'all' ? filters.troncal : undefined,
            station: filters.station && filters.station !== 'all' ? filters.station : undefined,
            incident_type: filters.incidentType && filters.incidentType !== 'all' ? filters.incidentType : undefined,
            security_level: filters.securityLevel && filters.securityLevel !== 'all' ? filters.securityLevel : undefined
        };

        // Construir query params solo con filtros válidos
        const queryParams = new URLSearchParams(
            Object.entries(cleanFilters)
                .filter(([_, value]) => value !== undefined)
                .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})
        );

        const response = await fetch(`/incidents?${queryParams}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (Array.isArray(data) && data.length > 0) {
            updateMap(data);
            createChart(data);
        } else {
            console.log('No se encontraron incidentes con los filtros especificados');
            // Limpiar el mapa y el gráfico cuando no hay datos
            clearMap();
            createEmptyChart();
        }
    } catch (error) {
        console.error('Error loading map data:', error);
        clearMap();
        createEmptyChart();
    }
}

function clearMap() {
    if (markers) {
        markers.forEach(marker => map.removeLayer(marker));
        markers = [];
    }
}

function createEmptyChart() {
    const ctx = document.getElementById('incidentChart');
    if (!ctx) return;

    if (currentChart) {
        currentChart.destroy();
    }

    currentChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Sin datos'],
            datasets: [{
                data: [1],
                backgroundColor: ['#e0e0e0']
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

    // Destruir el gráfico existente si hay uno
    if (currentChart) {
        currentChart.destroy();
    }

    const incidents = {};
    data.forEach(incident => {
        incidents[incident.incident_type] = (incidents[incident.incident_type] || 0) + 1;
    });

    currentChart = new Chart(ctx, {
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