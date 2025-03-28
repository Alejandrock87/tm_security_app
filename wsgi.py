import os
from app import app, socketio
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Si estamos en Railway, asegúrate de usar la DATABASE_URL de Railway
if os.environ.get('RAILWAY_ENVIRONMENT'):
    # Asegúrate de que la URL de la base de datos comienza con postgresql://
    db_url = os.environ.get('DATABASE_URL', '')
    if db_url.startswith('postgres://'):
        db_url = db_url.replace('postgres://', 'postgresql://', 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = db_url
    print(f"Configurando base de datos en Railway: {db_url}")

if __name__ == '__main__':
    # Para ejecución local
    socketio.run(app, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), debug=False)
