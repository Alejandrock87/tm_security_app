import json
import logging
import os
import pytz
import schedule
import time
from datetime import datetime, timedelta
from database import db
from models import Incident
from ml_models import VALID_INCIDENT_TYPES, train_model, predict_station_risk, predict_incident_type

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
"""

logging.basicConfig(level=logging.INFO)

PREDICTIONS_CACHE_FILE = 'predictions_cache.json'
MODEL_CACHE_FILE = 'model_cache.pkl'


def generate_weekly_predictions():
    """
    Genera predicciones para la próxima semana para todas las estaciones.
    """
    predictions = []
    try:
        # Cargar datos de estaciones
        with open('static/Estaciones_Troncales_de_TRANSMILENIO.geojson', 'r', encoding='utf-8') as f:
            geojson_data = json.load(f)

        current_time = datetime.now(pytz.timezone('America/Bogota'))

        # Generar predicciones para los próximos 7 días
        for day in range(7):
            current_date = current_time + timedelta(days=day)
            for hour in range(24):
                pred_time = current_date.replace(hour=hour, minute=0, second=0)

                for feature in geojson_data['features']:
                    station = feature['properties']['nombre_estacion']
                    coordinates = feature['geometry']['coordinates']

                    # Generar predicciones para cada estación
                    risk_score = predict_station_risk(station, pred_time.hour)
                    incident_type = predict_incident_type(station, pred_time.hour)

                    if risk_score is not None and incident_type in VALID_INCIDENT_TYPES:
                        predictions.append({
                            'station': station,
                            'predicted_time': pred_time.isoformat(),
                            'risk_score': float(risk_score),
                            'incident_type': incident_type,
                            'latitude': coordinates[1],
                            'longitude': coordinates[0]
                        })

        # Guardar predicciones en caché por 24 horas
        from app import cache
        cache.set('predictions_cache', predictions, timeout=24 * 3600)

        logging.info(f"Generated {len(predictions)} predictions for the next week")
        return True
    except Exception as e:
        logging.error(f"Error generating predictions: {str(e)}")
        return False


def check_model_health():
    """
    Verifica el estado del modelo y sus predicciones.

    Verificaciones:
    1. Rendimiento del modelo (cross-validation score)
    2. Calidad de las predicciones
    3. Inicia reentrenamiento si el rendimiento es bajo

    Returns:
        bool: True si la verificación fue exitosa
    """
    try:
        from ml_models import get_model_insights
        insights = get_model_insights()

        if isinstance(insights, dict):
            cv_score = insights['cross_validation_scores']['mean']
            if cv_score < 0.5:  # Si el rendimiento es muy bajo
                logging.warning(f"Bajo rendimiento del modelo (CV Score: {cv_score}). Iniciando reentrenamiento.")
                retrain_model_job()
        return True
    except Exception as e:
        logging.error(f"Error en verificación de salud del modelo: {str(e)}")
        return False


def retrain_model_job():
    """
    Ejecuta el reentrenamiento programado del modelo.

    Proceso:
    1. Entrena un nuevo modelo con datos actualizados
    2. Verifica la calidad del nuevo modelo
    3. Genera nuevas predicciones semanales
    4. Actualiza el caché de predicciones
    """
    from app import app

    logging.info("Starting scheduled model retraining...")
    try:
        with app.app_context():
            model = train_model()
            if model is not None:
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


def run_scheduler():
    """
    Inicia y ejecuta el programador de tareas.

    Tareas programadas:
    1. Reentrenamiento semanal (Domingos 11:00 PM)
    2. Verificación de salud (cada 12 horas)
    3. Entrenamiento inicial si no existe modelo
    """
    # Programar reentrenamiento semanal
    schedule.every().sunday.at("23:00").do(retrain_model_job)

    # Programar verificación de salud
    schedule.every(12).hours.do(check_model_health)

    # Ejecutar entrenamiento inicial si es necesario
    if not os.path.exists(MODEL_CACHE_FILE):
        logging.info("No model found. Running initial training...")
        retrain_model_job()

    # Bucle principal del programador
    while True:
        schedule.run_pending()
        time.sleep(60)


if __name__ == "__main__":
    run_scheduler()