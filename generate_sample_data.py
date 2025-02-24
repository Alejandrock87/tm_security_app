import random
from datetime import datetime, timedelta
from flask import Flask
import os
from models import User, Incident, db
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_app():
    app = Flask(__name__)
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        database_url = f"postgresql://{os.environ.get('PGUSER')}:{os.environ.get('PGPASSWORD')}@{os.environ.get('PGHOST')}:{os.environ.get('PGPORT')}/{os.environ.get('PGDATABASE')}"

    logger.info(f"Conectando a la base de datos...")
    app.config["SQLALCHEMY_DATABASE_URI"] = database_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    db.init_app(app)
    return app

def populate_real_incident_data():
    app = create_app()
    with app.app_context():
        try:
            # Crear usuario de prueba
            logger.info("Intentando crear usuario de prueba...")
            user = User(username="sample_user", email="sample@example.com")
            user.set_password("sample_password")
            logger.info("Usuario creado en memoria, intentando guardar en la base de datos...")
            db.session.add(user)
            db.session.commit()
            logger.info("Usuario guardado exitosamente en la base de datos")

            # Verificar la creación del usuario
            created_user = User.query.filter_by(username="sample_user").first()
            if not created_user:
                logger.error("El usuario no se pudo crear correctamente")
                return False

            logger.info("Usuario verificado en la base de datos")
            user_id = created_user.id
            logger.info(f"ID del usuario creado: {user_id}")

            logger.info("Limpiando incidentes anteriores...")
            Incident.query.delete()
            db.session.commit()

            # Generar 10 incidentes de prueba
            logger.info("Generando incidentes de prueba...")
            for i in range(10):
                incident = Incident(
                    incident_type="Hurto",
                    description=f"Incidente de prueba {i}",
                    latitude=4.6097 + (i * 0.001),
                    longitude=-74.0817 + (i * 0.001),
                    user_id=user_id,
                    nearest_station="Estación de prueba",
                    timestamp=datetime.now() - timedelta(days=i)
                )
                db.session.add(incident)

            db.session.commit()
            logger.info("Datos de prueba generados exitosamente")
            return True

        except Exception as e:
            logger.error(f"Error generando datos de muestra: {str(e)}")
            db.session.rollback()
            raise

if __name__ == "__main__":
    try:
        if populate_real_incident_data():
            logger.info("Script completado exitosamente")
            import sys
            sys.exit(0)
        else:
            logger.error("Error: No se pudieron generar los datos")
            import sys
            sys.exit(1)
    except Exception as e:
        logger.error(f"Error fatal: {str(e)}")
        import sys
        sys.exit(1)