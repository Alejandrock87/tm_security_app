from flask_caching import Cache
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
import logging
from flask import request

logger = logging.getLogger(__name__)

# Initialize extensions
cache = Cache(config={
    'CACHE_TYPE': 'SimpleCache',
    'CACHE_DEFAULT_TIMEOUT': 300
})
socketio = SocketIO(
    cors_allowed_origins="*",
    async_mode='gevent',
    logger=True,
    engineio_logger=True,
    ping_timeout=60,
    ping_interval=25
)
db = SQLAlchemy()
login_manager = LoginManager()

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

def init_extensions(app):
    logger.info("Iniciando inicialización de extensiones...")
    cache.init_app(app)
    logger.info("Cache inicializado correctamente")
    db.init_app(app)
    logger.info("SQLAlchemy inicializado correctamente")
    login_manager.init_app(app)
    login_manager.login_view = 'login'
    logger.info("Login Manager inicializado correctamente")
    socketio.init_app(app)
    logger.info("SocketIO inicializado correctamente")
    logger.info("Todas las extensiones inicializadas correctamente")