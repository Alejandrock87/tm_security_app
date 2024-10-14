import os
from app import app, socketio

# Set Werkzeug debug pin to None to allow unsafe usage
# WARNING: This should only be used in development, not in production
os.environ['WERKZEUG_DEBUG_PIN'] = 'None'

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True, allow_unsafe_werkzeug=True)
