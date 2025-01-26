// Variables globales para los gráficos
let charts = {
    typeChart: null,
    stationChart: null
};

async function loadStatistics() {
    try {
        console.log("Cargando estadísticas...");
        const response = await fetch('/api/statistics');
        if (!response.ok) {
            throw new Error(`Error en la respuesta del servidor: ${response.status}`);
        }

        const data = await response.json();
        console.log("Datos recibidos:", data);

        updateSummaryCards(data);
        createCharts(data);
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
        showError('Error al cargar las estadísticas');
    }
}

async function loadFilteredData() {
    try {
        const filters = getFilters();
        const queryString = new URLSearchParams(filters).toString();
        const response = await fetch(`/api/statistics?${queryString}`);
        if (!response.ok) {
            throw new Error(`Error en la respuesta del servidor: ${response.status}`);
        }

        const data = await response.json();
        updateFilteredDataTable(data);
    } catch (error) {
        console.error('Error al cargar datos filtrados:', error);
        showError('Error al cargar datos filtrados');
    }
}

function updateFilteredDataTable(data) {
    const tbody = document.querySelector('#filteredDataTable tbody');
    tbody.innerHTML = '';

    if (!data.incidents || !Array.isArray(data.incidents)) {
        return;
    }

    data.incidents.forEach(incident => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(incident.timestamp).toLocaleDateString()}</td>
            <td>${new Date(incident.timestamp).toLocaleTimeString()}</td>
            <td>${incident.incident_type}</td>
            <td>${incident.nearest_station}</td>
            <td>${incident.troncal || 'N/A'}</td>
        `;
        tbody.appendChild(row);
    });
}

function getFilters() {
    const filters = {};

    if (document.getElementById('enableDateFromFilter').checked) {
        filters.dateFrom = document.getElementById('dateFromFilter').value;
    }
    if (document.getElementById('enableDateToFilter').checked) {
        filters.dateTo = document.getElementById('dateToFilter').value;
    }
    if (document.getElementById('enableTimeFromFilter').checked) {
        filters.timeFrom = document.getElementById('timeFromFilter').value;
    }
    if (document.getElementById('enableTimeToFilter').checked) {
        filters.timeTo = document.getElementById('timeToFilter').value;
    }
    if (document.getElementById('troncalFilter').value !== 'all') {
        filters.troncal = document.getElementById('troncalFilter').value;
    }
    if (document.getElementById('stationFilter').value !== 'all') {
        filters.station = document.getElementById('stationFilter').value;
    }
    if (document.getElementById('incidentTypeFilter').value !== 'all') {
        filters.incidentType = document.getElementById('incidentTypeFilter').value;
    }

    return filters;
}

function resetFilters() {
    // Reset checkboxes
    ['DateFrom', 'DateTo', 'TimeFrom', 'TimeTo'].forEach(filter => {
        document.getElementById(`enable${filter}Filter`).checked = false;
    });

    // Reset inputs
    document.getElementById('dateFromFilter').value = '';
    document.getElementById('dateToFilter').value = '';
    document.getElementById('timeFromFilter').value = '';
    document.getElementById('timeToFilter').value = '';
    document.getElementById('incidentTypeFilter').value = 'all';
    document.getElementById('troncalFilter').value = 'all';
    document.getElementById('stationFilter').value = 'all';

    loadFilteredData();
}

function updateSummaryCards(data) {
    document.getElementById('totalIncidents').textContent = data.total_incidents || '0';
    document.getElementById('mostAffectedStation').textContent = data.most_affected_station || 'No hay datos';
    document.getElementById('mostDangerousHour').textContent = data.most_dangerous_hour || 'No hay datos';
    document.getElementById('mostCommonType').textContent = data.most_common_type || 'No hay datos';
}


function createCharts(data) {
    // Limpiar gráficos existentes
    if (charts.typeChart) charts.typeChart.destroy();
    if (charts.stationChart) charts.stationChart.destroy();

    // Gráfico de tipos de incidentes
    const typeCtx = document.getElementById('incidentTypesChart').getContext('2d');
    charts.typeChart = new Chart(typeCtx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(data.incident_types || {}),
            datasets: [{
                data: Object.values(data.incident_types || {}),
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // Gráfico de estaciones más afectadas
    const stationCtx = document.getElementById('topStationsChart').getContext('2d');
    charts.stationChart = new Chart(stationCtx, {
        type: 'bar',
        data: {
            labels: Object.keys(data.top_stations || {}),
            datasets: [{
                label: 'Incidentes',
                data: Object.values(data.top_stations || {}),
                backgroundColor: '#36A2EB'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function showError(message) {
    console.error(message);
    // Aquí podrías agregar una alerta visual para el usuario
}

// Event listeners
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('Inicializando página de estadísticas...');
        await loadStatistics();
        await loadFilteredData();

        const applyButton = document.getElementById('applyFilters');
        const resetButton = document.getElementById('resetFilters');

        if (applyButton) {
            applyButton.addEventListener('click', loadFilteredData);
        }

        if (resetButton) {
            resetButton.addEventListener('click', resetFilters);
        }
    } catch (error) {
        console.error('Error initializing page:', error);
        showError('Error al inicializar la página');
    }
});