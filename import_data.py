"""
Script para importar datos desde archivos JSON a la base de datos PostgreSQL en Railway
"""

import os
import json
import logging
from datetime import datetime
from dotenv import load_dotenv
from app import app
from database import db, create_tables
from models import User, Incident, Notification, UserPreference

# Configurar logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Cargar variables de entorno
load_dotenv()

def import_json_to_table(filename, model_class):
    """Importa datos desde un archivo JSON a una tabla en la base de datos."""
    try:
        json_file = f'export_{filename}.json'
        if not os.path.exists(json_file):
            logger.warning(f"Archivo {json_file} no encontrado, saltando importación")
            return 0
            
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        logger.info(f"Cargados {len(data)} registros desde {json_file}")
        
        imported_count = 0
        with app.app_context():
            for item in data:
                # Verificar si el objeto ya existe por su ID
                if 'id' in item and model_class.query.get(item['id']) is not None:
                    logger.debug(f"El registro con ID {item['id']} ya existe, saltando")
                    continue
                
                # Limpiar campos especiales de fecha/hora
                for field in ['created_at', 'updated_at', 'fecha_hora']:
                    if field in item and isinstance(item[field], str):
                        try:
                            # Intentar diferentes formatos de fecha
                            for fmt in ['%Y-%m-%d %H:%M:%S', '%Y-%m-%dT%H:%M:%S', '%Y-%m-%d %H:%M:%S.%f']:
                                try:
                                    item[field] = datetime.strptime(item[field], fmt)
                                    break
                                except ValueError:
                                    continue
                        except Exception as e:
                            logger.warning(f"Error al convertir fecha {item[field]}: {str(e)}")
                
                # Crear y añadir el nuevo objeto
                obj = model_class(**item)
                db.session.add(obj)
                imported_count += 1
                
                # Hacer commit cada 100 registros para evitar problemas de memoria
                if imported_count % 100 == 0:
                    db.session.commit()
                    logger.info(f"Importados {imported_count} registros a {model_class.__tablename__}")
            
            # Commit final
            db.session.commit()
        
        logger.info(f"Importación completa: {imported_count} registros a {model_class.__tablename__}")
        return imported_count
    except Exception as e:
        logger.error(f"Error importando {filename}: {str(e)}")
        return 0

def main():
    """Función principal para importar todos los datos."""
    logger.info("Iniciando importación de datos a la base de datos PostgreSQL...")
    
    # Asegurar que las tablas existen
    with app.app_context():
        create_tables(app)
    
    total = 0
    # Importar cada tabla
    total += import_json_to_table('users', User)
    total += import_json_to_table('incidents', Incident)
    total += import_json_to_table('notifications', Notification)
    total += import_json_to_table('user_preferences', UserPreference)
    
    logger.info(f"Importación completa. Total de registros importados: {total}")
    print(f"Importación completa. Total de registros importados: {total}")

if __name__ == "__main__":
    main()
