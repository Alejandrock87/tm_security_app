
function createChart(data) {
    try {
        const ctx = document.getElementById('incidentChart');
        if (!ctx) {
            console.warn('Canvas element not found');
            return;
        }

        // Obtener instancia existente del gráfico
        let existingChart;
        try {
            existingChart = Chart.getChart(ctx);
            if (existingChart) {
                existingChart.destroy();
            }
        } catch (e) {
            console.warn('No existing chart found');
        }

        const incidents = data.incidents_by_type || {};
        const labels = Object.keys(incidents);
        const values = Object.values(incidents);

        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: [
                        '#FF6384',
                        '#36A2EB',
                        '#FFCE56',
                        '#4BC0C0',
                        '#9966FF'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    title: {
                        display: true,
                        text: 'Distribución de Incidentes'
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating chart:', error);
    }
}
