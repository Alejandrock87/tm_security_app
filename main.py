from gevent import monkey
monkey.patch_all()

import os
import logging
import socket

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
        return False
    finally:
        sock.close()

# Importar la aplicación Flask y SocketIO después del monkey patch
from app import app, socketio

if __name__ == '__main__':
    try:
        logger.info("Starting Flask application")
        port = int(os.environ.get('PORT', 5000))
        logger.info(f"Server will start on port {port}")

        # Verificar puerto
        if not check_port_availability(port):
            logger.error(f"Port {port} is not available!")
            alternative_port = 5000
            if check_port_availability(alternative_port):
                port = alternative_port
                logger.info(f"Using alternative port {port}")
            else:
                raise Exception(f"Neither port {port} nor {alternative_port} are available")

        # Verificar que el servidor puede iniciar
        logger.info("Testing server configuration...")
        test_response = app.test_client().get('/health')
        logger.info(f"Test response status: {test_response.status_code}")

        # Iniciar el servidor con SocketIO
        socketio.run(
            app,
            host='0.0.0.0',  # Asegurar que escucha en todas las interfaces
            port=port,       # Usar puerto 5000
            debug=True,
            use_reloader=False,  # Evitar problemas con el reloader y SocketIO
            log_output=True
        )
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}", exc_info=True)
        raise