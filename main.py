import os
from app import app, socketio

# Set Werkzeug debug pin to None for development purposes
os.environ['WERKZEUG_DEBUG_PIN'] = 'None'

if __name__ == '__main__':
    port = int(os.getenv('PORT', 3000))
    socketio.run(app, 
                host='0.0.0.0', 
                port=port, 
                debug=False,  # Cambiado a False para producción
                allow_unsafe_werkzeug=False,  # Cambiado a False para producción
                use_reloader=False,  # Deshabilitado para producción
                log_output=True  # Mantenemos los logs para monitorear la aplicación
    )