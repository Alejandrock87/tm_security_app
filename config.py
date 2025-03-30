import os
from dotenv import load_dotenv

# Cargar variables de entorno SOLO si no estamos en Railway
if os.environ.get('RAILWAY_SERVICE_NAME') is None:
    load_dotenv()

class Config:
    # Comprobar si estamos en Railway (Railway proporciona RAILWAY_SERVICE_NAME automáticamente)
    IS_RAILWAY = os.environ.get('RAILWAY_SERVICE_NAME') is not None
    
    # Configuración de la base de datos
    if IS_RAILWAY:
        # En Railway, confía explícitamente en la URL proporcionada
        SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
        if not SQLALCHEMY_DATABASE_URI:
            raise ValueError("DATABASE_URL no está configurada en el entorno de Railway")
    else:
        # En desarrollo local, usa la URL local del .env o una por defecto
        SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', "postgresql://postgres:sistran2025@localhost:5432/transmilenio_db")
    
    # Railway usa postgres:// pero SQLAlchemy requiere postgresql://
    if SQLALCHEMY_DATABASE_URI and SQLALCHEMY_DATABASE_URI.startswith('postgres://'):
        SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI.replace('postgres://', 'postgresql://', 1)
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_recycle": 300,
        "pool_pre_ping": True
    }
    
    # Configuración de seguridad
    SECRET_KEY = os.environ.get('FLASK_SECRET_KEY', 'transmi2025')
    
    # Configuración de sesión
    SESSION_COOKIE_SECURE = os.environ.get('PRODUCTION', 'False') == 'True'
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    PERMANENT_SESSION_LIFETIME = 1800
