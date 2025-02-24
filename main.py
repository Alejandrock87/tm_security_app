import logging
import os
from app import app
from extensions import socketio

# Setup detailed logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)
logger.info("Starting application initialization...")

@app.route('/health')
def health_check():
    """Health check endpoint to verify server status"""
    try:
        # Verificar la conexión a la base de datos
        from extensions import db
        db.session.execute("SELECT 1")
        db.session.commit()
        logger.info("Health check passed - Database connection successful")
        return 'OK', 200
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return 'Error', 500

if __name__ == '__main__':
    try:
        logger.info("Starting Flask application")
        port = 5000  # Always use port 5000 for Replit
        logger.info(f"Configured to run on port {port}")

        logger.info(f"Attempting to start server on 0.0.0.0:{port}...")
        # Temporarily use app.run instead of socketio.run for basic functionality
        app.run(
            host='0.0.0.0',
            port=port,
            debug=True
        )
        logger.info(f"Server successfully started and listening on port {port}")
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}", exc_info=True)
        raise