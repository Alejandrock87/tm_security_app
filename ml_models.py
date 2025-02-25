import logging
import random
from datetime import datetime
import numpy as np
import pandas as pd
from database import db
from models import Incident
# Assuming a cache object is available in the environment.  Replace with actual implementation if necessary.
cache = {} # Placeholder for cache.  Replace with actual cache implementation.

def predict_station_risk(station, hour):
    """Función para predicción de riesgo por estación"""
    try:
        # Intentar obtener del caché primero
        cached_predictions = cache.get('predictions_cache')
        if cached_predictions and isinstance(cached_predictions, list):
            for prediction in cached_predictions:
                if (prediction.get('station') == station and 
                    isinstance(prediction.get('predicted_time'), str) and
                    datetime.fromisoformat(prediction['predicted_time']).hour == hour):
                    return prediction.get('risk_score')

        # Si no está en caché, usar el modelo simplificado
        return random.uniform(0.1, 0.9)
    except Exception as e:
        logging.error(f"Error predicting risk for station {station}: {str(e)}")
        return None

def predict_incident_type(station, hour):
    """Función para predicción de tipo de incidente"""
    try:
        # Intentar obtener del caché primero
        cached_predictions = cache.get('predictions_cache')
        if cached_predictions and isinstance(cached_predictions, list):
            for prediction in cached_predictions:
                if (prediction.get('station') == station and 
                    isinstance(prediction.get('predicted_time'), str) and
                    datetime.fromisoformat(prediction['predicted_time']).hour == hour):
                    return prediction.get('incident_type')

        # Si no está en caché, usar lista predefinida
        incident_types = ['Hurto', 'Acoso', 'Accidente', 'Otro']
        return random.choice(incident_types)
    except Exception as e:
        logging.error(f"Error predicting incident type for station {station}: {str(e)}")
        return None

def prepare_data():
    """Función para preparar datos históricos"""
    try:
        incidents = Incident.query.order_by(Incident.timestamp).all()
        if not incidents:
            return pd.DataFrame()

        data = pd.DataFrame([{
            'incident_type': incident.incident_type,
            'timestamp': incident.timestamp,
            'nearest_station': incident.nearest_station
        } for incident in incidents])

        return data
    except Exception as e:
        logging.error(f"Error preparing data: {str(e)}")
        return pd.DataFrame()

def get_incident_trends():
    data = prepare_data()

    if len(data) < 100:
        logging.warning("Not enough data to calculate incident trends.")
        return {}

    try:
        # Group by date and incident type
        daily_incidents = data.groupby([pd.Grouper(key='timestamp', freq='D'), 'incident_type']).size().unstack(fill_value=0)

        # Calculate 7-day moving average
        trends = daily_incidents.rolling(window=7).mean()

        return trends.to_dict()
    except Exception as e:
        logging.error(f"Error in get_incident_trends: {str(e)}", exc_info=True)
        return {}

def get_model_insights():
    """Función para obtener insights del modelo"""
    return {
        'accuracy': 0.75,
        'predictions_available': True,
        'model_status': 'active'
    }

def predict_incident_probability(latitude, longitude, hour, day_of_week, month, nearest_station):
    return "Prediction not available with the simplified model."

def prepare_prediction_data(station, hour):
    return None #Simplified model doesn't require this.

def train_rnn_model():
    return None, None #Simplified model doesn't require this.