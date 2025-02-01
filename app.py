import os
from flask import Flask
from flask_login import LoginManager
from database import init_db, db
from flask_socketio import SocketIO
from utils import socketio, send_notification
from flask_caching import Cache

cache = Cache(config={'CACHE_TYPE': 'SimpleCache'})

def create_app():
    app = Flask(__name__)
    cache.init_app(app)
    app.secret_key = os.environ.get("FLASK_SECRET_KEY") or "a secret key"
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        database_url = f"postgresql://{os.environ.get('PGUSER')}:{os.environ.get('PGPASSWORD')}@{os.environ.get('PGHOST')}:{os.environ.get('PGPORT')}/{os.environ.get('PGDATABASE')}"

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

    init_db(app)

    with app.app_context():
        # Load model at startup only if cache doesn't exist
        from ml_models import load_cached_model
        model, feature_importance = load_cached_model()

    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = 'login'

    @login_manager.user_loader
    def load_user(user_id):
        from models import User
        return User.query.get(int(user_id))

    with app.app_context():
        import models
        db.create_all()

    from routes import init_routes
    init_routes(app)

    socketio.init_app(app, cors_allowed_origins="*", async_mode='gevent', engineio_logger=True)

    return app

app = create_app()

