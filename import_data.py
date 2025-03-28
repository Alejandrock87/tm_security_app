"""
Script para importar datos desde archivos JSON a la base de datos PostgreSQL en Railway
"""

import os
import json
import logging
import sys
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Float, Boolean, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

# Configurar logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Base para modelos SQLAlchemy
Base = declarative_base()

# Definir modelos directamente para evitar importaciones circulares
class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    username = Column(String(150), unique=True, nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    password = Column(String(255), nullable=False)  # En JSON es 'password_hash'
    name = Column(String(100))
    role = Column(String(50), default='user')
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    active = Column(Boolean, default=True)

class Incident(Base):
    __tablename__ = 'incidents'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    tipo = Column(String(50), nullable=False)  # En JSON es 'incident_type'
    descripcion = Column(Text)                 # En JSON es 'description'
    latitud = Column(Float, nullable=False)
    longitud = Column(Float, nullable=False)
    estacion = Column(String(100))
    linea = Column(String(50))
    fecha_hora = Column(DateTime, default=datetime.utcnow)
    estado = Column(String(20), default='reportado')
    riesgo = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Notification(Base):
    __tablename__ = 'notifications'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    titulo = Column(String(100), nullable=False)
    mensaje = Column(Text, nullable=False)
    tipo = Column(String(50), default='general')
    leido = Column(Boolean, default=False)
    enviado = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class UserPreference(Base):
    __tablename__ = 'user_preferences'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), unique=True)
    notification_enabled = Column(Boolean, default=True)
    theme = Column(String(20), default='light')
    language = Column(String(10), default='es')
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

def get_railway_db_url():
    """Obtiene la URL de la base de datos pública de Railway desde argumentos de línea de comandos."""
    if len(sys.argv) > 1:
        db_url = sys.argv[1]
        logger.info(f"Usando URL de base de datos proporcionada: {db_url.split('@')[0]}@...") # Log seguro, no muestra la contraseña completa
        
        # Railway usa postgres:// pero SQLAlchemy requiere postgresql://
        if db_url.startswith('postgres://'):
            db_url = db_url.replace('postgres://', 'postgresql://', 1)
        return db_url
    else:
        logger.error("Se requiere proporcionar la URL de conexión a Railway como argumento")
        logger.error("Uso: python import_data.py [DB_PUBLIC_URL]")
        logger.error("Ejemplo: python import_data.py postgresql://postgres:password@hopper.proxy.rlwy.net:43402/railway")
        sys.exit(1)

def field_mapping(model_class, json_data):
    """Mapea los campos del JSON a los campos del modelo SQLAlchemy."""
    mapped_data = json_data.copy()
    
    # Mapeo para User
    if model_class == User:
        if 'password_hash' in mapped_data:
            mapped_data['password'] = mapped_data.pop('password_hash')
    
    # Mapeo para Incident
    elif model_class == Incident:
        # Mapear campos en inglés a español
        field_mappings = {
            'incident_type': 'tipo',
            'description': 'descripcion',
            'latitude': 'latitud',
            'longitude': 'longitud',
            'timestamp': 'fecha_hora',
            'nearest_station': 'estacion'
        }
        
        for eng_field, esp_field in field_mappings.items():
            if eng_field in mapped_data:
                mapped_data[esp_field] = mapped_data.pop(eng_field)
    
    # Eliminar campos que no existen en el modelo
    field_names = [column.key for column in model_class.__table__.columns]
    for key in list(mapped_data.keys()):
        if key not in field_names:
            logger.warning(f"Campo '{key}' no existe en el modelo {model_class.__name__}, eliminando")
            mapped_data.pop(key)
    
    return mapped_data

