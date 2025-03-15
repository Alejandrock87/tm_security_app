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
    required_env_vars = ['DATABASE_URL', 'FLASK_SECRET_KEY']
    missing_vars = [var for var in required_env_vars if not os.environ.get(var)]
    if missing_vars:
        logger.error(f"Faltan variables de entorno requeridas: {', '.join(missing_vars)}")
        if not os.environ.get('DATABASE_URL'):
            logger.info("Construyendo DATABASE_URL desde variables individuales...")
            database_url = f"postgresql://{os.environ.get('PGUSER')}:{os.environ.get('PGPASSWORD')}@{os.environ.get('PGHOST')}:{os.environ.get('PGPORT')}/{os.environ.get('PGDATABASE')}"
            os.environ['DATABASE_URL'] = database_url
            logger.info("DATABASE_URL construida exitosamente")

    # Importar la aplicación Flask
    logger.info("Importando módulos de la aplicación...")
    from app import app
    logger.info("Aplicación Flask importada correctamente")

    if __name__ == '__main__':
        try:
            logger.info("Iniciando aplicación Flask")
            port = int(os.environ.get('PORT', 5000))
            logger.info(f"Intentando iniciar servidor en puerto {port}")

            # Iniciar servidor Flask sin SocketIO temporalmente
            app.run(
                host='0.0.0.0',
                port=port,
                debug=True
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