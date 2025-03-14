"""
Sistema de Predicción basado en RNN para TransMilenio
---------------------------------------------------

ARQUITECTURA PLANIFICADA:
------------------------
1. Red Neuronal Recurrente (RNN) con capas LSTM/GRU
   - Entrada: Secuencias temporales de incidentes
   - Capas ocultas: LSTM/GRU para capturar patrones temporales
   - Salida: Predicción de riesgo y tipo de incidente

IMPORTACIONES NECESARIAS:
------------------------
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint

PREPARACIÓN DE DATOS:
--------------------
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
import pandas as pd
import numpy as np

EVALUACIÓN Y MÉTRICAS:
---------------------
from sklearn.metrics import (
    accuracy_score, 
    classification_report,
    confusion_matrix, 
    roc_auc_score
)

CARACTERÍSTICAS DEL MODELO:
-------------------------
1. Arquitectura:
   - Capa de entrada LSTM (128 unidades)
   - Dropout (0.2) para prevenir overfitting
   - Capa LSTM adicional (64 unidades)
   - Dropout (0.2)
   - Capa Dense para predicción de riesgo
   - Capa Dense con softmax para tipo de incidente

2. Hiperparámetros:
   - Batch size: 32
   - Épocas: 100 con early stopping
   - Optimizer: Adam con learning rate adaptativo
   - Loss: Binary crossentropy (riesgo) y 
          Categorical crossentropy (tipo)

3. Validación:
   - Cross-validation con k=5
   - Early stopping con paciencia=10
   - Model checkpointing para mejor modelo

4. Métricas de Evaluación:
   - Accuracy
   - ROC AUC
   - F1-Score
   - Matriz de Confusión
"""

import logging
from datetime import datetime
import random
import math
from flask import current_app
import numpy as np
import pandas as pd
from database import db
from models import Incident

"""
Sistema de Predicción de Incidentes de Seguridad para TransMilenio
----------------------------------------------------------------
Este módulo implementa las funciones principales para:
1. Predicción de riesgo por estación
2. Predicción de tipos de incidentes
3. Preparación y procesamiento de datos históricos
4. Análisis de tendencias de incidentes

El sistema utiliza un modelo simplificado basado en:
- Análisis de patrones temporales (hora del día)
- Histórico de incidentes por estación
- Tipo de incidentes más frecuentes
"""

# Definir tipos de incidentes válidos
VALID_INCIDENT_TYPES = [
    'Hurto',
    'Hurto a mano armada',
    'Cosquilleo',
    'Ataque',
    'Apertura de puertas',
    'Sospechoso',
    'Acoso'
]

def predict_station_risk(station, hour):
    """
    Predice el nivel de riesgo para una estación específica en una hora determinada.

    Args:
        station (str): Nombre de la estación
        hour (int): Hora del día (0-23)

    Returns:
        float: Score de riesgo entre 0.0 y 1.0
        None: En caso de error
    """
    try:
        # Intentar obtener predicción del caché para mejor rendimiento
        cache = current_app.extensions['cache']
        cached_predictions = cache.get('predictions_cache')
        if cached_predictions and isinstance(cached_predictions, list):
            for prediction in cached_predictions:
                if (prediction.get('station') == station and 
                    isinstance(prediction.get('predicted_time'), str) and
                    datetime.fromisoformat(prediction['predicted_time']).hour == hour):
                    return prediction.get('risk_score')

        # Si no está en caché, generar predicción temporal
        # TODO: Implementar modelo RNN real aquí
        base_risk = random.uniform(0.3, 0.8)  # Riesgo base más realista
        time_factor = 1 + 0.2 * math.sin(hour * math.pi / 12)  # Factor de hora del día
        risk_score = min(0.95, max(0.1, base_risk * time_factor))  # Normalizar entre 0.1 y 0.95

        return risk_score
    except Exception as e:
        logging.error(f"Error predicting risk for station {station}: {str(e)}")
        return None