def import_json_to_table(filename, model_class, session):
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
        for item in data:
            try:
                # Verificar si el objeto ya existe por su ID
                existing = session.query(model_class).filter_by(id=item['id']).first() if 'id' in item else None
                if existing is not None:
                    logger.debug(f"El registro con ID {item['id']} ya existe, saltando")
                    continue
                
                # Mapear campos del JSON a campos del modelo
                mapped_item = field_mapping(model_class, item)
                
                # Limpiar campos especiales de fecha/hora
                for field in ['created_at', 'updated_at', 'fecha_hora']:
                    if field in mapped_item and isinstance(mapped_item[field], str):
                        try:
                            # Intentar diferentes formatos de fecha
                            for fmt in ['%Y-%m-%d %H:%M:%S', '%Y-%m-%dT%H:%M:%S', '%Y-%m-%d %H:%M:%S.%f']:
                                try:
                                    mapped_item[field] = datetime.strptime(mapped_item[field], fmt)
                                    break
                                except ValueError:
                                    continue
                        except Exception as e:
                            logger.warning(f"Error al convertir fecha {mapped_item[field]}: {str(e)}")
                
                # Crear y añadir el nuevo objeto
                obj = model_class(**mapped_item)
                session.add(obj)
                imported_count += 1
                
                # Hacer commit cada 100 registros para evitar problemas de memoria
                if imported_count % 100 == 0:
                    session.commit()
                    logger.info(f"Importados {imported_count} registros a {model_class.__tablename__}")
            except Exception as e:
                logger.error(f"Error al importar registro: {str(e)}")
                logger.error(f"Registro problemático: {item}")
                # Continuar con el siguiente registro
        
        # Commit final
        session.commit()
        
        logger.info(f"Importación completa: {imported_count} registros a {model_class.__tablename__}")
        return imported_count
    except Exception as e:
        logger.error(f"Error importando {filename}: {str(e)}")
        return 0

def actualizar_secuencias(engine):
    """Actualiza las secuencias de autoincremento basándose en el máximo ID existente."""
    try:
        logger.info("Actualizando secuencias de autoincremento...")
        
        # Tablas a verificar
        tablas = ['users', 'incidents', 'notifications', 'user_preferences']
        
        connection = engine.connect()
        for tabla in tablas:
            try:
                # Obtener el ID máximo
                result = connection.execute(f"SELECT MAX(id) FROM {tabla}")
                max_id = result.scalar()
                
                if max_id is not None:
                    # Actualizar la secuencia
                    next_id = max_id + 1
                    connection.execute(f"SELECT setval('{tabla}_id_seq', {next_id}, false)")
                    logger.info(f"Secuencia {tabla}_id_seq actualizada a {next_id}")
            except Exception as e:
                logger.error(f"Error actualizando secuencia para {tabla}: {str(e)}")
        
        connection.close()
        logger.info("Secuencias actualizadas correctamente")
    except Exception as e:
        logger.error(f"Error general actualizando secuencias: {str(e)}")

def main():
    """Función principal para importar todos los datos."""
    logger.info("Iniciando importación de datos a la base de datos PostgreSQL de Railway...")
    
    # Obtener la URL de la base de datos de Railway
    db_url = get_railway_db_url()
    
    # Crear un motor de base de datos y probar la conexión
    try:
        engine = create_engine(db_url)
        # Probar la conexión
        connection = engine.connect()
        connection.close()
        logger.info("Conexión a la base de datos establecida correctamente.")
    except Exception as e:
        logger.error(f"Error al conectar con la base de datos: {str(e)}")
        logger.error("Por favor, asegúrate de usar la URL pública correcta (DATABASE_PUBLIC_URL)")
        sys.exit(1)
    
    # Crear tablas si no existen
    logger.info("Creando tablas en la base de datos si no existen...")
    Base.metadata.create_all(engine)
    
    # Crear sesión
    Session = sessionmaker(bind=engine)
    session = Session()
    
    total = 0
    try:
        # Importar cada tabla en sesiones separadas para evitar problemas de rollback
        # Importar usuarios
        session_users = Session()
        user_count = import_json_to_table('users', User, session_users)
        session_users.close()
        total += user_count
        
        # Importar incidentes
        session_incidents = Session()
        incidents_count = import_json_to_table('incidents', Incident, session_incidents)
        session_incidents.close()
        total += incidents_count
        
        # Importar notificaciones
        session_notifications = Session()
        notif_count = import_json_to_table('notifications', Notification, session_notifications)
        session_notifications.close()
        total += notif_count
        
        # Importar preferencias de usuario
        session_prefs = Session()
        prefs_count = import_json_to_table('user_preferences', UserPreference, session_prefs)
        session_prefs.close()
        total += prefs_count
        
        # Actualizar secuencias de autoincremento
        actualizar_secuencias(engine)
        
        logger.info(f"Importación completa. Total de registros importados: {total}")
        print(f"Importación completa. Total de registros importados: {total}")
    finally:
        session.close()

if __name__ == "__main__":
    main()
