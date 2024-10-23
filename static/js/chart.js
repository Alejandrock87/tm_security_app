function createChart(stats) {
    try {
        const chartContainer = document.getElementById('incidentChart');
        if (!chartContainer) {
            console.log('Chart container not found');
            return;
        }

        if (!stats || !stats.incidents_by_type || Object.keys(stats.incidents_by_type).length === 0) {
            console.log('No statistics data available');
            return;
        }

        const ctx = chartContainer.getContext('2d');
        if (!ctx) {
            console.log('Could not get chart context');
            return;
        }

        const data = {
            labels: Object.keys(stats.incidents_by_type),
            datasets: [{
                data: Object.values(stats.incidents_by_type),
                backgroundColor: [
                    '#FF6384',
                    '#36A2EB',
                    '#FFCE56',
                    '#4BC0C0',
                    '#9966FF',
                    '#FF9F40'
                ]
            }]
        };

        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#ffffff'
                    }
                },
                title: {
                    display: true,
                    text: 'Distribución de Incidentes',
                    color: '#ffffff'
                }
            }
        };

        new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: options
        });
    } catch (error) {
        console.error('Error creating chart:', error);
    }
}
