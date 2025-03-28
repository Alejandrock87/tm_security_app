"""
Script para corregir los nombres de columnas en la base de datos de Railway
"""

import sys
import logging
from sqlalchemy import create_engine, text

# Configurar logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def get_railway_db_url():
    """Obtiene la URL de la base de datos pública de Railway desde argumentos de línea de comandos."""
    if len(sys.argv) > 1:
        db_url = sys.argv[1]
        logger.info(f"Usando URL de base de datos proporcionada: {db_url.split('@')[0]}@...") # Log seguro
        
        # Railway usa postgres:// pero SQLAlchemy requiere postgresql://
        if db_url.startswith('postgres://'):
            db_url = db_url.replace('postgres://', 'postgresql://', 1)
        return db_url
    else:
        logger.error("Se requiere proporcionar la URL de conexión a Railway como argumento")
        logger.error("Uso: python fix_column_names.py [DB_PUBLIC_URL]")
        logger.error("Ejemplo: python fix_column_names.py postgresql://postgres:password@hopper.proxy.rlwy.net:43402/railway")
        sys.exit(1)

def main():
    logger.info("Iniciando corrección de nombres de columnas en la base de datos...")
    
    # Obtener la URL de la base de datos de Railway
    db_url = get_railway_db_url()
    
    # Crear un motor de base de datos y probar la conexión
    try:
        engine = create_engine(db_url)
        connection = engine.connect()
        logger.info("Conexión a la base de datos establecida correctamente.")
        
        # Verificar si la columna password existe
        result = connection.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='password'"))
        if result.fetchone():
            # La columna password existe, vamos a renombrarla a password_hash
            logger.info("Renombrando columna 'password' a 'password_hash' en la tabla users...")
            connection.execute(text("ALTER TABLE users RENAME COLUMN password TO password_hash;"))
            logger.info("¡Columna renombrada exitosamente!")
        else:
            # Verificar si password_hash ya existe
            result = connection.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='password_hash'"))
            if result.fetchone():
                logger.info("La columna 'password_hash' ya existe en la tabla users. No se requieren cambios.")
            else:
                logger.error("No se encontró ni 'password' ni 'password_hash' en la tabla users.")
        
        connection.close()
    except Exception as e:
        logger.error(f"Error al conectar o modificar la base de datos: {str(e)}")
        sys.exit(1)
    
    logger.info("Operación completada. Intenta iniciar sesión nuevamente.")
    
if __name__ == "__main__":
    main()
