import json
import logging
import os
import pytz
import schedule
import time
from datetime import datetime, timedelta
from database import db
from models import Incident
from ml_models import train_model, predict_station_risk, predict_incident_type

logging.basicConfig(level=logging.INFO)

PREDICTIONS_CACHE_FILE = 'predictions_cache.json'
MODEL_CACHE_FILE = 'model_cache.pkl'

def generate_weekly_predictions():
    predictions = []
    try:
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

                    risk_score = predict_station_risk(station, pred_time.hour)
                    if risk_score is not None:
                        predictions.append({
                            'station': station,
                            'predicted_time': pred_time.isoformat(),
                            'risk_score': float(risk_score),
                            'incident_type': predict_incident_type(station, pred_time.hour),
                            'latitude': coordinates[1],
                            'longitude': coordinates[0]
                        })

        # Guardar predicciones en caché
        from app import cache
        cache.set('predictions_cache', predictions, timeout=24*3600)  # 24 horas

        logging.info(f"Generated {len(predictions)} predictions for the next week")
        return True
    except Exception as e:
        logging.error(f"Error generating predictions: {str(e)}")
        return False

def check_model_health():
    """Verifica el estado del modelo y sus predicciones"""
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
    # Reentrenar el modelo los domingos a las 11:00 PM
    schedule.every().sunday.at("23:00").do(retrain_model_job)

    # Verificar el estado del modelo cada 12 horas
    schedule.every(12).hours.do(check_model_health)

    # Ejecutar inmediatamente si no existe el modelo
    if not os.path.exists(MODEL_CACHE_FILE):
        logging.info("No model found. Running initial training...")
        retrain_model_job()

    while True:
        schedule.run_pending()
        time.sleep(60)

if __name__ == "__main__":
    run_scheduler()