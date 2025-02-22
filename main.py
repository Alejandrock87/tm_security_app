import os
import logging

if __name__ == '__main__':
    # Setup detailed logging
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    logger = logging.getLogger(__name__)

    try:
        logger.info("Starting Flask application")
        # Import app after logging configuration
        from app import app

        # Get port from environment variable, default to 8080
        port = int(os.getenv('PORT', 8080))
        logger.info(f"Configured to run on port {port}")

        # Run with basic configuration
        app.run(
            host='0.0.0.0',
            port=port,
            debug=True
        )
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}", exc_info=True)
        raise