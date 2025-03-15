import json
import logging
import os
import pytz
import schedule
import time
from datetime import datetime, timedelta
from database import db
from models import Incident
from ml_models import VALID_INCIDENT_TYPES, train_rnn_model, predict_station_risk, predict_incident_type

"""
Programador de Reentrenamiento del Modelo de Predicción
-----------------------------------------------------

Este módulo gestiona:
1. Programación automática de reentrenamiento del modelo
2. Generación y caché de predicciones semanales
3. Monitoreo de salud del modelo
4. Almacenamiento de predicciones en caché

Frecuencia de operaciones:
- Reentrenamiento: Domingos a las 11:00 PM
- Verificación de salud: Cada 12 horas
- Generación de predicciones: Después de cada reentrenamiento
- Actualización periódica de predicciones: Cada hora
"""

logging.basicConfig(level=logging.INFO)

def generate_weekly_predictions():
    """
    Genera predicciones para la próxima semana para todas las estaciones.
    """
    try:
        from ml_models import generate_prediction_cache

        # Generar predicciones para las próximas 168 horas (1 semana)
        predictions = generate_prediction_cache(hours_ahead=168)

        if predictions:
            logging.info(f"Generated {len(predictions)} predictions for the next week")
            return True
        return False

    except Exception as e:
        logging.error(f"Error generating predictions: {str(e)}")
        return False


def check_model_health():
    """
    Verifica el estado del modelo y sus predicciones.

    Verificaciones:
    1. Rendimiento del modelo (accuracy)
    2. Calidad de las predicciones
    3. Inicia reentrenamiento si el rendimiento es bajo
    """
    try:
        from ml_models import get_model_insights
        insights = get_model_insights()

        if isinstance(insights, dict):
            accuracy = insights.get('accuracy', 0)
            if accuracy < 0.5:  # Si el rendimiento es muy bajo
                logging.warning(f"Bajo rendimiento del modelo (Accuracy: {accuracy}). Iniciando reentrenamiento.")
                retrain_model_job()
        return True
    except Exception as e:
        logging.error(f"Error en verificación de salud del modelo: {str(e)}")
        return False


def retrain_model_job():
    """
    Ejecuta el reentrenamiento programado del modelo.

    Proceso:
    1. Entrena un nuevo modelo RNN con datos actualizados
    2. Verifica la calidad del nuevo modelo
    3. Genera nuevas predicciones semanales
    4. Actualiza el caché de predicciones
    """
    from app import app

    logging.info("Starting scheduled model retraining...")
    try:
        with app.app_context():
            model, history = train_rnn_model()
            if model is not None and history is not None:
                logging.info("Model retraining completed successfully")
                if generate_weekly_predictions():
                    logging.info("Weekly predictions generated successfully")
                else:
                    logging.error("Failed to generate weekly predictions")
            else:
                logging.error("Model retraining failed - insufficient data")
    except Exception as e:
        logging.error(f"Error during model retraining: {str(e)}")
        logging.exception("Detailed error traceback:")


def update_predictions_job():
    """
    Trabajo programado para actualizar predicciones.
    """
    from app import app
    with app.app_context():
        from ml_models import update_predictions_periodically
        if update_predictions_periodically():
            logging.info("Actualización periódica de predicciones completada")
        else:
            logging.error("Error en actualización periódica de predicciones")

def run_scheduler():
    """
    Inicia y ejecuta el programador de tareas.
    """
    # Programar reentrenamiento semanal
    schedule.every().sunday.at("23:00").do(retrain_model_job)

    # Programar verificación de salud
    schedule.every(12).hours.do(check_model_health)

    # Programar actualización de predicciones cada hora
    schedule.every(1).hours.do(update_predictions_job)

    # Ejecutar entrenamiento inicial si es necesario
    if not os.path.exists('models/rnn_model.h5'):
        logging.info("No model found. Running initial training...")
        retrain_model_job()

    # Bucle principal del programador
    while True:
        schedule.run_pending()
        time.sleep(60)

if __name__ == "__main__":
    run_scheduler()