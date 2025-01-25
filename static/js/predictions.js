
let socket = io();
let notificationPermission = false;

document.addEventListener('DOMContentLoaded', function() {
    const notificationToggle = document.getElementById('notificationToggle');
    const predictionsList = document.getElementById('predictionsList');

    notificationToggle.addEventListener('change', function() {
        if (this.checked) {
            Notification.requestPermission().then(function(permission) {
                notificationPermission = permission === 'granted';
                if (!notificationPermission) {
                    notificationToggle.checked = false;
                    alert('Necesitamos permisos para mostrar notificaciones');
                }
            });
        } else {
            notificationPermission = false;
        }
    });

    socket.on('prediction_alert', function(data) {
        addPredictionToList(data);
        if (notificationPermission) {
            showNotification(data);
        }
    });

    // Cargar predicciones iniciales
    fetch('/api/predictions')
        .then(response => response.json())
        .then(predictions => {
            predictions.forEach(addPredictionToList);
        });
});

function addPredictionToList(prediction) {
    const predictionsList = document.getElementById('predictionsList');
    const item = document.createElement('div');
    item.className = `list-group-item list-group-item-${getRiskClass(prediction.risk_score)}`;
    
    const timeUntil = getTimeUntilIncident(prediction.predicted_time);
    
    item.innerHTML = `
        <div class="d-flex w-100 justify-content-between">
            <h5 class="mb-1">${prediction.station}</h5>
            <small>${timeUntil}</small>
        </div>
        <p class="mb-1">Posible ${prediction.incident_type}</p>
        <small>Nivel de riesgo: ${(prediction.risk_score * 100).toFixed(1)}%</small>
    `;
    
    predictionsList.prepend(item);
}

function showNotification(prediction) {
    new Notification('Alerta de Seguridad', {
        body: `Posible ${prediction.incident_type} en ${prediction.station} en 1 hora.\nNivel de riesgo: ${(prediction.risk_score * 100).toFixed(1)}%`,
        icon: '/static/images/alert-icon.png'
    });
}

function getRiskClass(risk_score) {
    if (risk_score > 0.7) return 'danger';
    if (risk_score > 0.4) return 'warning';
    return 'info';
}

function getTimeUntilIncident(predicted_time) {
    const now = new Date();
    const predTime = new Date(predicted_time);
    const diffMinutes = Math.floor((predTime - now) / (1000 * 60));
    
    if (diffMinutes < 60) {
        return `En ${diffMinutes} minutos`;
    }
    return `En ${Math.floor(diffMinutes / 60)} horas`;
}
