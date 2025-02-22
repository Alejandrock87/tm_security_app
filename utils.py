from flask import jsonify
import json
import logging
from datetime import datetime
from models import Notification
from database import db
from pywebpush import webpush
from contextlib import contextmanager
import os

@contextmanager
def transaction_context():
    try:
        yield
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        logging.error(f"Transaction error: {str(e)}")
        raise

def send_notification(incident_type, timestamp):
    # Temporalmente deshabilitado Socket.IO
    logging.info(f"Notification received: {incident_type} at {timestamp}")
    return True

def send_push_notification(incident_type, timestamp, nearest_station, device_token=None):
    try:
        notification_data = {
            'incident_type': incident_type,
            'timestamp': timestamp,
            'nearest_station': nearest_station,
            'title': 'Alerta de Seguridad',
            'body': f'Nuevo incidente de {incident_type} en {nearest_station}'
        }

        # Si hay token de dispositivo, enviar push notification
        if device_token:
            try:
                webpush(
                    subscription_info=json.loads(device_token),
                    data=json.dumps(notification_data),
                    vapid_private_key=os.environ.get('VAPID_PRIVATE_KEY'),
                    vapid_claims={
                        "sub": "mailto:admin@transmileniosecurity.com"
                    }
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
        return False