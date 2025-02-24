from gevent import monkey
monkey.patch_all()

import os
import logging
from app import app, socketio
from flask import request
from flask_cors import CORS

# Setup detailed logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Enable CORS for the Flask app
CORS(app)

# Add health check route
@app.route('/health')
def health_check():
    # Add detailed logging for debugging
    logger.info("Health check endpoint accessed")
    logger.debug(f"Remote address: {request.remote_addr}")
    logger.debug(f"Headers: {dict(request.headers)}")
    return 'OK', 200

if __name__ == '__main__':
    try:
        logger.info("Starting Flask application")
        port = int(os.getenv('PORT', 5000))
        logger.info(f"Configured to run on port {port}")

        # Configure Socket.IO with specific settings
        socketio.cors_allowed_origins = "*"
        socketio.manage_session = False
        socketio.ping_timeout = 60
        socketio.ping_interval = 25

        # Run the server with gevent
        socketio.run(
            app,
            host='0.0.0.0',
            port=port,
            debug=False,
            use_reloader=False,
            log_output=True,
            allow_unsafe_werkzeug=True
        )
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}", exc_info=True)
        raise