from flask_caching import Cache
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager

# Initialize extensions
cache = Cache()
socketio = SocketIO()
db = SQLAlchemy()
login_manager = LoginManager()

def init_extensions(app):
    cache.init_app(app)
    socketio.init_app(
        app,
        async_mode='gevent',
        cors_allowed_origins="*",
        logger=True,
        engineio_logger=True
    )
    db.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = 'login'
