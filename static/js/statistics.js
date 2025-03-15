document.addEventListener('DOMContentLoaded', async () => {
    console.log('Inicializando página de estadísticas...');
    await loadStatistics();
    setupEventListeners();
});

function setupEventListeners() {
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

        // Verificar si hay datos
        if (data.total_incidents === 0) {
            console.log("No se encontraron incidentes para mostrar");
            showError('No hay datos para mostrar en este período');
            return;
        }

        updateAllStatistics(data);
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
        showError('Error al cargar las estadísticas');
    }
}

function updateAllStatistics(data) {
    if (!data) {
        console.log("No hay datos para actualizar");
        return;
    }

    console.log("Actualizando estadísticas con datos:", data);

    // Actualizar tarjetas de resumen
    const elementsToUpdate = {
        'totalIncidents': data.total_incidents || '0',
        'mostAffectedStation': data.most_affected_station || '-',
        'mostDangerousHour': data.most_dangerous_hour || '-',
        'mostCommonType': data.most_common_type || '-'
    };

    for (const [elementId, value] of Object.entries(elementsToUpdate)) {
        const element = document.getElementById(elementId);
        if (element) {
            console.log(`Actualizando ${elementId} con valor:`, value);
            element.textContent = value;
        } else {
            console.warn(`Elemento no encontrado: ${elementId}`);
        }
    }

    // Actualizar listas detalladas
    if (data.incident_types) {
        console.log("Actualizando lista de tipos de incidentes:", data.incident_types);
        updateIncidentTypesList(data.incident_types);
    }

    if (data.top_stations) {
        console.log("Actualizando lista de estaciones:", data.top_stations);
        updateStationsList(data.top_stations);
    }

    // Actualizar gráficas
    updateIncidentTypesChart(data.incident_types);
    updateStationsChart(data.top_stations);

    // Ocultar mensaje de error si existe
    const errorContainer = document.getElementById('emptyDataMessage');
    if (errorContainer) {
        errorContainer.style.display = 'none';
    }
}

function updateIncidentTypesList(incidentTypes) {
    if (!incidentTypes) return;

    const incidentTypesList = document.getElementById('incidentTypesList');
    if (incidentTypesList) {
        incidentTypesList.innerHTML = Object.entries(incidentTypes)
            .sort(([,a], [,b]) => b - a)
            .map(([type, count]) => `
                <div class="list-item">
                    <span class="item-name">${type}</span>
                    <span class="item-count">${parseInt(count)}</span>
                </div>
            `).join('');
    }
}

function updateStationsList(topStations) {
    if (!topStations) return;

    const stationsList = document.getElementById('stationsList');
    if (stationsList) {
        stationsList.innerHTML = Object.entries(topStations)
            .sort(([,a], [,b]) => b.total - a.total)
            .map(([station, stats]) => `
                <div class="list-item">
                    <span class="item-name">${station}</span>
                    <span class="item-count">${parseInt(stats.total)}</span>
                </div>
            `).join('');
    }
}

function updateIncidentTypesChart(incidentTypes) {
    if (!incidentTypes) return;

    const ctx = document.getElementById('incidentTypesChart').getContext('2d');
    const data = Object.entries(incidentTypes);
    const total = data.reduce((sum, [,count]) => sum + count, 0);

    if (window.incidentTypesChart instanceof Chart) {
        window.incidentTypesChart.destroy();
    }

    window.incidentTypesChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: data.map(([type]) => type),
            datasets: [{
                data: data.map(([,count]) => count),
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
                    labels: {
                        color: '#2d3436',
                        font: {
                            size: 12,
                            weight: 'bold'
                        },
                        padding: 20
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function updateStationsChart(stationsData) {
    if (!stationsData) return;

    const ctx = document.getElementById('stationsChart').getContext('2d');
    const data = Object.entries(stationsData)
        .sort(([, a], [, b]) => parseInt(b.total) - parseInt(a.total))
        .slice(0, 10);

    if (window.stationsChart instanceof Chart) {
        window.stationsChart.destroy();
    }

    window.stationsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(([station]) => station),
            datasets: [{
                label: 'Número de Incidentes',
                data: data.map(([, stats]) => parseInt(stats.total)),
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
                    ticks: {
                        stepSize: 1,
                        color: '#2d3436'
                    }
                },
                x: {
                    ticks: {
                        color: '#2d3436'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: (context) => `Incidentes: ${context.raw}`
                    }
                }
            }
        }
    });
}

async function applyQuickFilter(period) {
    try {
        // Usar la fecha local para los filtros
        const now = new Date();
        // Ajustar a la zona horaria local de Colombia (UTC-5)
        const offset = -5 * 60; // offset en minutos para Colombia
        const localDate = new Date(now.getTime() + (now.getTimezoneOffset() + offset) * 60000);

        let filters = {};

        switch(period) {
            case 'today':
                filters.dateFrom = localDate.toISOString().split('T')[0];
                filters.dateTo = filters.dateFrom;
                break;
            case 'week':
                const weekStart = new Date(localDate);
                weekStart.setDate(localDate.getDate() - 7);
                filters.dateFrom = weekStart.toISOString().split('T')[0];
                filters.dateTo = localDate.toISOString().split('T')[0];
                break;
            case 'month':
                const monthStart = new Date(localDate);
                monthStart.setMonth(localDate.getMonth() - 1);
                filters.dateFrom = monthStart.toISOString().split('T')[0];
                filters.dateTo = localDate.toISOString().split('T')[0];
                break;
        }

        console.log('Aplicando filtros:', filters);
        const queryString = new URLSearchParams(filters).toString();
        console.log('URL de consulta:', `/api/statistics?${queryString}`);

        const response = await fetch(`/api/statistics?${queryString}`);

        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }

        const data = await response.json();
        console.log('Datos recibidos después de aplicar filtro:', data);

        if (data.total_incidents === 0) {
            console.log("No se encontraron incidentes para el período seleccionado");
            showError('No hay datos para mostrar en este período');
            return;
        }

        updateAllStatistics(data);

    } catch (error) {
        console.error('Error al aplicar filtro:', error);
        showError('Error al cargar los datos filtrados');
    }
}

function showError(message) {
    const errorContainer = document.getElementById('emptyDataMessage');
    if (errorContainer) {
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
    }
    console.error(message);
}