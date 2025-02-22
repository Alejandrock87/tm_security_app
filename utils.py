from flask_socketio import SocketIO
from flask import jsonify
import json

socketio = SocketIO()

def send_notification(incident_type, timestamp):
    socketio.emit('new_incident', {'incident_type': incident_type, 'timestamp': timestamp})

def send_push_notification(incident_type, timestamp, device_token):
    try:
        notification_data = {
            'incident_type': incident_type,
            'timestamp': timestamp,
            'title': 'Alerta de Seguridad',
            'body': f'Nuevo incidente de {incident_type} reportado'
        }
        
        # Enviar notificación en tiempo real
        socketio.emit('new_notification', notification_data)
        
        # Guardar en historial
        save_notification_history(notification_data)
        
        return True
    except Exception as e:
        logging.error(f"Error sending notification: {str(e)}")
        return False
