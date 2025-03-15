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

    app.secret_key = os.environ.get("FLASK_SECRET_KEY", "default-secret-key")

    # Simplificar configuración de sesión
    app.config.update(
        SESSION_COOKIE_SECURE=False,
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE='Lax',
    )

    # Configurar CORS
    CORS(app)
    logger.info("CORS configurado")

    # Configurar cache
    cache = Cache(config={'CACHE_TYPE': 'SimpleCache'})
    cache.init_app(app)
    logger.info("Cache configurado")

    # Simplificar configuración de SocketIO
    socketio = SocketIO(
        app,
        cors_allowed_origins="*",
        async_mode='gevent',
        logger=True,
        engineio_logger=True
    )
    logger.info("SocketIO configurado")

    # Configurar base de datos - Solo lectura, no modificamos estructura
    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")
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

    # Endpoint de health check simplificado
    @app.route('/health')
    def health():
        try:
            logger.info("Health check accedido")
            return jsonify({"status": "ok", "timestamp": datetime.now().isoformat()}), 200
        except Exception as e:
            logger.error(f"Error en health check: {str(e)}")
            return jsonify({"status": "error"}), 500

    # Importar rutas
    from routes import init_routes
    init_routes(app)
    logger.info("Rutas inicializadas")

    logger.info("Aplicación Flask configurada completamente")

except Exception as e:
    logger.error(f"Error en la configuración de la aplicación: {str(e)}", exc_info=True)
    raise