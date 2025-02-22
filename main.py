from gevent import monkey
monkey.patch_all()

import os
import logging
from utils import socketio

if __name__ == '__main__':
    # Setup detailed logging
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    logger = logging.getLogger(__name__)

    try:
        logger.info("Starting Flask application")
        from app import app

        # Add health check route
        @app.route('/health')
        def health_check():
            return 'OK', 200

        # Use port 5000 as recommended by guidelines
        port = int(os.getenv('PORT', 5000))
        logger.info(f"Configured to run on port {port}")

        # Iniciar el servidor con Socket.IO
        socketio.init_app(app)
        socketio.run(
            app,
            host='0.0.0.0',
            port=port,
            debug=True,
            log_output=True
        )
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}", exc_info=True)
        raise