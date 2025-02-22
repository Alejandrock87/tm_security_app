
import schedule
import time
from ml_models import train_model, predict_station_risk, predict_incident_type
from datetime import datetime, timedelta
import logging
import pytz
import json
import os
from models import Incident
from database import db

logging.basicConfig(level=logging.INFO)

PREDICTIONS_CACHE_FILE = 'predictions_cache.json'
MODEL_CACHE_FILE = 'model_cache.pkl'

def generate_weekly_predictions():
    predictions = []
    try:
        with db.session() as session:
            stations = session.query(Incident.nearest_station).distinct().all()
            current_time = datetime.now(pytz.timezone('America/Bogota'))
            
            # Generar predicciones para los próximos 7 días
            for day in range(7):
                current_date = current_time + timedelta(days=day)
                for hour in range(24):
                    pred_time = current_date.replace(hour=hour, minute=0, second=0)
                    for station in stations:
                        risk_score = predict_station_risk(station[0], pred_time.hour)
                        if risk_score > 0.3:  # Solo guardar predicciones relevantes
                            predictions.append({
                                'station': station[0],
                                'predicted_time': pred_time.isoformat(),
                                'risk_score': float(risk_score),
                                'incident_type': predict_incident_type(station[0], pred_time.hour),
                            })
        
        # Guardar predicciones en caché
        with open(PREDICTIONS_CACHE_FILE, 'w') as f:
            json.dump(predictions, f)
            
        logging.info(f"Generated {len(predictions)} predictions for the next week")
        return True
    except Exception as e:
        logging.error(f"Error generating predictions: {str(e)}")
        return False

def retrain_model_job():
    from app import app
    
    logging.info("Starting scheduled model retraining...")
    try:
        with app.app_context():
            model, feature_importance = train_model()
            if model:
                logging.info("Model retraining completed successfully")
                if generate_weekly_predictions():
                    logging.info("Weekly predictions generated successfully")
                else:
                    logging.error("Failed to generate weekly predictions")
            else:
                logging.error("Model retraining failed - insufficient data")
    except Exception as e:
        logging.error(f"Error during model retraining: {str(e)}")

def run_scheduler():
    # Configurar para ejecutar todos los domingos a las 11 PM (Hora de Bogotá)
    schedule.every().sunday.at("23:00").do(retrain_model_job)
    
    # Ejecutar inmediatamente si no existe el modelo
    if not os.path.exists(MODEL_CACHE_FILE):
        logging.info("No model found. Running initial training...")
        retrain_model_job()
    
    while True:
        schedule.run_pending()
        time.sleep(60)

if __name__ == "__main__":
    run_scheduler()
