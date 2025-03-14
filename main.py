from gevent import monkey
monkey.patch_all()

import os
import logging

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

# Importar la aplicación Flask y SocketIO después del monkey patch
from app import app, socketio

if __name__ == '__main__':
    try:
        logger.info("Starting Flask application")
        port = int(os.environ.get('PORT', 5000))  # Usar puerto 5000 por defecto
        logger.info(f"Server will start on port {port}")

        # Iniciar el servidor con SocketIO
        socketio.run(
            app,
            host='0.0.0.0',  # Escuchar en todas las interfaces
            port=port,
            debug=True,
            use_reloader=False,  # Deshabilitar reloader para evitar problemas con SocketIO
            log_output=True
        )
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}", exc_info=True)
        raise