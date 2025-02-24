from extensions import db
from sqlalchemy.orm import DeclarativeBase
from contextlib import contextmanager
from flask import current_app
import logging

logger = logging.getLogger(__name__)

class Base(DeclarativeBase):
    pass

def init_db(app):
    """Initialize database with proper error handling"""
    try:
        logger.info("Initializing database...")
        db.init_app(app)

        with app.app_context():
            # Import models here to avoid circular imports
            from models import User, Incident, PushSubscription, Notification

            # Create tables
            logger.info("Creating database tables...")
            db.create_all()
            logger.info("Database tables created successfully")

            # Verify tables exist
            tables = db.engine.table_names()
            logger.info(f"Existing tables: {tables}")

            required_tables = {'user', 'incident', 'push_subscription', 'notification'}
            missing_tables = required_tables - set(tables)

            if missing_tables:
                logger.error(f"Missing required tables: {missing_tables}")
                raise Exception(f"Failed to create tables: {missing_tables}")

    except Exception as e:
        logger.error(f"Database initialization failed: {str(e)}")
        raise

@contextmanager
def transaction_context():
    """Provide a transactional scope around a series of operations"""
    try:
        yield
        db.session.commit()
    except:
        db.session.rollback()
        raise
    finally:
        db.session.close()