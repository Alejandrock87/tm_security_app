// Establecer conexión con Socket.IO
let socket = io();
let notificationPermission = localStorage.getItem('notificationPermission') === 'true';

document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando página de predicciones...');
    const notificationToggle = document.getElementById('notificationToggle');
    const predictionsList = document.getElementById('predictionsList');

    // Registrar Service Worker para notificaciones
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/static/js/service-worker.js')
            .then(registration => {
                console.log('ServiceWorker registrado:', registration);
            })
            .catch(error => {
                console.error('Error registrando ServiceWorker:', error);
            });
    }

    // Inicializar el estado del toggle basado en localStorage
    if (notificationPermission) {
        notificationToggle.checked = true;
        console.log('Notificaciones activadas desde localStorage');
    }

    // Manejar cambios en el toggle de notificaciones
    notificationToggle.addEventListener('change', async function() {
        console.log('Toggle de notificaciones cambiado:', this.checked);
        if (this.checked) {
            try {
                const permission = await Notification.requestPermission();
                console.log('Permiso de notificación:', permission);
                if (permission === 'granted') {
                    notificationPermission = true;
                    localStorage.setItem('notificationPermission', 'true');
                    console.log('Notificaciones activadas.');
                    // Emitir evento al servidor para suscribirse a notificaciones
                    socket.emit('subscribe_notifications', { userId: getUserId() });
                } else {
                    notificationToggle.checked = false;
                    alert('Para recibir notificaciones, necesitas permitirlas en la configuración de tu navegador');
                }
            } catch (error) {
                console.error('Error al solicitar permisos:', error);
                notificationToggle.checked = false;
            }
        } else {
            notificationPermission = false;
            localStorage.setItem('notificationPermission', 'false');
            console.log('Notificaciones desactivadas.');
            // Emitir evento al servidor para desuscribirse de notificaciones
            socket.emit('unsubscribe_notifications', { userId: getUserId() });
        }
    });

    // Manejar eventos de Socket.IO
    socket.on('connect', () => {
        console.log('Conectado a Socket.IO');
        console.log('Conectado al servidor Socket.IO');
        if (notificationPermission) {
            socket.emit('subscribe_notifications', { userId: getUserId() });
        }
    });

    socket.on('disconnect', () => {
        console.log('Desconectado de Socket.IO');
    });

    socket.on('prediction_alert', function(data) {
        console.log('Nueva predicción recibida:', data);
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
    console.log('Cargando predicciones...');
    const predictionsList = document.getElementById('predictionsList');
    predictionsList.innerHTML = '<div class="loading-message">Cargando predicciones...</div>';

    fetch('/api/predictions')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Predicciones recibidas:', data);
            predictionsList.innerHTML = '';

            if (data.error) {
                predictionsList.innerHTML = `
                    <div class="alert alert-warning" role="alert">
                        <i class="fas fa-exclamation-triangle"></i>
                        ${data.error}
                    </div>`;
                return;
            }

            if (!data.length) {
                predictionsList.innerHTML = `
                    <div class="alert alert-info" role="alert">
                        <i class="fas fa-info-circle"></i>
                        No hay predicciones disponibles en este momento.
                    </div>`;
                return;
            }

            // Agregar cada predicción válida
            data.forEach(checkAndAddPrediction);
        })
        .catch(error => {
            console.error('Error al cargar predicciones:', error);
            predictionsList.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <i class="fas fa-exclamation-circle"></i>
                    Error al cargar las predicciones. Por favor, intente de nuevo más tarde.
                </div>`;
        });
}

// Función para agregar una predicción a la lista si está dentro del rango de tiempo
function checkAndAddPrediction(prediction) {
    if (!prediction || !prediction.predicted_time) {
        console.warn('Predicción inválida:', prediction);
        return;
    }

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
    console.log('Intentando mostrar notificación para:', prediction);
    const predTime = new Date(prediction.predicted_time);
    const now = new Date();
    const diffMinutes = Math.floor((predTime - now) / (1000 * 60));

    if (diffMinutes <= 60 && diffMinutes >= 0 && notificationPermission) {
        try {
            const notification = new Notification('Alerta de Seguridad', {
                body: `Posible ${prediction.incident_type} en ${prediction.station} en ${diffMinutes} minutos.\nNivel de riesgo: ${(prediction.risk_score * 100).toFixed(1)}%`,
                icon: '/static/images/alert-icon.png'
            });

            notification.onclick = function() {
                window.focus();
                this.close();
            };
        } catch (error) {
            console.error('Error al mostrar notificación:', error);
        }
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

// Función auxiliar para obtener el ID del usuario
function getUserId() {
    // Esta función debe ser implementada según tu sistema de autenticación
    return document.body.dataset.userId || 'anonymous';
}