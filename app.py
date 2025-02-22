import os
import logging
from flask import Flask
from flask_login import LoginManager
from database import init_db, db
from flask_caching import Cache

# Configurar logging
logger = logging.getLogger(__name__)

# Configurar cache
cache = Cache(config={'CACHE_TYPE': 'SimpleCache'})

def create_app():
    logger.info("Creating Flask application")
    app = Flask(__name__)

    try:
        # Inicializar cache
        logger.info("Initializing cache")
        cache.init_app(app)

        # Configurar secret key
        app.secret_key = os.environ.get("FLASK_SECRET_KEY") or "a secret key"

        # Configurar base de datos
        logger.info("Configuring database")
        database_url = os.environ.get("DATABASE_URL")
        if not database_url:
            database_url = f"postgresql://{os.environ.get('PGUSER')}:{os.environ.get('PGPASSWORD')}@{os.environ.get('PGHOST')}:{os.environ.get('PGPORT')}/{os.environ.get('PGDATABASE')}"
            logger.info("Using constructed DATABASE_URL from environment variables")

        app.config["SQLALCHEMY_DATABASE_URI"] = database_url
        app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
            "pool_recycle": 300,
            "pool_pre_ping": True,
            "pool_size": 5,
            "max_overflow": 10,
            "connect_args": {
                "connect_timeout": 10
            }
        }

        # Inicializar base de datos
        logger.info("Initializing database")
        init_db(app)

        # Inicializar login manager
        logger.info("Initializing login manager")
        login_manager = LoginManager()
        login_manager.init_app(app)
        login_manager.login_view = 'login'

        @login_manager.user_loader
        def load_user(user_id):
            from models import User
            return User.query.get(int(user_id))

        # Crear tablas de la base de datos
        with app.app_context():
            logger.info("Creating database tables")
            import models
            db.create_all()

        # Importar e inicializar rutas
        logger.info("Initializing routes")
        from routes import init_routes
        init_routes(app)

        logger.info("Flask application created successfully")
        return app
    except Exception as e:
        logger.error(f"Error creating Flask application: {str(e)}", exc_info=True)
        raise

app = create_app()