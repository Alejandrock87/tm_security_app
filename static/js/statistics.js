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

function createFilterCard(title, content) {
    return `
        <div class="col-md-4 mb-4">
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">${title}</h5>
                    <div class="card-content">${content}</div>
                </div>
            </div>
        </div>
    `;
}

function createDetailedView(data, activeFilters = {}) {
    try {
        const container = document.getElementById('detailedView');
        if (!data || !data.incident_types || Object.keys(data.incident_types).length === 0) {
            container.innerHTML = '<p class="text-muted">No se encontraron resultados para los filtros seleccionados.</p>';
            return;
        }

        // Si no hay filtros activos, no mostrar nada en la vista detallada
        if (Object.keys(activeFilters).length === 0) {
            container.innerHTML = '<p class="text-muted">Seleccione filtros para ver información detallada.</p>';
            return;
        }

        let html = '<div class="row">';
        let hasContent = false;

        // Mostrar información específica según los filtros aplicados
        if (activeFilters.station) {
            hasContent = true;
            const stationIncidents = data.incident_types;
            html += `
                <div class="col-12 mb-4">
                    <h6>Incidentes en ${activeFilters.station}</h6>
                    <ul class="list-group">
                        ${Object.entries(stationIncidents)
                            .sort(([,a], [,b]) => b - a)
                            .map(([type, count]) => 
                                `<li class="list-group-item d-flex justify-content-between align-items-center">
                                    ${type}
                                    <span class="badge bg-primary rounded-pill">${count}</span>
                                </li>`
                            ).join('')}
                    </ul>
                </div>
            `;
        }

        if (activeFilters.troncal) {
            hasContent = true;
            const stationStats = data.top_stations;
            html += `
                <div class="col-12 mb-4">
                    <h6>Estaciones más afectadas en Troncal ${activeFilters.troncal}</h6>
                    <ul class="list-group">
                        ${Object.entries(stationStats)
                            .sort(([,a], [,b]) => b - a)
                            .map(([station, count]) => 
                                `<li class="list-group-item d-flex justify-content-between align-items-center">
                                    ${station}
                                    <span class="badge bg-primary rounded-pill">${count}</span>
                                </li>`
                            ).join('')}
                    </ul>
                </div>
            `;
        }

        if (activeFilters.incidentType) {
            hasContent = true;
            const stationStats = data.top_stations;
            html += `
                <div class="col-12 mb-4">
                    <h6>Estaciones más afectadas por ${activeFilters.incidentType}</h6>
                    <ul class="list-group">
                        ${Object.entries(stationStats)
                            .sort(([,a], [,b]) => b - a)
                            .map(([station, count]) => 
                                `<li class="list-group-item d-flex justify-content-between align-items-center">
                                    ${station}
                                    <span class="badge bg-primary rounded-pill">${count}</span>
                                </li>`
                            ).join('')}
                    </ul>
                </div>
            `;
        }

        html += '</div>';

        // Solo mostrar total de incidentes filtrados
        if (hasContent) {
            html += `
                <div class="row mt-4">
                    <div class="col-12">
                        <div class="alert alert-info">
                            Total de incidentes encontrados: ${data.total_incidents}
                        </div>
                    </div>
                </div>
            `;
        }

        container.innerHTML = hasContent ? html : '<p class="text-muted">Seleccione filtros para ver información detallada.</p>';
    } catch (error) {
        console.error('Error al crear vista detallada:', error);
        document.getElementById('detailedView').innerHTML = 
            '<p class="text-danger">Error al procesar los datos. Por favor, intente nuevamente.</p>';
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

        if (data && typeof data === 'object') {
            // Inicializar el objeto charts si no existe
            if (typeof charts === 'undefined') {
                window.charts = {
                    typeChart: null,
                    stationChart: null
                };
            }
            
            // Asegurarse de que los gráficos existentes se destruyan antes de crear nuevos
            if (window.charts.typeChart) window.charts.typeChart.destroy();
            if (window.charts.stationChart) window.charts.stationChart.destroy();
            
            updateSummaryCards(data);
            createCharts(data);
            if (typeof loadIncidentTypes === 'function') {
                await loadIncidentTypes();
            }

            // Mostrar vista inicial sin filtros
            createDetailedView(data, {});
        } else {
            throw new Error('Datos inválidos recibidos del servidor');
        }
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
        document.getElementById('detailedView').innerHTML = 
            '<div class="alert alert-danger">Error al cargar las estadísticas. Por favor, intente nuevamente.</div>';
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
        createDetailedView(data, filters);
        updateCharts(data);
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