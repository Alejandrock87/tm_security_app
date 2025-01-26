
// Variables globales para los gráficos
let charts = {
    typeChart: null,
    stationChart: null
};

async function loadStations() {
    try {
        const response = await fetch('/api/stations');
        if (!response.ok) throw new Error('Error cargando estaciones');
        const stations = await response.json();
        
        // Procesar troncales
        const troncales = [...new Set(stations.map(s => s.troncal))].filter(Boolean).sort();
        const troncalSelect = document.getElementById('troncalFilter');
        troncalSelect.innerHTML = '<option value="all">Todas las Troncales</option>';
        troncales.forEach(troncal => {
            troncalSelect.innerHTML += `<option value="${troncal}">${troncal}</option>`;
        });

        // Procesar estaciones
        const stationSelect = document.getElementById('stationFilter');
        stationSelect.innerHTML = '<option value="all">Todas las Estaciones</option>';
        stations.sort((a, b) => a.nombre.localeCompare(b.nombre)).forEach(station => {
            stationSelect.innerHTML += `<option value="${station.nombre}">${station.nombre}</option>`;
        });
    } catch (error) {
        console.error('Error cargando estaciones:', error);
    }
}

async function loadIncidentTypes() {
    try {
        const response = await fetch('/api/statistics');
        if (!response.ok) throw new Error('Error cargando tipos de incidentes');
        const data = await response.json();
        
        const incidentSelect = document.getElementById('incidentTypeFilter');
        incidentSelect.innerHTML = '<option value="all">Todos los Tipos</option>';
        Object.keys(data.incident_types).sort().forEach(type => {
            incidentSelect.innerHTML += `<option value="${type}">${type}</option>`;
        });
    } catch (error) {
        console.error('Error cargando tipos de incidentes:', error);
    }
}

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
        await loadIncidentTypes();
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
        showError('Error al cargar las estadísticas');
    }
}

function getFilters() {
    const filters = {};
    const addFilter = (id, key) => {
        if (document.getElementById(`enable${id}`).checked && 
            document.getElementById(id).value !== 'all') {
            filters[key] = document.getElementById(id).value;
        }
    };

    addFilter('troncalFilter', 'troncal');
    addFilter('stationFilter', 'station');
    addFilter('incidentTypeFilter', 'incidentType');

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

    return filters;
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

function resetFilters() {
    // Reset checkboxes
    ['DateFrom', 'DateTo', 'TimeFrom', 'TimeTo', 'troncal', 'station', 'incidentType'].forEach(filter => {
        const checkbox = document.getElementById(`enable${filter}Filter`);
        if (checkbox) checkbox.checked = false;
    });

    // Reset inputs
    document.getElementById('dateFromFilter').value = '';
    document.getElementById('dateToFilter').value = '';
    document.getElementById('timeFromFilter').value = '';
    document.getElementById('timeToFilter').value = '';
    document.getElementById('troncalFilter').value = 'all';
    document.getElementById('stationFilter').value = 'all';
    document.getElementById('incidentTypeFilter').value = 'all';

    loadFilteredData();
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

function updateSummaryCards(data) {
    document.getElementById('totalIncidents').textContent = data.total_incidents || '0';
    document.getElementById('mostAffectedStation').textContent = data.most_affected_station || 'No hay datos';
    document.getElementById('mostDangerousHour').textContent = data.most_dangerous_hour || 'No hay datos';
    document.getElementById('mostCommonType').textContent = data.most_common_type || 'No hay datos';
}

function createCharts(data) {
    if (charts.typeChart) charts.typeChart.destroy();
    if (charts.stationChart) charts.stationChart.destroy();

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
}

// Event listeners
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('Inicializando página de estadísticas...');
        await loadStations();
        await loadStatistics();
        await loadFilteredData();

        // Agregar event listeners para los filtros
        document.getElementById('applyFilters').addEventListener('click', loadFilteredData);
        document.getElementById('resetFilters').addEventListener('click', resetFilters);
        
        // Event listener para actualizar estaciones cuando cambia la troncal
        document.getElementById('troncalFilter').addEventListener('change', async function() {
            if (document.getElementById('enabletroncalFilter').checked) {
                await loadStations();
            }
        });
    } catch (error) {
        console.error('Error initializing page:', error);
        showError('Error al inicializar la página');
    }
});
