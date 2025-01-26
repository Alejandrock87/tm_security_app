
let charts = {
    criticalHours: null,
    incidentTypes: null
};

async function loadFilters() {
    // Load troncales from geojson
    const response = await fetch('/static/Estaciones_Troncales_de_TRANSMILENIO.geojson');
    const data = await response.json();
    
    // Get unique troncales
    const troncales = [...new Set(data.features
        .map(f => f.properties.troncal_estacion)
        .filter(t => t))];
    
    // Populate troncal filter
    const troncalSelect = document.getElementById('troncalFilter');
    troncales.forEach(troncal => {
        const option = document.createElement('option');
        option.value = troncal;
        option.textContent = troncal;
        troncalSelect.appendChild(option);
    });

    // Load incident types
    const incidents = await fetch('/incidents');
    const incidentData = await incidents.json();
    const incidentTypes = [...new Set(incidentData.map(i => i.incident_type))];
    
    // Populate incident type filter
    const incidentSelect = document.getElementById('incidentTypeFilter');
    incidentTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        incidentSelect.appendChild(option);
    });
}

function getFilters() {
    return {
        date: document.getElementById('dateFilter').value,
        time: document.getElementById('timeFilter').value,
        incidentType: document.getElementById('incidentTypeFilter').value,
        securityLevel: document.getElementById('securityLevelFilter').value,
        troncal: document.getElementById('troncalFilter').value,
        station: document.getElementById('stationFilter').value
    };
}

async function loadStatistics() {
    const filters = getFilters();
    const response = await fetch('/api/statistics?' + new URLSearchParams(filters));
    const data = await response.json();
    updateCharts(data);
}

function updateCharts(data) {
    updateCriticalHoursChart(data.hourly_stats);
    updateIncidentTypesChart(data.incident_types);
}

function updateCriticalHoursChart(hourlyData) {
    const ctx = document.getElementById('criticalHoursChart').getContext('2d');
    
    if (charts.criticalHours) {
        charts.criticalHours.destroy();
    }

    charts.criticalHours = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(hourlyData).map(hour => `${hour}:00`),
            datasets: [{
                label: 'Incidentes por Hora',
                data: Object.values(hourlyData),
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                }
            },
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

function updateIncidentTypesChart(typeData) {
    const ctx = document.getElementById('incidentTypesChart').getContext('2d');
    
    if (charts.incidentTypes) {
        charts.incidentTypes.destroy();
    }

    const colors = [
        'rgba(255, 99, 132, 0.5)',
        'rgba(54, 162, 235, 0.5)',
        'rgba(255, 206, 86, 0.5)',
        'rgba(75, 192, 192, 0.5)',
        'rgba(153, 102, 255, 0.5)'
    ];

    charts.incidentTypes = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(typeData),
            datasets: [{
                data: Object.values(typeData),
                backgroundColor: colors,
                borderColor: colors.map(c => c.replace('0.5', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

function resetFilters() {
    document.getElementById('dateFilter').value = '';
    document.getElementById('timeFilter').value = '';
    document.getElementById('incidentTypeFilter').value = 'all';
    document.getElementById('securityLevelFilter').value = 'all';
    document.getElementById('troncalFilter').value = 'all';
    document.getElementById('stationFilter').value = 'all';
    loadStatistics();
}

// Event listeners
document.addEventListener('DOMContentLoaded', async () => {
    await loadFilters();
    await loadStatistics();
    
    document.getElementById('applyFilters').addEventListener('click', loadStatistics);
    document.getElementById('resetFilters').addEventListener('click', resetFilters);
    document.getElementById('troncalFilter').addEventListener('change', async (e) => {
        const troncal = e.target.value;
        const response = await fetch('/static/Estaciones_Troncales_de_TRANSMILENIO.geojson');
        const data = await response.json();
        
        const stationSelect = document.getElementById('stationFilter');
        stationSelect.innerHTML = '<option value="all">Todas</option>';
        
        if (troncal !== 'all') {
            const stations = data.features
                .filter(f => f.properties.troncal_estacion === troncal)
                .map(f => f.properties.nombre_estacion);
            
            stations.forEach(station => {
                const option = document.createElement('option');
                option.value = station;
                option.textContent = station;
                stationSelect.appendChild(option);
            });
        }
    });
});
