
import os
from app import app, socketio

if __name__ == '__main__':
    port = int(os.getenv('PORT', 3000))
    socketio.run(app,
                host='0.0.0.0',
                port=port,
                debug=True,
                allow_unsafe_werkzeug=True,
                log_output=True,
                websocket=True)
