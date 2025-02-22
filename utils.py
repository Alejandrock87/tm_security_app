from flask_socketio import SocketIO
from flask import jsonify
import json

socketio = SocketIO()

def send_notification(incident_type, timestamp):
    socketio.emit('new_incident', {'incident_type': incident_type, 'timestamp': timestamp})

def send_push_notification(incident_type, timestamp, nearest_station, device_token=None):
    try:
        notification_data = {
            'incident_type': incident_type,
            'timestamp': timestamp,
            'nearest_station': nearest_station,
            'title': 'Alerta de Seguridad',
            'body': f'Nuevo incidente de {incident_type} en {nearest_station}'
        }
        
        # Enviar notificación en tiempo real vía socket.io
        socketio.emit('new_notification', notification_data)
        
        # Si hay token de dispositivo, enviar push notification
        if device_token:
            try:
                webpush(
                    subscription_info=json.loads(device_token),
                    data=json.dumps(notification_data),
                    vapid_private_key="your-vapid-private-key",
                    vapid_claims={"sub": "mailto:your-email@example.com"}
                )
            except Exception as push_error:
                logging.error(f"Error sending push notification: {str(push_error)}")
        
        # Guardar en historial
        with transaction_context():
            notification = Notification(
                incident_type=incident_type,
                timestamp=datetime.fromisoformat(timestamp),
                nearest_station=nearest_station
            )
            db.session.add(notification)
        
        return True
    except Exception as e:
        logging.error(f"Error in notification system: {str(e)}")
        return Falsee
