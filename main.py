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
    logger.debug("Health check endpoint accessed")
    return 'OK', 200

if __name__ == '__main__':
    try:
        logger.info("Starting Flask application")
        port = 5000  # Always use port 5000 for Replit
        logger.info(f"Configured to run on port {port}")

        # Temporarily use simple app.run instead of socketio.run for debugging
        logger.info(f"Attempting to start server on 0.0.0.0:{port}...")
        app.run(
            host='0.0.0.0',
            port=port,
            debug=True,
            use_reloader=False  # Disable reloader to prevent duplicate processes
        )
        logger.info(f"Server successfully started and listening on port {port}")
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}", exc_info=True)
        raise