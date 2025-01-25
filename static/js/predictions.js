
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
        checkAndAddPrediction(data);
        if (notificationPermission) {
            showNotification(data);
        }
    });

    // Iniciar el checker de predicciones
    loadAndCheckPredictions();
    // Actualizar cada minuto
    setInterval(loadAndCheckPredictions, 60000);
});

function loadAndCheckPredictions() {
    fetch('/api/predictions')
        .then(response => response.json())
        .then(predictions => {
            // Limpiar lista actual
            const predictionsList = document.getElementById('predictionsList');
            predictionsList.innerHTML = '';
            
            // Revisar cada predicción
            predictions.forEach(checkAndAddPrediction);
        });
}

function checkAndAddPrediction(prediction) {
    const predTime = new Date(prediction.predicted_time);
    const now = new Date();
    const diffMinutes = Math.floor((predTime - now) / (1000 * 60));
    
    // Solo mostrar si falta entre 60 y 0 minutos
    if (diffMinutes <= 60 && diffMinutes >= 0) {
        const predictionsList = document.getElementById('predictionsList');
        const item = document.createElement('div');
        item.className = `list-group-item list-group-item-${getRiskClass(prediction.risk_score)}`;
        
        item.innerHTML = `
            <div class="d-flex w-100 justify-content-between">
                <h5 class="mb-1">${prediction.station}</h5>
                <small>${getTimeUntilIncident(prediction.predicted_time)}</small>
            </div>
            <p class="mb-1">Posible ${prediction.incident_type}</p>
            <small>Nivel de riesgo: ${(prediction.risk_score * 100).toFixed(1)}%</small>
        `;
        
        predictionsList.prepend(item);
    }
}

function showNotification(prediction) {
    const predTime = new Date(prediction.predicted_time);
    const now = new Date();
    const diffMinutes = Math.floor((predTime - now) / (1000 * 60));
    
    if (diffMinutes <= 60 && diffMinutes >= 0) {
        new Notification('Alerta de Seguridad', {
            body: `Posible ${prediction.incident_type} en ${prediction.station} en ${diffMinutes} minutos.\nNivel de riesgo: ${(prediction.risk_score * 100).toFixed(1)}%`,
            icon: '/static/images/alert-icon.png'
        });
    }
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
    return `En 1 hora`;
}
