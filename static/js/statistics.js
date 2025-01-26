// Variables globales
let currentFilters = {};

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Inicializando página de estadísticas...');
    await loadStations();
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

    // Floating filter button
    document.getElementById('showFilters')?.addEventListener('click', () => {
        const modal = new bootstrap.Modal(document.getElementById('filterModal'));
        modal.show();
    });

    // Expand buttons
    document.querySelectorAll('.btn-expand').forEach(btn => {
        btn.addEventListener('click', function() {
            const card = this.closest('.detail-card');
            const list = card.querySelector('.scrollable-list');
            if (card.classList.contains('expanded')) {
                list.style.maxHeight = '300px';
                card.classList.remove('expanded');
                this.innerHTML = '<i class="fas fa-expand"></i>';
            } else {
                list.style.maxHeight = 'none';
                card.classList.add('expanded');
                this.innerHTML = '<i class="fas fa-compress"></i>';
            }
        });
    });
    //Event Listeners from original code.
    document.getElementById('applyFilters')?.addEventListener('click', loadFilteredData);
    document.getElementById('resetFilters')?.addEventListener('click', resetFilters);
    document.getElementById('troncalFilter')?.addEventListener('change', loadStations);

}

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
    document.getElementById('mostAffectedStation').textContent = data.most_affected_station || '-';
    document.getElementById('mostDangerousHour').textContent = data.most_dangerous_hour || '-';
    document.getElementById('mostCommonType').textContent = data.most_common_type || '-';

    // Update incident types list
    const incidentTypesList = document.getElementById('incidentTypesList');
    if (data.incident_types && incidentTypesList) {
        incidentTypesList.innerHTML = Object.entries(data.incident_types)
            .sort(([,a], [,b]) => b - a)
            .map(([type, count]) => `
                <div class="list-item">
                    <span class="item-name">${type}</span>
                    <span class="item-count">${count}</span>
                </div>
            `).join('');
    }

    // Update stations list
    const stationsList = document.getElementById('stationsList');
    if (data.top_stations && stationsList) {
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

async function applyQuickFilter(period) {
    const now = new Date();
    let filters = {};

    switch(period) {
        case 'today':
            filters.dateFrom = now.toISOString().split('T')[0];
            filters.dateTo = filters.dateFrom;
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
    }

    await loadFilteredData(filters);
}

async function loadFilteredData(filters = null) {
    try {
        let queryParams = {};
        
        if (!filters) {
            // Obtener filtros del modal
            const enabledFilters = document.querySelectorAll('[id^="enable"]:checked');
            enabledFilters.forEach(checkbox => {
                const filterId = checkbox.id.replace('enable', '').replace('Filter', '');
                const filterInput = document.getElementById(`${filterId}Filter`);
                if (filterInput && filterInput.value && filterInput.value !== 'all') {
                    queryParams[filterId.toLowerCase()] = filterInput.value;
                }
            });
        } else {
            queryParams = filters;
        }

        const queryString = new URLSearchParams(queryParams).toString();
        const response = await fetch(`/api/statistics?${queryString}`);

        if (!response.ok) throw new Error(`Error: ${response.status}`);

        const data = await response.json();
        if (Object.keys(data).length === 0) {
            showError('No se encontraron datos con los filtros seleccionados');
            return;
        }
        updateSummaryCards(data);
        
        // Cerrar modal si existe
        const modal = bootstrap.Modal.getInstance(document.getElementById('filterModal'));
        if (modal) modal.hide();
        
    } catch (error) {
        console.error('Error al cargar datos filtrados:', error);
        showError('Error al cargar los datos filtrados');
    }
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger alert-dismissible fade show';
    errorDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    document.querySelector('.statistics-container').prepend(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Mejorar funcionalidad de botones de expansión
document.querySelectorAll('.btn-expand').forEach(btn => {
    btn.addEventListener('click', function() {
        const card = this.closest('.detail-card');
        const list = card.querySelector('.scrollable-list');
        const icon = this.querySelector('i');
        
        if (card.classList.contains('expanded')) {
            list.style.maxHeight = '300px';
            card.classList.remove('expanded');
            icon.className = 'fas fa-chevron-down';
        } else {
            list.style.maxHeight = list.scrollHeight + 'px';
            card.classList.add('expanded');
            icon.className = 'fas fa-chevron-up';
        }
    });
});

function showError(message) {
    const container = document.getElementById('detailedView');
    if (container) {
        container.innerHTML = `<div class="alert alert-danger">${message}</div>`;
    }
    console.error(message);
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