from gevent import monkey
monkey.patch_all()

import os
import logging
from flask import Flask, request
from flask_login import LoginManager
from database import init_db, db
from flask_caching import Cache
from flask_socketio import SocketIO

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

# Crear la aplicación Flask
app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or "a secret key"

# Configuración adicional de sesión
app.config.update(
    SESSION_COOKIE_SECURE=False,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    PERMANENT_SESSION_LIFETIME=1800
)

# Configurar cache
cache = Cache(config={
    'CACHE_TYPE': 'SimpleCache',
    'CACHE_DEFAULT_TIMEOUT': 3600,
    'CACHE_THRESHOLD': 1000
})
cache.init_app(app)

# Configurar Socket.IO
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode='gevent',
    logger=True,
    engineio_logger=True,
    ping_timeout=60,
    ping_interval=25
)

# Configurar base de datos
database_url = os.environ.get("DATABASE_URL")
if not database_url:
    logger.info("Construyendo DATABASE_URL desde variables de entorno")
    database_url = f"postgresql://{os.environ.get('PGUSER')}:{os.environ.get('PGPASSWORD')}@{os.environ.get('PGHOST')}:{os.environ.get('PGPORT')}/{os.environ.get('PGDATABASE')}"

app.config["SQLALCHEMY_DATABASE_URI"] = database_url
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True
}
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Inicializar base de datos
try:
    logger.info("Inicializando base de datos...")
    init_db(app)
    with app.app_context():
        import models
        db.create_all()
    logger.info("Base de datos inicializada correctamente")
except Exception as e:
    logger.error(f"Error al inicializar la base de datos: {str(e)}")
    raise

# Inicializar login manager
try:
    logger.info("Configurando login manager...")
    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = 'login'
    logger.info("Login manager configurado correctamente")
except Exception as e:
    logger.error(f"Error al configurar login manager: {str(e)}")
    raise

@login_manager.user_loader
def load_user(user_id):
    from models import User
    return User.query.get(int(user_id))

# Importar e inicializar rutas
try:
    logger.info("Importando e inicializando rutas...")
    from routes import init_routes
    init_routes(app)
    logger.info("Rutas inicializadas correctamente")
except Exception as e:
    logger.error(f"Error al inicializar rutas: {str(e)}")
    raise

logger.info("Aplicación Flask configurada completamente")