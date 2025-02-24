from flask import Flask, request
from flask_cors import CORS
from extensions import init_extensions, cache, socketio, db, login_manager
import os
import logging

# Configurar logging más detallado
logging.basicConfig(
    level=logging.INFO if os.environ.get("FLASK_ENV") == "production" else logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Crear la aplicación Flask
app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or "a secret key"

# Configurar CORS con opciones más específicas
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

# Configuración del cache
app.config['CACHE_TYPE'] = 'SimpleCache'
app.config['CACHE_DEFAULT_TIMEOUT'] = 300

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

# Inicializar extensiones antes de importar modelos o rutas
db.init_app(app)
login_manager.init_app(app)
login_manager.login_view = 'login'

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

# Inicializar el resto de las extensiones después de la base de datos
try:
    logger.debug("Inicializando extensiones...")
    cache.init_app(app)
    socketio.init_app(
        app,
        async_mode='gevent',
        cors_allowed_origins="*",
        logger=True,
        engineio_logger=True,
        ping_timeout=60,
        ping_interval=25
    )
    logger.info("Extensiones inicializadas correctamente")
except Exception as e:
    logger.error(f"Error al inicializar extensiones: {str(e)}")
    raise

# Importar e inicializar rutas después de que todo esté configurado
try:
    logger.debug("Importando e inicializando rutas...")
    from routes import init_routes
    init_routes(app)
    logger.info("Rutas inicializadas correctamente")
except Exception as e:
    logger.error(f"Error al inicializar rutas: {str(e)}")
    raise

logger.info("Aplicación Flask configurada completamente")