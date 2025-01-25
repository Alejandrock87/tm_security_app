
let charts = {
    criticalHours: null,
    incidentTypes: null
};

async function loadStatistics() {
    const filters = getFilters();
    const response = await fetch('/api/statistics?' + new URLSearchParams(filters));
    const data = await response.json();
    
    updateCharts(data);
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
                backgroundColor: 'rgba(54, 162, 235, 0.5)'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
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
        type: 'pie',
        data: {
            labels: Object.keys(typeData),
            datasets: [{
                data: Object.values(typeData),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.5)',
                    'rgba(54, 162, 235, 0.5)',
                    'rgba(255, 206, 86, 0.5)',
                    'rgba(75, 192, 192, 0.5)',
                    'rgba(153, 102, 255, 0.5)'
                ]
            }]
        },
        options: {
            responsive: true
        }
    });
}

// Event listeners for filters
document.querySelectorAll('select, input').forEach(element => {
    element.addEventListener('change', loadStatistics);
});

// Initial load
document.addEventListener('DOMContentLoaded', loadStatistics);
