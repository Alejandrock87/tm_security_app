from flask_caching import Cache
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
import logging
from flask import request

logger = logging.getLogger(__name__)

# Initialize extensions
cache = Cache()
socketio = SocketIO()
db = SQLAlchemy()
login_manager = LoginManager()

def init_extensions(app):
    try:
        logger.info("Iniciando inicialización de extensiones...")

        # Inicializar Cache con manejo de errores
        try:
            logger.debug("Inicializando Cache...")
            cache.init_app(app)
            logger.info("Cache inicializado correctamente")
        except Exception as e:
            logger.error(f"Error al inicializar Cache: {str(e)}")
            raise

        # Configuración detallada de SocketIO con manejo de eventos
        try:
            logger.debug("Inicializando SocketIO...")
            socketio.init_app(
                app,
                async_mode='gevent',
                cors_allowed_origins="*",
                logger=True,
                engineio_logger=True,
                ping_timeout=60,
                ping_interval=25
            )
            logger.info("SocketIO inicializado correctamente")
        except Exception as e:
            logger.error(f"Error al inicializar SocketIO: {str(e)}")
            raise

        # Agregar manejadores de eventos de SocketIO
        @socketio.on('connect')
        def handle_connect():
            logger.info(f"Cliente WebSocket conectado: {request.sid}")

        @socketio.on('disconnect')
        def handle_disconnect():
            logger.info(f"Cliente WebSocket desconectado: {request.sid}")

        @socketio.on_error()
        def handle_error(e):
            logger.error(f"Error en WebSocket: {str(e)}")

        # Inicializar base de datos
        try:
            logger.debug("Inicializando SQLAlchemy...")
            db.init_app(app)
            logger.info("SQLAlchemy inicializado correctamente")
        except Exception as e:
            logger.error(f"Error al inicializar SQLAlchemy: {str(e)}")
            raise

        # Inicializar login manager
        try:
            logger.debug("Inicializando Login Manager...")
            login_manager.init_app(app)
            login_manager.login_view = 'login'
            logger.info("Login Manager inicializado correctamente")
        except Exception as e:
            logger.error(f"Error al inicializar Login Manager: {str(e)}")
            raise

        logger.info("Todas las extensiones inicializadas correctamente")

    except Exception as e:
        logger.error(f"Error general durante la inicialización de extensiones: {str(e)}")
        raise