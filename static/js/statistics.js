
// Variables globales para los gráficos
let charts = {
    hourlyHeatmap: null,
    incidentTypes: null,
    topStations: null
};

async function loadStatistics() {
    try {
        const filters = getFilters();
        const queryParams = new URLSearchParams(filters);
        const response = await fetch('/api/statistics?' + queryParams.toString());
        const data = await response.json();
        if (data.error) {
            console.error('Error from server:', data.error);
            return;
        }
        updateCharts(data);
        updateSummaryCards(data);
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

async function loadFilters() {
    try {
        // Cargar datos de estaciones y troncales
        const response = await fetch('/static/Estaciones_Troncales_de_TRANSMILENIO.geojson');
        const data = await response.json();
        
        // Cargar troncales únicas
        const troncales = [...new Set(data.features
            .map(f => f.properties.troncal_estacion)
            .filter(Boolean))].sort();
        
        const troncalSelect = document.getElementById('troncalFilter');
        troncalSelect.innerHTML = '<option value="all">Todas</option>';
        troncales.forEach(troncal => {
            const option = document.createElement('option');
            option.value = troncal;
            option.textContent = troncal;
            troncalSelect.appendChild(option);
        });

        // Cargar estaciones
        const stations = [...new Set(data.features
            .map(f => f.properties.nombre_estacion)
            .filter(Boolean))].sort();
        
        const stationSelect = document.getElementById('stationFilter');
        stationSelect.innerHTML = '<option value="all">Todas</option>';
        stations.forEach(station => {
            const option = document.createElement('option');
            option.value = station;
            option.textContent = station;
            stationSelect.appendChild(option);
        });

        // Cargar tipos de incidentes
        const response2 = await fetch('/incidents');
        const incidents = await response2.json();
        const incidentTypes = [...new Set(incidents.map(i => i.incident_type))].sort();
        
        const incidentSelect = document.getElementById('incidentTypeFilter');
        incidentSelect.innerHTML = '<option value="all">Todos</option>';
        incidentTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            incidentSelect.appendChild(option);
        });

        // Evento para actualizar estaciones cuando cambia la troncal
        troncalSelect.addEventListener('change', () => {
            const selectedTroncal = troncalSelect.value;
            stationSelect.innerHTML = '<option value="all">Todas</option>';
            
            if (selectedTroncal !== 'all') {
                const filteredStations = data.features
                    .filter(f => f.properties.troncal_estacion === selectedTroncal)
                    .map(f => f.properties.nombre_estacion)
                    .sort();
                
                filteredStations.forEach(station => {
                    const option = document.createElement('option');
                    option.value = station;
                    option.textContent = station;
                    stationSelect.appendChild(option);
                });
            } else {
                stations.forEach(station => {
                    const option = document.createElement('option');
                    option.value = station;
                    option.textContent = station;
                    stationSelect.appendChild(option);
                });
            }
        });

        // Cargar estadísticas iniciales
        await loadStatistics();
    } catch (error) {
        console.error('Error cargando filtros:', error);
    }
}

function getFilters() {
    return {
        dateFrom: document.getElementById('dateFromFilter').value,
        dateTo: document.getElementById('dateToFilter').value,
        timeFrom: document.getElementById('timeFromFilter').value,
        timeTo: document.getElementById('timeToFilter').value,
        incidentType: document.getElementById('incidentTypeFilter').value,
        troncal: document.getElementById('troncalFilter').value,
        station: document.getElementById('stationFilter').value
    };
}

function updateSummaryCards(data) {
    document.getElementById('totalIncidents').textContent = data.total_incidents || 0;
    document.getElementById('mostAffectedStation').textContent = data.most_affected_station || '-';
    document.getElementById('mostDangerousHour').textContent = data.most_dangerous_hour || '-';
    document.getElementById('mostCommonType').textContent = data.most_common_type || '-';
}

function updateCharts(data) {
    updateHourlyHeatmap(data.hourly_stats || {});
    updateIncidentTypesChart(data.incident_types || {});
    updateTopStationsChart(data.top_stations || {});
}

function updateHourlyHeatmap(hourlyData) {
    const ctx = document.getElementById('hourlyHeatmap').getContext('2d');
    
    if (charts.hourlyHeatmap) {
        charts.hourlyHeatmap.destroy();
    }

    const hours = Array.from({length: 24}, (_, i) => `${i}:00`);
    const datasets = Object.entries(hourlyData).map(([day, values]) => ({
        label: day,
        data: hours.map(hour => values[parseInt(hour)] || 0),
        borderWidth: 1
    }));

    charts.hourlyHeatmap = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: hours,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    display: window.innerWidth > 768
                }
            }
        }
    });
}

function updateIncidentTypesChart(typeData) {
    const ctx = document.getElementById('incidentTypesChart').getContext('2d');
    
    if (charts.incidentTypes) {
        charts.incidentTypes.destroy();
    }

    charts.incidentTypes = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(typeData),
            datasets: [{
                data: Object.values(typeData),
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
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: window.innerWidth > 768 ? 'right' : 'bottom',
                    labels: {
                        boxWidth: 12,
                        padding: 10
                    }
                }
            }
        }
    });
}

function updateTopStationsChart(stationData) {
    const ctx = document.getElementById('topStationsChart').getContext('2d');
    
    if (charts.topStations) {
        charts.topStations.destroy();
    }

    charts.topStations = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(stationData),
            datasets: [{
                label: 'Incidentes',
                data: Object.values(stationData),
                backgroundColor: '#36A2EB'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function resetFilters() {
    document.getElementById('dateFromFilter').value = '';
    document.getElementById('dateToFilter').value = '';
    document.getElementById('timeFromFilter').value = '';
    document.getElementById('timeToFilter').value = '';
    document.getElementById('incidentTypeFilter').value = 'all';
    document.getElementById('troncalFilter').value = 'all';
    document.getElementById('stationFilter').value = 'all';
    loadStatistics();
}

// Event listeners
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadFilters();
        
        // Agregar eventos a los botones de filtros
        document.querySelectorAll('#applyFilters').forEach(button => {
            button.addEventListener('click', loadStatistics);
        });
        
        document.querySelectorAll('#resetFilters').forEach(button => {
            button.addEventListener('click', resetFilters);
        });
    } catch (error) {
        console.error('Error initializing page:', error);
    }
});

// Actualizar posición de leyendas en cambio de tamaño de ventana
window.addEventListener('resize', () => {
    if (charts.incidentTypes) {
        charts.incidentTypes.options.plugins.legend.position = 
            window.innerWidth > 768 ? 'right' : 'bottom';
        charts.incidentTypes.update();
    }
});
