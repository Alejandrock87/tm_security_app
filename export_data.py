"""
Script para exportar datos de la base de datos local a formato JSON para Railway
"""

import os
import json
import logging
from datetime import datetime
from dotenv import load_dotenv
from app import app
from database import db
from models import User, Incident, UserPreference, Notification

# Configurar logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Cargar variables de entorno
load_dotenv()

def export_table_to_json(model, filename):
    """Exporta los datos de un modelo a un archivo JSON."""
    try:
        with app.app_context():
            # Obtener todos los registros del modelo
            records = model.query.all()
            logger.info(f"Recuperados {len(records)} registros de {model.__tablename__}")
            
            # Convertir registros a diccionarios
            data = []
            for record in records:
                if hasattr(record, 'to_dict'):
                    data.append(record.to_dict())
                else:
                    item_dict = record.__dict__.copy()
                    if '_sa_instance_state' in item_dict:
                        del item_dict['_sa_instance_state']
                    data.append(item_dict)
            
            # Guardar en archivo JSON
            with open(f'export_{filename}.json', 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=4, default=str)
            
            logger.info(f"Exportados {len(data)} registros a export_{filename}.json")
            return len(data)
    except Exception as e:
        logger.error(f"Error exportando {filename}: {str(e)}")
        return 0

def main():
    """Función principal para exportar todos los datos."""
    logger.info("Iniciando exportación de datos...")
    
    total = 0
    # Exportar cada tabla
    total += export_table_to_json(User, 'users')
    total += export_table_to_json(Incident, 'incidents')
    total += export_table_to_json(UserPreference, 'user_preferences')
    total += export_table_to_json(Notification, 'notifications')
    
    logger.info(f"Exportación completa. Total de registros: {total}")
    print(f"Exportación completa. Total de registros: {total}")

if __name__ == "__main__":
    main()
