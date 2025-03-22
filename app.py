import os
import logging
from flask import Flask, request, jsonify
from flask_login import LoginManager
from database import init_db, db
from flask_caching import Cache
from flask_socketio import SocketIO
from flask_cors import CORS
from datetime import datetime
from dotenv import load_dotenv
from config import Config

# Cargar variables de entorno
load_dotenv()

# Configurar logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('app.log')
    ]
)
logger = logging.getLogger(__name__)

try:
    # Crear la aplicación Flask
    app = Flask(__name__)
    logger.info("Aplicación Flask creada")

    # Cargar configuración desde el objeto Config
    app.config.from_object(Config)
    logger.info("Configuración cargada desde config.py")

    # Configurar CORS
    CORS(app, resources={r"/*": {"origins": "*"}})
    logger.info("CORS configurado")

    # Configurar cache
    cache = Cache(config={
        'CACHE_TYPE': 'SimpleCache',
        'CACHE_DEFAULT_TIMEOUT': 3600,
        'CACHE_THRESHOLD': 1000
    })
    cache.init_app(app)
    logger.info("Cache configurado")

    # Configurar Socket.IO
    socketio = SocketIO(
        app,
        async_mode='gevent',  # Cambiar a gevent ya que estamos usando gevent-websocket
        logger=True,
        engineio_logger=True,
        ping_timeout=60,
        ping_interval=25,
        manage_session=False,  # Evitar conflictos con la gestión de sesiones de Flask
        cors_allowed_origins="*",  # Use string instead of list
        allow_upgrades=True
    )
    logger.info("SocketIO configurado")

    # Verificar la configuración de la base de datos
    database_url = app.config.get("SQLALCHEMY_DATABASE_URI")
    if not database_url:
        logger.warning("DATABASE_URL no encontrada")
    else:
        logger.info(f"Usando base de datos: {database_url}")

    # Inicializar base de datos
    init_db(app)
    logger.info("Base de datos inicializada")

    # Inicializar login manager
    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = 'login'
    logger.info("Login manager configurado")

    @login_manager.user_loader
    def load_user(user_id):
        from models import User
        return User.query.get(int(user_id))

    # Endpoint de health check
    @app.route('/health')
    def health():
        try:
            logger.info(f"Health check accedido - IP: {request.remote_addr}")
            # Verificar conexión a la base de datos
            db.session.execute('SELECT 1')
            db_status = "connected"
            logger.info("Conexión a base de datos verificada")
        except Exception as e:
            logger.error(f"Error en health check - DB: {str(e)}")
            db_status = "error"

        response = {
            "status": "ok",
            "message": "Server is running",
            "timestamp": datetime.now().isoformat(),
            "database": db_status
        }

        logger.info(f"Health check response: {response}")
        return jsonify(response)

    # Importar e inicializar rutas
    from routes import init_routes
    init_routes(app)
    logger.info("Rutas inicializadas")

    logger.info("Aplicación Flask configurada completamente")

except Exception as e:
    logger.error(f"Error en la configuración de la aplicación: {str(e)}", exc_info=True)
    raise