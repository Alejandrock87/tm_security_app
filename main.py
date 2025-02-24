import os
import logging
from app import app

# Setup detailed logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

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
        logging.getLogger('werkzeug').setLevel(logging.INFO)

        logger.info("Initializing server...")
        app.run(
            host='0.0.0.0',
            port=port,
            debug=True
        )
        logger.info("Server started successfully")
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}", exc_info=True)
        raise