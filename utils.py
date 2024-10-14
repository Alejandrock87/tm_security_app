from flask_socketio import SocketIO
from flask import jsonify
import json

socketio = SocketIO()

def send_notification(incident_type, timestamp):
    socketio.emit('new_incident', {'incident_type': incident_type, 'timestamp': timestamp})

def send_push_notification(incident_type, timestamp, device_token):
    # In a real-world scenario, you would use a service like Firebase Cloud Messaging (FCM)
    # or Apple Push Notification Service (APNS) to send push notifications to mobile devices.
    # For this example, we'll simulate the push notification by emitting a special event.
    notification_data = {
        'incident_type': incident_type,
        'timestamp': timestamp,
        'device_token': device_token
    }
    socketio.emit('push_notification', json.dumps(notification_data))
    return jsonify({'success': True, 'message': 'Push notification sent'})
