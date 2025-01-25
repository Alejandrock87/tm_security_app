
import schedule
import time
from ml_models import train_model, predict_station_risk, predict_incident_type
from datetime import datetime, timedelta
import logging
import pytz
import json
import os

logging.basicConfig(level=logging.INFO)

PREDICTIONS_CACHE_FILE = 'predictions_cache.json'

def generate_daily_predictions():
    predictions = []
    try:
        from models import Incident
        from database import db
        with db.session() as session:
            stations = session.query(Incident.nearest_station).distinct().all()
            current_hour = datetime.now()
            
            for hour in range(24):
                pred_time = current_hour + timedelta(hours=hour)
                for station in stations:
                    risk_score = predict_station_risk(station[0], pred_time.hour)
                    if risk_score > 0.3:
                        predictions.append({
                            'station': station[0],
                            'predicted_time': pred_time.isoformat(),
                            'risk_score': float(risk_score),
                            'incident_type': predict_incident_type(station[0], pred_time.hour),
                        })
        
        # Save predictions to cache file
        with open(PREDICTIONS_CACHE_FILE, 'w') as f:
            json.dump(predictions, f)
            
        logging.info("Daily predictions generated and cached successfully")
    except Exception as e:
        logging.error(f"Error generating predictions: {str(e)}")

def retrain_model_job():
    logging.info("Starting scheduled model retraining...")
    try:
        model, feature_importance = train_model()
        if model:
            logging.info("Model retraining completed successfully")
            generate_daily_predictions()
        else:
            logging.error("Model retraining failed - insufficient data")
    except Exception as e:
        logging.error(f"Error during model retraining: {str(e)}")

def run_scheduler():
    schedule.every().day.at("04:30").do(retrain_model_job)
    
    while True:
        schedule.run_pending()
        time.sleep(60)

if __name__ == "__main__":
    run_scheduler()
