# Monkey patch debe ser lo primero
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
        sock.close()
        return False

# Importar la aplicación Flask y SocketIO después del monkey patch
try:
    from app import app, socketio
    logger.info("Aplicación Flask y SocketIO importados correctamente")
except Exception as e:
    logger.error(f"Error al importar app: {str(e)}", exc_info=True)
    raise

if __name__ == '__main__':
    try:
        logger.info("Iniciando aplicación Flask")
        port = 5000  # Forzar puerto 5000 para Replit
        logger.info(f"Intentando iniciar servidor en puerto {port}")

        # Iniciar el servidor con SocketIO
        logger.info("Iniciando servidor SocketIO...")
        socketio.run(
            app,
            host='0.0.0.0',
            port=port,
            debug=True,
            use_reloader=False,
            log_output=True
        )
    except Exception as e:
        logger.error(f"Error al iniciar servidor: {str(e)}", exc_info=True)
        raise