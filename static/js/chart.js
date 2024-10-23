function createChart(stats) {
    try {
        const chartContainer = document.getElementById('incidentChart');
        if (!chartContainer) {
            console.log('Chart container not found');
            return;
        }

        // Check if stats exists and has the required data
        if (!stats || !stats.incidents_by_type) {
            console.log('No statistics data available');
            return;
        }

        // Convert incidents_by_type to arrays, handling empty objects
        const labels = Object.keys(stats.incidents_by_type);
        const values = Object.values(stats.incidents_by_type);

        if (labels.length === 0) {
            console.log('No incident types available');
            return;
        }

        const ctx = chartContainer.getContext('2d');
        if (!ctx) {
            console.log('Could not get chart context');
            return;
        }

        // Define chart colors
        const colors = [
            '#FF6384',
            '#36A2EB',
            '#FFCE56',
            '#4BC0C0',
            '#9966FF',
            '#FF9F40'
        ];

        const data = {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 1
            }]
        };

        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#ffffff',
                        padding: 20
                    }
                },
                title: {
                    display: true,
                    text: 'Distribución de Incidentes',
                    color: '#ffffff',
                    padding: {
                        top: 10,
                        bottom: 30
                    },
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                }
            }
        };

        // Destroy existing chart if it exists
        const existingChart = Chart.getChart(ctx);
        if (existingChart) {
            existingChart.destroy();
        }

        new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: options
        });
    } catch (error) {
        console.error('Error creating chart:', error);
    }
}