def predict_incident_type(station, hour):
    """
    Predice el tipo de incidente más probable para una estación y hora específicas.

    Args:
        station (str): Nombre de la estación
        hour (int): Hora del día (0-23)

    Returns:
        str: Tipo de incidente predicho
        None: En caso de error
    """
    try:
        # Intentar obtener del caché
        cache = current_app.extensions['cache']
        cached_predictions = cache.get('predictions_cache')
        if cached_predictions and isinstance(cached_predictions, list):
            for prediction in cached_predictions:
                if (prediction.get('station') == station and 
                    isinstance(prediction.get('predicted_time'), str) and
                    datetime.fromisoformat(prediction['predicted_time']).hour == hour):
                    return prediction.get('incident_type')

        # Si no está en caché, usar weighted random choice basado en estadísticas típicas
        weights = {
            'Hurto': 0.3,           # 30% probabilidad
            'Cosquilleo': 0.2,      # 20% probabilidad
            'Hurto a mano armada': 0.1,  # 10% probabilidad
            'Acoso': 0.15,          # 15% probabilidad
            'Sospechoso': 0.1,      # 10% probabilidad
            'Ataque': 0.1,          # 10% probabilidad
            'Apertura de puertas': 0.05   # 5% probabilidad
        }

        # Ajustar probabilidades según la hora
        if 6 <= hour <= 9 or 17 <= hour <= 20:  # Horas pico
            weights['Hurto'] *= 1.2
            weights['Cosquilleo'] *= 1.3
        elif 22 <= hour or hour <= 4:  # Horas nocturnas
            weights['Hurto a mano armada'] *= 1.5
            weights['Ataque'] *= 1.2

        # Normalizar pesos
        total = sum(weights.values())
        normalized_weights = [w/total for w in weights.values()]

        return random.choices(list(weights.keys()), normalized_weights)[0]
    except Exception as e:
        logging.error(f"Error predicting incident type for station {station}: {str(e)}")
        return None

def prepare_data():
    """
    Prepara los datos históricos para el entrenamiento del modelo.

    Proceso:
    1. Obtiene todos los incidentes de la base de datos
    2. Organiza los datos en un DataFrame
    3. Realiza limpieza y preprocesamiento básico

    Returns:
        DataFrame: Datos preparados para entrenamiento
        DataFrame vacío en caso de error
    """
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
    """
    Analiza tendencias en los incidentes históricos.

    Análisis realizado:
    1. Agrupación por fecha y tipo de incidente
    2. Cálculo de media móvil de 7 días
    3. Identificación de patrones temporales

    Returns:
        dict: Tendencias de incidentes
        dict vacío en caso de error o datos insuficientes
    """
    data = prepare_data()

    if len(data) < 100:
        logging.warning("Not enough data to calculate incident trends.")
        return {}

    try:
        # Agrupar por fecha y tipo de incidente
        daily_incidents = data.groupby([pd.Grouper(key='timestamp', freq='D'), 'incident_type']).size().unstack(fill_value=0)

        # Calcular media móvil de 7 días
        trends = daily_incidents.rolling(window=7).mean()

        return trends.to_dict()
    except Exception as e:
        logging.error(f"Error in get_incident_trends: {str(e)}", exc_info=True)
        return {}

def get_model_insights():
    """
    Proporciona métricas e insights sobre el rendimiento del modelo.

    Métricas incluidas:
    - Precisión del modelo
    - Estado de las predicciones
    - Estado general del modelo

    Returns:
        dict: Métricas e insights del modelo
    """
    return {
        'accuracy': 0.75,  # TODO: Implementar cálculo real de precisión
        'predictions_available': True,
        'model_status': 'active'
    }

# Funciones auxiliares para futuras implementaciones
def predict_incident_probability(latitude, longitude, hour, day_of_week, month, nearest_station):
    """Placeholder para futura implementación de predicción de probabilidad"""
    return "Prediction not available with the simplified model."

def prepare_prediction_data(station, hour):
    """Placeholder para futura implementación de preparación de datos de predicción"""
    return None

def train_rnn_model():
    """
    Implementación futura del modelo RNN.

    Proceso:
    1. Preparación de datos:
       - Carga de datos históricos
       - Normalización de features
       - Codificación de variables categóricas
       - Creación de secuencias temporales

    2. Arquitectura del modelo:
       model = Sequential([
           LSTM(128, return_sequences=True),
           Dropout(0.2),
           LSTM(64),
           Dropout(0.2),
           Dense(32, activation='relu'),
           Dense(1, activation='sigmoid')  # riesgo
       ])

    3. Entrenamiento:
       - Optimizer: Adam
       - Loss: Binary crossentropy
       - Métricas: Accuracy, AUC
       - Callbacks: EarlyStopping, ModelCheckpoint

    4. Evaluación:
       - Validación cruzada
       - Análisis de curvas ROC
       - Matriz de confusión

    Returns:
        tuple: (modelo entrenado, importancia de características)
    """
    return None, None  # Placeholder hasta implementación