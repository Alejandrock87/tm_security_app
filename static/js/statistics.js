// Variables globales para los gráficos
let charts = {
    hourlyChart: null,
    typeChart: null,
    stationChart: null
};

async function loadStatistics() {
    try {
        console.log("Cargando estadísticas...");
        // Limpiar gráficos existentes
        Object.values(charts).forEach(chart => {
            if (chart) {
                chart.destroy();
            }
        });

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

function updateSummaryCards(data) {
    document.getElementById('totalIncidents').textContent = data.total_incidents || '0';
    document.getElementById('mostAffectedStation').textContent = data.most_affected_station || 'No hay datos';
    document.getElementById('mostDangerousHour').textContent = data.most_dangerous_hour || 'No hay datos';
    document.getElementById('mostCommonType').textContent = data.most_common_type || 'No hay datos';
}

function createCharts(data) {
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
    const cards = document.querySelectorAll('.card-title');
    cards.forEach(card => {
        card.textContent = 'Error al cargar datos';
    });
}

async function loadFilters() {
    try {
        console.log("Iniciando carga de filtros...");
        // Cargar datos de estaciones y troncales
        const response = await fetch('/static/Estaciones_Troncales_de_TRANSMILENIO.geojson');
        if (!response.ok) {
            throw new Error(`Error al cargar datos de estaciones: ${response.status}`);
        }
        const data = await response.json();
        
        if (!data || !data.features) {
            throw new Error('Datos de estaciones inválidos');
        }
        
        // Cargar troncales únicas
        const troncales = [...new Set(data.features
            .map(f => f.properties && f.properties.troncal_estacion)
            .filter(Boolean))].sort();
        
        const troncalSelect = document.getElementById('troncalFilter');
        if (!troncalSelect) {
            throw new Error('Elemento troncalFilter no encontrado');
        }
        
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
        
        // Cargar tipos de incidentes desde las estadísticas
        const statsResponse = await fetch('/api/statistics');
        const statsData = await statsResponse.json();
        const incidentTypes = Object.keys(statsData.incident_types || {}).sort();
        
        const incidentSelect = document.getElementById('incidentTypeFilter');
        if (!incidentSelect) {
            throw new Error('Elemento incidentTypeFilter no encontrado');
        }
        
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
    const filters = {
        dateFrom: document.getElementById('dateFromFilter').value || '',
        dateTo: document.getElementById('dateToFilter').value || '',
        timeFrom: document.getElementById('timeFromFilter').value || '',
        timeTo: document.getElementById('timeToFilter').value || '',
        incidentType: document.getElementById('incidentTypeFilter').value || 'all',
        troncal: document.getElementById('troncalFilter').value || 'all',
        station: document.getElementById('stationFilter').value || 'all'
    };
    console.log('Filtros aplicados:', filters);
    return filters;
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
        console.log('Inicializando página de estadísticas...');
        await loadFilters();
        await loadStatistics(); // Cargar estadísticas iniciales
        
        // Agregar eventos a los botones de filtros
        const applyButton = document.getElementById('applyFilters');
        const resetButton = document.getElementById('resetFilters');
        
        if (applyButton) {
            applyButton.addEventListener('click', async (e) => {
                e.preventDefault();
                await loadStatistics();
            });
        }
        
        if (resetButton) {
            resetButton.addEventListener('click', async (e) => {
                e.preventDefault();
                await resetFilters();
                
            });
        }
    } catch (error) {
        console.error('Error initializing page:', error);
    }
});

// Actualizar posición de leyendas en cambio de tamaño de ventana
window.addEventListener('resize', () => {
    if (charts.typeChart) {
        //charts.incidentTypes.options.plugins.legend.position = 
        //    window.innerWidth > 768 ? 'right' : 'bottom';
        //charts.incidentTypes.update();
    }
});