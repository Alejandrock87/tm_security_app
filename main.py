import logging
import os
from app import app

# Setup detailed logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)
logger.info("Starting application initialization...")

@app.route('/health')
def health_check():
    logger.info("Health check endpoint accessed")
    return 'OK', 200

if __name__ == '__main__':
    try:
        logger.info("Starting Flask application")
        port = 5000
        logger.info(f"Configured to run on port {port}")

        # Configure logging for the server components
        logging.getLogger('werkzeug').setLevel(logging.DEBUG)
        logging.getLogger('engineio').setLevel(logging.DEBUG)
        logging.getLogger('socketio').setLevel(logging.DEBUG)

        logger.info(f"Attempting to start server on 0.0.0.0:{port}...")
        app.run(
            host='0.0.0.0',
            port=port,
            debug=True
        )
        logger.info(f"Server successfully started and listening on port {port}")
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}", exc_info=True)
        raise