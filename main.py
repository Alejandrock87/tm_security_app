from gevent import monkey
monkey.patch_all()

import os
import logging
from app import app, socketio

# Setup detailed logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Add health check route
@app.route('/health')
def health_check():
    logger.info("Health check endpoint accessed")
    return 'OK', 200

if __name__ == '__main__':
    try:
        logger.info("Starting Flask application")
        port = int(os.getenv('PORT', 5000))
        logger.info(f"Configured to run on port {port}")

        socketio.run(
            app,
            host='0.0.0.0',
            port=port,
            debug=False
        )
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}", exc_info=True)
        raise