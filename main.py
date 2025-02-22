import os
from app import app, socketio
import logging

if __name__ == '__main__':
    # Setup logging
    logging.basicConfig(level=logging.INFO)

    try:
        # Get port from environment variable, default to 5000
        port = int(os.getenv('PORT', 5000))
        socketio.run(app,
                    host='0.0.0.0',
                    port=port,
                    debug=True,
                    use_reloader=True,
                    log_output=True,
                    allow_unsafe_werkzeug=True)
    except OSError as e:
        logging.error(f"Error starting server on port {port}: {str(e)}")
        # If port 5000 fails, try port 80
        if port != 80:
            try:
                logging.info("Trying alternate port 80...")
                socketio.run(app,
                           host='0.0.0.0',
                           port=80,
                           debug=True,
                           use_reloader=True,
                           log_output=True,
                           allow_unsafe_werkzeug=True)
            except Exception as e2:
                logging.error(f"Failed to start server on alternate port: {str(e2)}")
                raise
        else:
            raise e