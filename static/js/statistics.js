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
        showError('Error al cargar las estaciones');
    }
}

function updateSummaryCards(data) {
    if (!data) return;
    document.getElementById('totalIncidents').textContent = data.total_incidents || '0';
    document.getElementById('mostAffectedStation').textContent = data.most_affected_station || 'No hay datos';
    document.getElementById('mostDangerousHour').textContent = data.most_dangerous_hour || 'No hay datos';
    document.getElementById('mostCommonType').textContent = data.most_common_type || 'No hay datos';
}

function createDetailedView(data, activeFilters = {}) {
    try {
        const container = document.getElementById('detailedView');
        if (!container) {
            console.error('No se encontró el contenedor de vista detallada');
            return;
        }

        // Si no hay filtros activos, mostrar mensaje
        if (Object.keys(activeFilters).length === 0) {
            container.innerHTML = '<div class="alert alert-info">Seleccione filtros para ver información detallada.</div>';
            return;
        }

        let html = '<div class="row">';

        // Sección de filtros activos
        html += `
            <div class="col-12 mb-3">
                <div class="card">
                    <div class="card-body">
                        <h6 class="card-title">Filtros Activos</h6>
                        ${Object.entries(activeFilters).map(([key, value]) => {
                            const labelMap = {
                                'dateFrom': 'Fecha desde',
                                'dateTo': 'Fecha hasta',
                                'timeFrom': 'Hora desde',
                                'timeTo': 'Hora hasta',
                                'troncal': 'Troncal',
                                'station': 'Estación',
                                'incidentType': 'Tipo de incidente'
                            };
                            return `<span class="badge bg-primary me-2">${labelMap[key] || key}: ${value}</span>`;
                        }).join('')}
                    </div>
                </div>
            </div>`;

        // Mostrar estadísticas filtradas solo si hay datos
        if (data.total_incidents > 0) {
            html += `
                <div class="col-md-6">
                    <div class="card mb-3">
                        <div class="card-body">
                            <h6 class="card-title">Resumen de Incidentes Filtrados</h6>
                            <p>Total de incidentes: ${data.total_incidents}</p>
                            <p>Estación más afectada: ${data.most_affected_station}</p>
                            <p>Tipo más común: ${data.most_common_type}</p>
                            <p>Hora más peligrosa: ${data.most_dangerous_hour}</p>
                        </div>
                    </div>
                </div>`;

        // Mostrar distribución de tipos de incidentes
        if (data.incident_types) {
            html += `
                <div class="col-md-6">
                    <div class="card mb-3">
                        <div class="card-body">
                            <h6 class="card-title">Distribución por Tipo</h6>
                            <ul class="list-group">
                                ${Object.entries(data.incident_types)
                                    .sort(([,a], [,b]) => b - a)
                                    .map(([type, count]) => 
                                        `<li class="list-group-item d-flex justify-content-between align-items-center">
                                            ${type}
                                            <span class="badge bg-primary rounded-pill">${count}</span>
                                        </li>`
                                    ).join('')}
                            </ul>
                        </div>
                    </div>
                </div>`;
        }

        html += '</div>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Error al crear vista detallada:', error);
        document.getElementById('detailedView').innerHTML = 
            '<div class="alert alert-danger">Error al procesar los datos. Por favor, intente nuevamente.</div>';
    }
}

function createCharts(data) {
    try {
        // Destruir gráficos existentes si existen
        if (charts.typeChart) {
            charts.typeChart.destroy();
            charts.typeChart = null;
        }
        if (charts.stationChart) {
            charts.stationChart.destroy();
            charts.stationChart = null;
        }

        // Crear gráfico de tipos de incidentes
        const typeCtx = document.getElementById('incidentTypesChart');
        if (typeCtx && data.incident_types) {
            charts.typeChart = new Chart(typeCtx.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: Object.keys(data.incident_types),
                    datasets: [{
                        data: Object.values(data.incident_types),
                        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }

        // Crear gráfico de estaciones
        const stationCtx = document.getElementById('topStationsChart');
        if (stationCtx && data.top_stations) {
            charts.stationChart = new Chart(stationCtx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: Object.keys(data.top_stations),
                    datasets: [{
                        label: 'Incidentes',
                        data: Object.values(data.top_stations),
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
    } catch (error) {
        console.error('Error al crear gráficos:', error);
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

        if (!data || typeof data !== 'object') {
            throw new Error('Datos inválidos recibidos del servidor');
        }

        updateSummaryCards(data);
        createDetailedView(data, {});
        createCharts(data);

    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
        document.getElementById('detailedView').innerHTML = 
            '<div class="alert alert-danger">Error al cargar las estadísticas. Por favor, intente nuevamente.</div>';
    }
}

async function loadFilteredData() {
    try {
        const filters = getFilters();
        
        // Si no hay filtros activos, limpiar la vista detallada
        if (Object.keys(filters).length === 0) {
            document.getElementById('detailedView').innerHTML = 
                '<div class="alert alert-info">Seleccione filtros para ver información detallada.</div>';
            return;
        }

        const queryString = new URLSearchParams(filters).toString();
        const response = await fetch(`/api/statistics?${queryString}`);

        if (!response.ok) {
            throw new Error(`Error en la respuesta del servidor: ${response.status}`);
        }

        const data = await response.json();
        if (data) {
            // Solo actualizar la vista detallada con los datos filtrados
            createDetailedView(data, filters);
        }
    } catch (error) {
        console.error('Error al cargar datos filtrados:', error);
        document.getElementById('detailedView').innerHTML = 
            '<div class="alert alert-danger">Error al cargar los datos filtrados. Por favor, intente nuevamente.</div>';
    }
}

function getFilters() {
    const filters = {};
    const addFilter = (id, key) => {
        const checkbox = document.getElementById(`enable${id}`);
        const input = document.getElementById(id);
        if (checkbox && checkbox.checked && input && input.value !== 'all') {
            filters[key] = input.value;
        }
    };

    addFilter('troncalFilter', 'troncal');
    addFilter('stationFilter', 'station');
    addFilter('incidentTypeFilter', 'incidentType');
    addFilter('dateFromFilter', 'dateFrom');
    addFilter('dateToFilter', 'dateTo');
    addFilter('timeFromFilter', 'timeFrom');
    addFilter('timeToFilter', 'timeTo');

    return filters;
}

function resetFilters() {
    const filterIds = ['DateFrom', 'DateTo', 'TimeFrom', 'TimeTo', 'troncal', 'station', 'incidentType'];

    filterIds.forEach(id => {
        const checkbox = document.getElementById(`enable${id}Filter`);
        const input = document.getElementById(`${id}Filter`);
        if (checkbox) checkbox.checked = false;
        if (input) input.value = input.tagName === 'SELECT' ? 'all' : '';
    });

    loadStatistics();
}

// Event listeners
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('Inicializando página de estadísticas...');
        await loadStations();
        await loadStatistics();

        document.getElementById('applyFilters')?.addEventListener('click', loadFilteredData);
        document.getElementById('resetFilters')?.addEventListener('click', resetFilters);

        document.getElementById('troncalFilter')?.addEventListener('change', loadStations);
    } catch (error) {
        console.error('Error al inicializar la página:', error);
        showError('Error al inicializar la página');
    }
});

function showError(message) {
    const container = document.getElementById('detailedView');
    if (container) {
        container.innerHTML = `<div class="alert alert-danger">${message}</div>`;
    }
    console.error(message);
}