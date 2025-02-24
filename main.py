import os
import logging
from app import app, socketio

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
        logging.getLogger('gevent').setLevel(logging.INFO)
        logging.getLogger('engineio').setLevel(logging.INFO)
        logging.getLogger('socketio').setLevel(logging.INFO)

        logger.info("Initializing server...")
        socketio.run(
            app,
            host='0.0.0.0',  # Explicitly bind to all interfaces
            port=port,
            debug=True,
            use_reloader=False,
            log_output=True,
            allow_unsafe_werkzeug=True  # Allow Werkzeug to serve on 0.0.0.0
        )
        logger.info("Server started successfully")
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}", exc_info=True)
        raise