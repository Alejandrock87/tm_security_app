from app import app, socketio

# Esta es la aplicación que Gunicorn ejecutará
# Se requiere export socketio como objeto específico
application = app

if __name__ == '__main__':
    socketio.run(app)
