from flask_sqlalchemy import SQLAlchemy
import logging

logger = logging.getLogger(__name__)

# Inicializar SQLAlchemy sin usar DeclarativeBase
db = SQLAlchemy()

def init_db(app):
    db.init_app(app)

def create_tables(app):
    """
    Crea todas las tablas definidas en los modelos si no existen.
    Debe llamarse después de inicializar la aplicación y la base de datos.
    """
    try:
        with app.app_context():
            logger.info("Creando tablas en la base de datos...")
            db.create_all()
            logger.info("Tablas creadas exitosamente")
    except Exception as e:
        logger.error(f"Error al crear tablas: {str(e)}", exc_info=True)
        raise

from contextlib import contextmanager

@contextmanager
def transaction_context():
    try:
        yield
        db.session.commit()
    except:
        db.session.rollback()
        raise
    finally:
        db.session.close()
