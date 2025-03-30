"""
Scheduler para tareas automáticas de TransmilenioSafetyApp.
Maneja el reentrenamiento semanal del modelo y la generación diaria de predicciones.
"""

import time
import logging
import schedule
import subprocess
from datetime import datetime
import os
import json
from dotenv import load_dotenv
import sys

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('scheduler.log')
    ]
)
logger = logging.getLogger(__name__)

# Cargar variables de entorno
load_dotenv()

def run_daily_predictions():
    """Genera las predicciones diariamente y las guarda en la carpeta de datos."""
    logger.info(f"Ejecutando generación diaria de predicciones: {datetime.now()}")
    try:
        # Importar aquí para evitar circular imports
        from app import app
        with app.app_context():
            from ml_models import generate_prediction_cache
            predictions = generate_prediction_cache(hours_ahead=48)
            logger.info(f"Generadas {len(predictions)} predicciones")
            
            # Guardar predicciones en la base de datos
            from models import Prediction
            from database import db
            from sqlalchemy import func, delete as sql_delete
            
            # Eliminar predicciones viejas (opcional)
            now_db_time = func.now()
            logger.info(f"Intentando eliminar predicciones anteriores a: {now_db_time}")
            delete_stmt = sql_delete(Prediction).where(Prediction.predicted_time < now_db_time)
            # Ejecutar directamente sobre la conexión de la sesión
            connection = db.session.connection()
            result = connection.execute(delete_stmt)
            num_deleted = result.rowcount
            # Commit general de la sesión
            db.session.commit()
            logger.info(f"Eliminadas {num_deleted} predicciones antiguas.")
            
            # Notificar a todos los clientes conectados
            from app import socketio
            socketio.emit('predictions_updated', {'predictions': predictions})
    except Exception as e:
        logger.error(f"Error generando predicciones: {str(e)}", exc_info=True)

def run_weekly_training():
    """Ejecuta el reentrenamiento semanal del modelo."""
    logger.info(f"Ejecutando entrenamiento semanal: {datetime.now()}")
    try:
        result = subprocess.run(["python", "train_model.py"], 
                               capture_output=True, text=True)
        logger.info(f"Resultado entrenamiento: {result.stdout}")
        if result.stderr:
            logger.error(f"Errores: {result.stderr}")
            
        # Después del entrenamiento, generar nuevas predicciones
        run_daily_predictions()
    except Exception as e:
        logger.error(f"Error en entrenamiento: {str(e)}", exc_info=True)

# Programar tareas
# Generación diaria a las 01:00 AM
schedule.every().day.at("01:00").do(run_daily_predictions)
# Reentrenamiento semanal los domingos a las 23:00
schedule.every().sunday.at("23:00").do(run_weekly_training)

if __name__ == "__main__":
    logger.info("Iniciando programador de tareas...")
    
    # Ejecutar predicciones al inicio para asegurar que siempre hay datos
    run_daily_predictions()
    
    # Loop principal del scheduler
    while True:
        schedule.run_pending()
        time.sleep(60)  # Verificar cada minuto
