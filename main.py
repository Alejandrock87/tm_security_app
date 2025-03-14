from gevent import monkey
monkey.patch_all()

import os
import logging
import socket
from flask_cors import CORS

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('app.log')
    ]
)
logger = logging.getLogger(__name__)

# Verificar disponibilidad del puerto
def check_port_availability(port):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        sock.bind(('0.0.0.0', port))
        sock.close()
        return True
    except:
        sock.close()
        return False

# Importar la aplicación Flask y SocketIO después del monkey patch
from app import app, socketio

# Configurar CORS
CORS(app, resources={r"/*": {"origins": "*"}})

if __name__ == '__main__':
    try:
        logger.info("Starting Flask application")
        port = int(os.environ.get('PORT', 5000))
        logger.info(f"Attempting to start server on port {port}")

        # No verificamos el puerto ya que Replit maneja esto internamente
        logger.info("Testing server configuration...")
        test_response = app.test_client().get('/health')
        logger.info(f"Test response status: {test_response.status_code}")

        # Iniciar el servidor con SocketIO
        logger.info("Starting SocketIO server...")
        socketio.run(
            app,
            host='0.0.0.0',
            port=port,
            debug=True,
            use_reloader=False,
            log_output=True,
            cors_allowed_origins="*"  # Permitir conexiones WebSocket desde cualquier origen
        )
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}", exc_info=True)
        raise