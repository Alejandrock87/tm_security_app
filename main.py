import os
from app import app, socketio

# Set Werkzeug debug pin to None for development purposes
os.environ['WERKZEUG_DEBUG_PIN'] = 'None'

if __name__ == '__main__':
    port = int(os.getenv('PORT', 3000))
    socketio.run(app, 
                host='0.0.0.0', 
                port=port, 
                debug=True,  # Enable debug for development
                allow_unsafe_werkzeug=True,
                use_reloader=True,
                log_output=True
    )