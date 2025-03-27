"""
Script para corregir la secuencia de autoincremento en la tabla de usuarios.
Este script actualiza la secuencia users_id_seq para que comience desde un valor
mayor que el ID más alto existente en la tabla de usuarios.
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

def fix_users_sequence():
    """Corrige la secuencia de autoincremento para la tabla de usuarios."""
    with app.app_context():
        try:
            # Consultar todos los usuarios para encontrar el ID más alto
            users = User.query.order_by(User.id.desc()).all()
            
            if not users:
                logger.info("No hay usuarios en la base de datos. No es necesario corregir la secuencia.")
                return
            
            # Obtener el ID más alto
            max_id = users[0].id
            logger.info(f"ID más alto encontrado: {max_id}")
            
            # Consultar el valor actual de la secuencia
            result = db.session.execute("SELECT last_value FROM users_id_seq").fetchone()
            current_seq_value = result[0] if result else 0
            logger.info(f"Valor actual de la secuencia: {current_seq_value}")
            
            if current_seq_value > max_id:
                logger.info("La secuencia ya está correctamente configurada.")
                return
            
            # Actualizar la secuencia para que comience desde max_id + 1
            new_seq_value = max_id + 1
            db.session.execute(f"ALTER SEQUENCE users_id_seq RESTART WITH {new_seq_value}")
            db.session.commit()
            
            # Verificar que la secuencia se haya actualizado correctamente
            result = db.session.execute("SELECT last_value FROM users_id_seq").fetchone()
            updated_seq_value = result[0] if result else 0
            
            if updated_seq_value == new_seq_value:
                logger.info(f"Secuencia actualizada exitosamente a {updated_seq_value}")
            else:
                logger.warning(f"La secuencia no se actualizó correctamente. Valor actual: {updated_seq_value}")
            
        except Exception as e:
            logger.error(f"Error al corregir la secuencia: {str(e)}", exc_info=True)
            db.session.rollback()

if __name__ == "__main__":
    logger.info("Iniciando corrección de la secuencia de usuarios...")
    fix_users_sequence()
    logger.info("Proceso completado.")
