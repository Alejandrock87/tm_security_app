"""
Script para diagnosticar el problema de secuencia de autoincremento en la tabla de usuarios.
Este script no modifica la base de datos, solo muestra información de diagnóstico.
"""

import os
import sys
from dotenv import load_dotenv
from flask import Flask
from database import db
from models import User
import logging

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Cargar variables de entorno
load_dotenv()

# Crear una aplicación Flask mínima para acceder a la base de datos
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

def diagnose_users_table():
    """Diagnostica problemas con la tabla de usuarios y la secuencia de autoincremento."""
    with app.app_context():
        try:
            # Consultar todos los usuarios
            users = User.query.order_by(User.id).all()
            
            if not users:
                logger.info("No hay usuarios en la base de datos.")
                return
            
            # Mostrar información de usuarios
            logger.info(f"Total de usuarios encontrados: {len(users)}")
            logger.info("Listado de usuarios:")
            for user in users:
                logger.info(f"ID: {user.id}, Username: {user.username}, Email: {user.email}")
            
            # Identificar el ID más alto
            max_id = max(user.id for user in users)
            logger.info(f"ID más alto encontrado: {max_id}")
            
            # Verificar si hay huecos en la secuencia de IDs
            all_ids = set(user.id for user in users)
            expected_ids = set(range(1, max_id + 1))
            missing_ids = expected_ids - all_ids
            
            if missing_ids:
                logger.info(f"Hay {len(missing_ids)} huecos en la secuencia de IDs: {sorted(missing_ids)}")
            else:
                logger.info("No hay huecos en la secuencia de IDs.")
            
            # Consultar la secuencia actual (específico para PostgreSQL)
            if 'postgresql' in app.config['SQLALCHEMY_DATABASE_URI']:
                result = db.session.execute("SELECT last_value FROM users_id_seq").fetchone()
                if result:
                    logger.info(f"Valor actual de la secuencia users_id_seq: {result[0]}")
                else:
                    logger.info("No se pudo obtener el valor de la secuencia.")
            
        except Exception as e:
            logger.error(f"Error durante el diagnóstico: {str(e)}", exc_info=True)

if __name__ == "__main__":
    logger.info("Iniciando diagnóstico de la tabla de usuarios...")
    diagnose_users_table()
    logger.info("Diagnóstico completado.")
