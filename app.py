from gevent import monkey
monkey.patch_all()

import os
import logging
from flask import Flask, request
from flask_login import LoginManager
from database import init_db, db
from flask_caching import Cache
from flask_socketio import SocketIO

# Configurar logging más detallado
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Crear la aplicación Flask
app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or "a secret key"

# Configuración adicional de sesión
app.config.update(
    SESSION_COOKIE_SECURE=False,  # Permitir cookies sin HTTPS en desarrollo
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    PERMANENT_SESSION_LIFETIME=1800  # 30 minutos
)

# Configurar cache con opciones específicas para mejor rendimiento
cache = Cache(config={
    'CACHE_TYPE': 'SimpleCache',
    'CACHE_DEFAULT_TIMEOUT': 3600,  # 1 hora
    'CACHE_THRESHOLD': 1000  # Máximo número de items en cache
})
cache.init_app(app)

# Configurar Socket.IO con opciones específicas para gevent
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode='gevent',
    logger=True,
    engineio_logger=True,
    ping_timeout=5,
    ping_interval=25,
    manage_session=False,
    always_connect=True,
    reconnection=True,
    reconnection_attempts=5,
    reconnection_delay=1000,
    reconnection_delay_max=5000
)

# Agregar logging para depuración de Socket.IO
@socketio.on('connect')
def handle_connect():
    logger.info('Cliente conectado a Socket.IO')
    logger.debug(f'Headers de conexión: {dict(request.headers) if request else "No headers"}')

@socketio.on('disconnect')
def handle_disconnect():
    logger.info('Cliente desconectado de Socket.IO')

@socketio.on_error()
def handle_error(e):
    logger.error(f'Error en Socket.IO: {str(e)}')

# Configurar base de datos
database_url = os.environ.get("DATABASE_URL")
if not database_url:
    logger.info("Construyendo DATABASE_URL desde variables de entorno")
    database_url = f"postgresql://{os.environ.get('PGUSER')}:{os.environ.get('PGPASSWORD')}@{os.environ.get('PGHOST')}:{os.environ.get('PGPORT')}/{os.environ.get('PGDATABASE')}"

logger.debug(f"Intentando conectar a la base de datos...")

app.config["SQLALCHEMY_DATABASE_URI"] = database_url
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True
}
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Inicializar base de datos
try:
    logger.debug("Inicializando base de datos...")
    init_db(app)
    logger.info("Base de datos inicializada correctamente")
except Exception as e:
    logger.error(f"Error al inicializar la base de datos: {str(e)}")
    raise

# Inicializar login manager
try:
    logger.debug("Configurando login manager...")
    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = 'login'
    logger.info("Login manager configurado correctamente")
except Exception as e:
    logger.error(f"Error al configurar login manager: {str(e)}")
    raise

@login_manager.user_loader
def load_user(user_id):
    logger.debug(f"Cargando usuario con ID: {user_id}")
    from models import User
    return User.query.get(int(user_id))

# Crear tablas de la base de datos
with app.app_context():
    try:
        logger.debug("Creando tablas de la base de datos...")
        import models
        db.create_all()
        logger.info("Tablas creadas correctamente")
    except Exception as e:
        logger.error(f"Error al crear tablas: {str(e)}")
        raise

# Importar e inicializar rutas
try:
    logger.debug("Importando e inicializando rutas...")
    from routes import init_routes
    init_routes(app)
    logger.info("Rutas inicializadas correctamente")
except Exception as e:
    logger.error(f"Error al inicializar rutas: {str(e)}")
    raise

logger.info("Aplicación Flask configurada completamente")