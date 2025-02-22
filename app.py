from gevent import monkey
monkey.patch_all()

import os
import logging
from flask import Flask
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

# Configurar Socket.IO con opciones específicas para gevent
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode='gevent',
    logger=True,
    engineio_logger=True,
    ping_timeout=5,
    ping_interval=25
)

# Configurar cache
cache = Cache(config={'CACHE_TYPE': 'SimpleCache'})
cache.init_app(app)

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