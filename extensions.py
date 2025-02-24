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
    cache.init_app(app)

    # Configuración detallada de SocketIO con manejo de eventos
    socketio.init_app(
        app,
        async_mode='gevent',
        cors_allowed_origins="*",
        logger=True,
        engineio_logger=True,
        ping_timeout=60,
        ping_interval=25
    )

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

    db.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = 'login'

    logger.info("Todas las extensiones inicializadas correctamente")