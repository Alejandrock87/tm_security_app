# Monkey patch debe ser lo primero
from gevent import monkey
monkey.patch_all()

import os
import logging
import sys

# Configurar logging más detallado
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('app.log')
    ]
)
logger = logging.getLogger(__name__)

try:
    # Verificar variables de entorno críticas
    logger.info("Verificando variables de entorno...")
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        logger.warning("DATABASE_URL no encontrada")
    else:
        logger.info("DATABASE_URL encontrada")

    # Importar la aplicación Flask y SocketIO después del monkey patch
    logger.info("Importando módulos de la aplicación...")
    from app import app, socketio
    logger.info("Aplicación Flask y SocketIO importados correctamente")

    if __name__ == '__main__':
        try:
            logger.info("Iniciando aplicación Flask")
            port = int(os.environ.get('PORT', 5000))
            logger.info(f"Intentando iniciar servidor en puerto {port}")

            socketio.run(
                app,
                host='0.0.0.0',
                port=8080,
                debug=False,
                use_reloader=False,
                log_output=True
            )
        except Exception as e:
            logger.error(f"Error al iniciar servidor: {str(e)}", exc_info=True)
            raise

except ImportError as e:
    logger.error(f"Error al importar módulos necesarios: {str(e)}", exc_info=True)
    raise
except Exception as e:
    logger.error(f"Error en la configuración inicial: {str(e)}", exc_info=True)
    raise