// Variables globales
let currentFilters = {};

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Inicializando página de estadísticas...');
    await loadStatistics();
    setupEventListeners();
});

function setupEventListeners() {
    // Quick filter chips
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            applyQuickFilter(chip.dataset.period);
        });
    });
}

async function loadStatistics() {
    try {
        console.log("Cargando estadísticas...");
        const response = await fetch('/api/statistics');
        if (!response.ok) throw new Error(`Error: ${response.status}`);

        const data = await response.json();
        console.log("Datos recibidos:", data);
        updateSummaryCards(data);
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
        showError('Error al cargar las estadísticas');
    }
}

function updateSummaryCards(data) {
    if (!data) return;

    document.getElementById('totalIncidents').textContent = data.total_incidents || '0';
    document.getElementById('mostAffectedStation').textContent = data.most_affected_station || '-';
    document.getElementById('mostDangerousHour').textContent = data.most_dangerous_hour || '-';
    document.getElementById('mostCommonType').textContent = data.most_common_type || '-';

    // Update incident types chart and list
    if (data.incident_types) {
        updateIncidentTypesChart(data.incident_types);
        const incidentTypesList = document.getElementById('incidentTypesList');
        if (incidentTypesList) {
            incidentTypesList.innerHTML = Object.entries(data.incident_types)
                .sort(([,a], [,b]) => b - a)
                .map(([type, count]) => `
                    <div class="list-item">
                        <span class="item-name">${type}</span>
                        <span class="item-count">${count}</span>
                    </div>
                `).join('');
        }
    }

    // Update stations chart and list
    if (data.top_stations) {
        updateStationsChart(data.top_stations);
        const stationsList = document.getElementById('stationsList');
        if (stationsList) {
            stationsList.innerHTML = Object.entries(data.top_stations)
                .sort(([,a], [,b]) => b - a)
                .map(([station, count]) => `
                    <div class="list-item">
                        <span class="item-name">${station}</span>
                        <span class="item-count">${count}</span>
                    </div>
                `).join('');
        }
    }
}

function updateIncidentTypesChart(incidentTypes) {
    const ctx = document.getElementById('incidentTypesChart').getContext('2d');
    const data = Object.entries(incidentTypes).sort(([,a], [,b]) => b - a);
    const total = data.reduce((sum, [,count]) => sum + count, 0);

    // Destroy existing chart if it exists
    if (window.incidentTypesChart) {
        window.incidentTypesChart.destroy();
    }

    window.incidentTypesChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: data.map(([type]) => type),
            datasets: [{
                data: data.map(([,count]) => ((count / total) * 100).toFixed(1)),
                backgroundColor: [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                    '#9966FF', '#FF9F40', '#00CC99'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#e2e8f0' }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            return `${label}: ${value}%`;
                        }
                    }
                }
            }
        }
    });
}

function updateStationsChart(stationsData) {
    const ctx = document.getElementById('stationsChart').getContext('2d');
    const data = Object.entries(stationsData).sort(([,a], [,b]) => b - a);

    // Destroy existing chart if it exists
    if (window.stationsChart) {
        window.stationsChart.destroy();
    }

    window.stationsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(([station]) => station),
            datasets: [{
                label: 'Incidentes',
                data: data.map(([,count]) => count),
                backgroundColor: '#36A2EB',
                borderColor: '#2563EB',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#e2e8f0' }
                },
                x: {
                    ticks: { color: '#e2e8f0' }
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

async function applyQuickFilter(period) {
    const now = new Date();
    let filters = {};

    switch(period) {
        case 'today':
            const today = now.toISOString().split('T')[0];
            filters.dateFrom = today;
            filters.dateTo = today;
            break;
        case 'week':
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - 7);
            filters.dateFrom = weekStart.toISOString().split('T')[0];
            filters.dateTo = now.toISOString().split('T')[0];
            break;
        case 'month':
            const monthStart = new Date(now);
            monthStart.setMonth(now.getMonth() - 1);
            filters.dateFrom = monthStart.toISOString().split('T')[0];
            filters.dateTo = now.toISOString().split('T')[0];
            break;
        case 'all':
            break;
    }

    try {
        const queryString = new URLSearchParams(filters).toString();
        const response = await fetch(`/api/statistics?${queryString}`);
        const data = await response.json();
        if (response.ok) {
            updateSummaryCards(data);
            if (data.total_incidents === 0) {
                document.getElementById('emptyDataMessage').textContent = 'No hay datos para el período seleccionado';
                document.getElementById('emptyDataMessage').style.display = 'block';
            } else {
                document.getElementById('emptyDataMessage').style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error al cargar datos filtrados:', error);
        showError('Error al cargar los datos filtrados');
    }
}

function showError(message) {
    console.error(message);
}