from gevent import monkey
monkey.patch_all()

import os
import logging
from flask import Flask
from extensions import init_extensions, cache, socketio, db, login_manager

# Configurar logging más detallado
logging.basicConfig(
    level=logging.INFO if os.environ.get("FLASK_ENV") == "production" else logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Crear la aplicación Flask
app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or "a secret key"

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

# Inicializar extensiones
try:
    logger.debug("Inicializando extensiones...")
    init_extensions(app)
    logger.info("Extensiones inicializadas correctamente")
except Exception as e:
    logger.error(f"Error al inicializar extensiones: {str(e)}")
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

@app.route('/test_connection')
def test_connection():
    return 'Server is running correctly', 200

logger.info("Aplicación Flask configurada completamente")

if __name__ == '__main__':
    debug_mode = os.environ.get("FLASK_ENV") != "production"
    port = int(os.environ.get("PORT", 5000))
    logger.info(f"Iniciando servidor en modo {'debug' if debug_mode else 'producción'} en el puerto {port}")
    socketio.run(app, 
                 host='0.0.0.0',
                 port=port,
                 debug=debug_mode,
                 use_reloader=debug_mode,
                 log_output=True)