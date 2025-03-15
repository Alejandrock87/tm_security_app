import os
import logging
from flask import Flask, request, jsonify
from flask_login import LoginManager
from database import init_db, db
from flask_caching import Cache
from flask_socketio import SocketIO
from flask_cors import CORS
from datetime import datetime

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

    app.secret_key = os.environ.get("FLASK_SECRET_KEY", "a-secret-key-123")

    # Configuración de sesión
    app.config.update(
        SESSION_COOKIE_SECURE=False,
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE='Lax',
        PERMANENT_SESSION_LIFETIME=1800
    )

    # Configurar CORS
    CORS(app)
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
        cors_allowed_origins="*",
        async_mode='gevent',
        logger=True,
        engineio_logger=True
    )
    logger.info("SocketIO configurado")

    # Configurar base de datos
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        logger.warning("DATABASE_URL no encontrada")

    app.config["SQLALCHEMY_DATABASE_URI"] = database_url
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_recycle": 300,
        "pool_pre_ping": True
    }
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

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