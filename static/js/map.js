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
} catch (error) {
    console.error('Error creating chart:', error);
}