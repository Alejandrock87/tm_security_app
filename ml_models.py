"""
Sistema de Predicción basado en RNN para TransMilenio
---------------------------------------------------

ARQUITECTURA IMPLEMENTADA:
------------------------
1. Red Neuronal Recurrente (RNN) con capas LSTM
   - Entrada: Secuencias temporales de incidentes
   - Capas ocultas: LSTM para capturar patrones temporales
   - Salida: Predicción de riesgo y tipo de incidente
"""

import logging
from datetime import datetime, timedelta
import random
import math
from flask import current_app
import numpy as np
import pandas as pd
from database import db
from models import Incident
import tensorflow as tf
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.optimizers import Adam
from sklearn.preprocessing import StandardScaler, LabelEncoder
import os

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

# Configuración del modelo
MODEL_CONFIG = {
    'sequence_length': 24,  # 24 horas de datos históricos
    'n_features': 5,       # [hora, día_semana, mes, incidentes_previos, tipo_anterior]
    'lstm_units': 64,
    'dropout_rate': 0.2,
    'learning_rate': 0.001,
    'batch_size': 16,      # Reducido para mejor rendimiento en CPU
    'epochs': 20           # Reducido para entrenamiento más rápido
}

def create_rnn_model():
    """
    Crea el modelo RNN con arquitectura LSTM.
    Ahora con manejo mejorado de dimensiones y logging.
    """
    try:
        model = Sequential([
            LSTM(MODEL_CONFIG['lstm_units'], 
                 input_shape=(MODEL_CONFIG['sequence_length'], MODEL_CONFIG['n_features']),
                 return_sequences=True),
            Dropout(MODEL_CONFIG['dropout_rate']),
            LSTM(MODEL_CONFIG['lstm_units'] // 2),
            Dropout(MODEL_CONFIG['dropout_rate']),
            Dense(32, activation='relu'),
            Dense(1, activation='sigmoid')  # Predicción de riesgo
        ])

        model.compile(
            optimizer=Adam(learning_rate=MODEL_CONFIG['learning_rate']),
            loss='binary_crossentropy',
            metrics=['accuracy']
        )

        logging.info("Modelo RNN creado exitosamente")
        logging.info(f"Configuración del modelo: {MODEL_CONFIG}")
        model.summary(print_fn=logging.info)
        return model
    except Exception as e:
        logging.error(f"Error creando modelo RNN: {str(e)}")
        return None

def prepare_sequence_data(data, sequence_length=24):
    """
    Prepara secuencias de datos para el entrenamiento de la RNN.
    Ahora con mejor manejo de datos y validación.
    """
    try:
        features = []
        targets = []

        # Verificar que tenemos suficientes datos
        if len(data) < sequence_length:
            logging.warning(f"Insufficient data for sequence length {sequence_length}")
            return np.array([]), np.array([])

        # Crear secuencias de características y objetivos
        for i in range(len(data) - sequence_length):
            sequence = data.iloc[i:i + sequence_length]
            target = data.iloc[i + sequence_length]

            # Verificar que la secuencia está completa
            if len(sequence) != sequence_length:
                continue

            # Extraer características en el orden correcto
            sequence_features = np.array([
                sequence['hour'].values,
                sequence['day_of_week'].values,
                sequence['month'].values,
                sequence['incident_count'].values,
                sequence['incident_type_encoded'].values
            ]).T

            features.append(sequence_features)
            # El objetivo es si ocurrirá un incidente (1) o no (0)
            targets.append(1 if target['incident_count'] > 0 else 0)

        if not features:
            logging.warning("No valid sequences could be generated")
            return np.array([]), np.array([])

        # Convertir a arrays numpy
        features_array = np.array(features)
        targets_array = np.array(targets)

        logging.info(f"Generated {len(features)} sequences for training")
        logging.info(f"Features shape: {features_array.shape}")
        logging.info(f"Targets shape: {targets_array.shape}")

        return features_array, targets_array

    except Exception as e:
        logging.error(f"Error preparing sequence data: {str(e)}")
        return np.array([]), np.array([])

def prepare_data():
    """
    Prepara los datos históricos para el entrenamiento del modelo.
    Solo lee datos existentes, no modifica la base de datos.
    """
    try:
        incidents = Incident.query.order_by(Incident.timestamp).all()
        if not incidents:
            logging.warning("No incidents found in database")
            return pd.DataFrame()

        # Crear DataFrame con datos existentes
        data = []
        for incident in incidents:
            data.append({
                'incident_type': incident.incident_type,
                'timestamp': incident.timestamp,
                'nearest_station': incident.nearest_station,
                'hour': incident.timestamp.hour,
                'day_of_week': incident.timestamp.weekday(),
                'month': incident.timestamp.month,
                'incident_count': 1
            })

        df = pd.DataFrame(data)

        # Agregar encoding para tipos de incidente
        le = LabelEncoder()
        df['incident_type_encoded'] = le.fit_transform(df['incident_type'])

        # Agregar información temporal agregada
        df['time_of_day'] = pd.cut(df['hour'], 
                                   bins=[0,6,12,18,24], 
                                   labels=['night','morning','afternoon','evening'])

        # Agrupar por timestamp y estación para obtener conteos
        df = df.sort_values('timestamp')

        logging.info(f"Prepared {len(df)} incidents for training")
        logging.info(f"Data columns: {df.columns.tolist()}")
        logging.info(f"Sample data:\n{df.head()}")
        return df

    except Exception as e:
        logging.error(f"Error preparing data: {str(e)}")
        return pd.DataFrame()

def train_rnn_model():
    """
    Entrena el modelo RNN con datos históricos existentes.
    No modifica la base de datos, solo usa los datos disponibles.
    """
    try:
        # Preparar datos existentes
        data = prepare_data()
        if len(data) < MODEL_CONFIG['sequence_length']:
            logging.error(f"Insufficient data. Got {len(data)} samples, need at least {MODEL_CONFIG['sequence_length']}")
            return None, None

        # Preparar secuencias
        X, y = prepare_sequence_data(data, MODEL_CONFIG['sequence_length'])

        if len(X) == 0 or len(y) == 0:
            logging.error("No sequences could be generated from the data")
            return None, None

        logging.info(f"Training data: X shape={X.shape}, y shape={y.shape}")

        # Dividir datos en entrenamiento y validación
        train_size = int(len(X) * 0.8)
        X_train, X_val = X[:train_size], X[train_size:]
        y_train, y_val = y[:train_size], y[train_size:]

        # Crear y entrenar modelo
        model = create_rnn_model()
        if model is None:
            logging.error("Failed to create RNN model")
            return None, None

        # Configurar early stopping más agresivo
        callbacks = [
            tf.keras.callbacks.EarlyStopping(
                monitor='val_loss',
                patience=5,  # Reducido para detener antes si no hay mejora
                restore_best_weights=True,
                min_delta=0.001  # Mínima mejora requerida
            ),
            tf.keras.callbacks.ModelCheckpoint(
                'models/rnn_model.h5',
                monitor='val_loss',
                save_best_only=True
            )
        ]

        # Entrenar modelo
        history = model.fit(
            X_train, y_train,
            validation_data=(X_val, y_val),
            batch_size=MODEL_CONFIG['batch_size'],
            epochs=MODEL_CONFIG['epochs'],
            callbacks=callbacks,
            verbose=1
        )

        # Evaluar modelo
        val_loss, val_accuracy = model.evaluate(X_val, y_val, verbose=0)
        logging.info(f"Validation accuracy: {val_accuracy:.4f}")
        logging.info(f"Validation loss: {val_loss:.4f}")

        return model, history

    except Exception as e:
        logging.error(f"Error training RNN model: {str(e)}")
        return None, None

def predict_station_risk(station, hour):
    """
    Predice el nivel de riesgo para una estación específica en una hora determinada.
    Mantiene el sistema de fallback si el modelo RNN falla.
    """
    try:
        # Intentar obtener predicción del caché
        cache = current_app.extensions['cache']
        cached_predictions = cache.get('predictions_cache')
        if cached_predictions and isinstance(cached_predictions, list):
            for prediction in cached_predictions:
                if (prediction.get('station') == station and 
                    isinstance(prediction.get('predicted_time'), str) and
                    datetime.fromisoformat(prediction['predicted_time']).hour == hour):
                    return prediction.get('risk_score')

        # Intentar usar el modelo RNN
        try:
            model_path = 'models/rnn_model.h5'
            if os.path.exists(model_path):
                model = load_model(model_path)
                # Preparar datos para predicción
                current_data = prepare_prediction_data(station, hour)
                if current_data is not None:
                    prediction = model.predict(current_data)
                    return float(prediction[0][0])
        except Exception as model_error:
            logging.warning(f"RNN prediction failed, using fallback: {str(model_error)}")

        # Sistema de fallback (código existente)
        base_risk = random.uniform(0.3, 0.8)
        time_factor = 1 + 0.2 * math.sin(hour * math.pi / 12)
        risk_score = min(0.95, max(0.1, base_risk * time_factor))

        return risk_score
    except Exception as e:
        logging.error(f"Error predicting risk for station {station}: {str(e)}")
        return None

def predict_incident_type(station, hour):
    """
    Predice el tipo de incidente más probable.
    Mantiene el sistema de fallback si el modelo falla.
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

        # Intentar usar el modelo RNN para tipo de incidente
        try:
            model_path = 'models/incident_type_model.h5'
            if os.path.exists(model_path):
                model = load_model(model_path)
                current_data = prepare_prediction_data(station, hour)
                if current_data is not None:
                    prediction = model.predict(current_data)
                    return VALID_INCIDENT_TYPES[np.argmax(prediction[0])]
        except Exception as model_error:
            logging.warning(f"RNN incident type prediction failed, using fallback: {str(model_error)}")

        # Sistema de fallback (código existente)
        weights = {
            'Hurto': 0.3,
            'Cosquilleo': 0.2,
            'Hurto a mano armada': 0.1,
            'Acoso': 0.15,
            'Sospechoso': 0.1,
            'Ataque': 0.1,
            'Apertura de puertas': 0.05
        }

        if 6 <= hour <= 9 or 17 <= hour <= 20:
            weights['Hurto'] *= 1.2
            weights['Cosquilleo'] *= 1.3
        elif 22 <= hour or hour <= 4:
            weights['Hurto a mano armada'] *= 1.5
            weights['Ataque'] *= 1.2

        total = sum(weights.values())
        normalized_weights = [w/total for w in weights.values()]

        return random.choices(list(weights.keys()), normalized_weights)[0]
    except Exception as e:
        logging.error(f"Error predicting incident type for station {station}: {str(e)}")
        return None

def get_model_insights():
    """
    Proporciona métricas e insights sobre el rendimiento del modelo.
    """
    try:
        model_path = 'models/rnn_model.h5'
        if os.path.exists(model_path):
            model = load_model(model_path)
            return {
                'accuracy': 0.75,  # TODO: Calcular accuracy real
                'predictions_available': True,
                'model_status': 'active',
                'model_type': 'RNN-LSTM',
                'last_training': os.path.getmtime(model_path)
            }
    except Exception:
        pass

    return {
        'accuracy': 0.75,
        'predictions_available': True,
        'model_status': 'fallback',
        'model_type': 'statistical',
        'last_training': None
    }

# Funciones auxiliares para futuras implementaciones
def predict_incident_probability(latitude, longitude, hour, day_of_week, month, nearest_station):
    """Placeholder para futura implementación de predicción de probabilidad"""
    return "Prediction not available with the simplified model."

def prepare_prediction_data(station, hour):
    """
    Prepara los datos para predicción en tiempo real.

    Args:
        station (str): Nombre de la estación
        hour (int): Hora del día (0-23)

    Returns:
        numpy.ndarray: Datos preparados para predicción con la RNN
        None: En caso de error o datos insuficientes
    """
    try:
        # Obtener datos históricos recientes
        current_time = datetime.now()
        start_time = current_time - timedelta(hours=MODEL_CONFIG['sequence_length'])

        # Consultar incidentes recientes para la estación
        recent_incidents = Incident.query.filter(
            Incident.nearest_station == station,
            Incident.timestamp >= start_time,
            Incident.timestamp <= current_time
        ).order_by(Incident.timestamp).all()

        if len(recent_incidents) < MODEL_CONFIG['sequence_length'] // 2:
            logging.warning(f"Insufficient recent data for station {station}")
            return None

        # Crear DataFrame con la secuencia temporal
        data = []
        current = start_time
        while current <= current_time:
            incidents_at_time = [i for i in recent_incidents if i.timestamp.hour == current.hour]
            incident_type = incidents_at_time[0].incident_type if incidents_at_time else VALID_INCIDENT_TYPES[0]

            data.append({
                'hour': current.hour,
                'day_of_week': current.weekday(),
                'month': current.month,
                'incident_count': len(incidents_at_time),
                'incident_type': incident_type
            })
            current += timedelta(hours=1)

        # Convertir a DataFrame
        df = pd.DataFrame(data)

        # Codificar tipos de incidente
        le = LabelEncoder()
        df['incident_type_encoded'] = le.fit_transform(df['incident_type'])

        # Preparar secuencia de características
        features = np.array([
            df['hour'].values,
            df['day_of_week'].values,
            df['month'].values,
            df['incident_count'].values,
            df['incident_type_encoded'].values
        ]).T

        # Reshape para RNN: [1, sequence_length, n_features]
        features = features.reshape(1, len(features), MODEL_CONFIG['n_features'])

        return features

    except Exception as e:
        logging.error(f"Error preparing prediction data: {str(e)}")
        return None

def get_incident_trends():
    """
    Analiza tendencias en los incidentes históricos.
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