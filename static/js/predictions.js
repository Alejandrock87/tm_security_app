// Establecer conexión con Socket.IO
let socket = io();
let notificationPermission = false;

document.addEventListener('DOMContentLoaded', function() {
    const notificationToggle = document.getElementById('notificationToggle');
    const predictionsList = document.getElementById('predictionsList');

    // Inicializar el estado del toggle basado en permisos existentes
    if (Notification.permission === 'granted') {
        notificationToggle.checked = true;
        notificationPermission = true;
    } else {
        notificationToggle.checked = false;
        notificationPermission = false;
    }

    // Manejar cambios en el toggle de notificaciones
    notificationToggle.addEventListener('change', async function() {
        if (this.checked) {
            try {
                const permission = await Notification.requestPermission();
                console.log('Permiso de notificación:', permission);
                if (permission === 'granted') {
                    notificationPermission = true;
                    console.log('Notificaciones activadas.');
                } else {
                    // Mantener el toggle activado pero mostrar el mensaje
                    notificationPermission = true;
                    alert('Para recibir notificaciones, necesitas permitirlas en la configuración de tu navegador');
                }
            } catch (error) {
                console.error('Error al solicitar permisos:', error);
                // Mantener el toggle activado en caso de error
                notificationPermission = true;
            }
        } else {
            notificationPermission = false;
            console.log('Notificaciones desactivadas.');
        }
    });

    // Manejar eventos de Socket.IO
    socket.on('prediction_alert', function(data) {
        checkAndAddPrediction(data);
        if (notificationPermission) {
            showNotification(data);
        }
    });

    // Cargar predicciones al inicio
    loadAndCheckPredictions();
    // Actualizar predicciones cada minuto
    setInterval(loadAndCheckPredictions, 60000);
});

// Función para cargar y verificar predicciones desde la API
function loadAndCheckPredictions() {
    fetch('/api/predictions')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(predictions => {
            // Limpiar lista actual
            const predictionsList = document.getElementById('predictionsList');
            predictionsList.innerHTML = '';

            // Agregar cada predicción válida
            predictions.forEach(checkAndAddPrediction);
        })
        .catch(error => {
            console.error('Error al cargar predicciones:', error);
        });
}

// Función para agregar una predicción a la lista si está dentro del rango de tiempo
function checkAndAddPrediction(prediction) {
    const predTime = new Date(prediction.predicted_time);
    const now = new Date();
    const diffMinutes = Math.floor((predTime - now) / (1000 * 60));

    // Solo mostrar si falta entre 60 y 0 minutos
    if (diffMinutes <= 60 && diffMinutes >= 0) {
        const predictionsList = document.getElementById('predictionsList');
        const item = document.createElement('div');
        item.className = `prediction-item prediction-item-${getRiskClass(prediction.risk_score)}`;

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

// Función para mostrar una notificación del navegador
function showNotification(prediction) {
    const predTime = new Date(prediction.predicted_time);
    const now = new Date();
    const diffMinutes = Math.floor((predTime - now) / (1000 * 60));

    if (diffMinutes <= 60 && diffMinutes >= 0) {
        const notification = new Notification('Alerta de Seguridad', {
            body: `Posible ${prediction.incident_type} en ${prediction.station} en ${diffMinutes} minutos.\nNivel de riesgo: ${(prediction.risk_score * 100).toFixed(1)}%`,
            icon: '/static/images/alert-icon.png'
        });

        // Opcional: Manejar clic en la notificación
        notification.onclick = function() {
            window.focus();
            // Puedes agregar lógica adicional aquí, como redireccionar a una página específica
        };
    }
}

// Función para obtener la clase de riesgo basada en el score
function getRiskClass(risk_score) {
    if (risk_score > 0.7) return 'danger';
    if (risk_score > 0.4) return 'warning';
    return 'info';
}

// Función para obtener el tiempo restante hasta el incidente
function getTimeUntilIncident(predicted_time) {
    const now = new Date();
    const predTime = new Date(predicted_time);
    const diffMinutes = Math.floor((predTime - now) / (1000 * 60));

    if (diffMinutes < 60) {
        return `En ${diffMinutes} minutos`;
    }
    return `En 1 hora`;
}
