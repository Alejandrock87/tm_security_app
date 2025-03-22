import os
import logging
from flask import Flask
from dotenv import load_dotenv
from database import init_db, create_tables
from config import Config

# Configurar logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('app.log')
    ]
)
logger = logging.getLogger(__name__)

def initialize_database():
    """
    Inicializa la base de datos y crea todas las tablas necesarias.
    """
    try:
        # Cargar variables de entorno
        load_dotenv()
        
        # Verificar la conexión a la base de datos
        database_url = os.environ.get('DATABASE_URL')
        if not database_url:
            logger.error("ERROR: No se encontró la variable de entorno DATABASE_URL")
            return False
        
        logger.info(f"Conectando a la base de datos: {database_url}")
        
        # Crear una aplicación Flask temporal para inicializar la base de datos
        app = Flask(__name__)
        app.config.from_object(Config)
        
        # Inicializar la base de datos
        init_db(app)
        
        # Crear las tablas
        create_tables(app)
        
        logger.info("Base de datos inicializada correctamente")
        return True
        
    except Exception as e:
        logger.error(f"Error al inicializar la base de datos: {str(e)}", exc_info=True)
        return False

if __name__ == "__main__":
    success = initialize_database()
    if success:
        print("Base de datos inicializada correctamente.")
    else:
        print("Error al inicializar la base de datos. Revise los logs para más detalles.")
