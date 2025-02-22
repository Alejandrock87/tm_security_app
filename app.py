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

# Configurar cache
cache = Cache(config={'CACHE_TYPE': 'SimpleCache'})
socketio = None

def create_app():
    logger.info("Iniciando creación de la aplicación Flask")
    app = Flask(__name__)

    try:
        # Inicializar cache
        logger.info("Inicializando cache")
        cache.init_app(app)

        # Configurar secret key
        logger.info("Configurando secret key")
        app.secret_key = os.environ.get("FLASK_SECRET_KEY") or "a secret key"

        # Configurar base de datos
        logger.info("Configurando base de datos")
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
        logger.info("Inicializando base de datos")
        init_db(app)

        # Inicializar login manager
        logger.info("Inicializando login manager")
        login_manager = LoginManager()
        login_manager.init_app(app)
        login_manager.login_view = 'login'

        @login_manager.user_loader
        def load_user(user_id):
            logger.debug(f"Cargando usuario con ID: {user_id}")
            from models import User
            return User.query.get(int(user_id))

        # Crear tablas de la base de datos
        with app.app_context():
            logger.info("Creando tablas de la base de datos")
            import models
            db.create_all()

        # Inicializar Socket.IO después de configurar la aplicación
        logger.info("Inicializando Socket.IO")
        global socketio
        socketio = SocketIO(
            app,
            async_mode='gevent',
            cors_allowed_origins="*",
            logger=True
        )

        # Importar e inicializar rutas
        logger.info("Inicializando rutas")
        from routes import init_routes
        init_routes(app)

        logger.info("Aplicación Flask creada exitosamente")
        return app
    except Exception as e:
        logger.error(f"Error crítico creando la aplicación Flask: {str(e)}", exc_info=True)
        raise

# Create the Flask application instance
app = create_app()