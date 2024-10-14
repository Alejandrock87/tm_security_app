function createChart() {
    const ctx = document.getElementById('incidentChart').getContext('2d');
    const labels = statistics.incidents_by_day.map(day => day.date);
    const data = statistics.incidents_by_day.map(day => day.count);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Incidents per Day',
                data: data,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Incidents'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                }
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', createChart);
