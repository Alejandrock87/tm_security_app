import os
from dotenv import load_dotenv

# Cargar variables de entorno desde el archivo .env
load_dotenv()

class Config:
    # Configuración predeterminada para desarrollo local
    LOCAL_DB_URL = "postgresql://postgres:sistran2025@localhost:5432/transmilenio_db"
    
    # Obtener la URL de la base de datos - priorizar la de Railway
    # Nota: Railway proporciona automáticamente la variable DATABASE_URL
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', LOCAL_DB_URL)
    
    # Railway usa postgres:// pero SQLAlchemy requiere postgresql://
    if SQLALCHEMY_DATABASE_URI and SQLALCHEMY_DATABASE_URI.startswith('postgres://'):
        SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI.replace('postgres://', 'postgresql://', 1)
    
    # Si estamos en Railway, asegurarse de usar la URL de Railway
    if os.environ.get('RAILWAY_SERVICE_NAME'):
        print(f"Detectado entorno Railway. Usando DATABASE_URL: {SQLALCHEMY_DATABASE_URI}")
    
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
