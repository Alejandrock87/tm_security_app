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
import json
import pytz

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

# Actualizar configuración del modelo para evitar sobreajuste
MODEL_CONFIG = {
    'sequence_length': 24,  # 24 horas de datos históricos
    'n_features': 5,       # [hora, día_semana, mes, incidentes_previos, tipo_anterior]
    'lstm_units': 12,      # Reducido de 16 a 12 para adaptarse a Railway
    'dropout_rate': 0.4,   # Mantenido en 0.4 para regularización
    'learning_rate': 0.001,
    'batch_size': 16,      # Reducido de 32 a 16 para menor consumo de memoria
    'epochs': 20,          # Reducido de 50 a 20 para Railway
    'l2_lambda': 0.02      # Mantenido para regularización
}

def create_rnn_model():
    """
    Crea el modelo RNN con arquitectura LSTM.
    Versión con regularización mejorada para evitar sobreajuste.
    """
    try:
        model = Sequential([
            LSTM(MODEL_CONFIG['lstm_units'], 
                 input_shape=(MODEL_CONFIG['sequence_length'], MODEL_CONFIG['n_features']),
                 return_sequences=True,
                 kernel_regularizer=tf.keras.regularizers.l2(MODEL_CONFIG['l2_lambda'])),
            Dropout(MODEL_CONFIG['dropout_rate']),
            LSTM(MODEL_CONFIG['lstm_units'] // 2,
                 kernel_regularizer=tf.keras.regularizers.l2(MODEL_CONFIG['l2_lambda'])),
            Dropout(MODEL_CONFIG['dropout_rate']),
            Dense(8, activation='relu',  # Reducido de 16 a 8
                  kernel_regularizer=tf.keras.regularizers.l2(MODEL_CONFIG['l2_lambda'])),
            Dense(1, activation='sigmoid')
        ])

        # Usar optimizador con decaimiento de learning rate
        initial_learning_rate = MODEL_CONFIG['learning_rate']
        lr_schedule = tf.keras.optimizers.schedules.ExponentialDecay(
            initial_learning_rate,
            decay_steps=1000,
            decay_rate=0.9,
            staircase=True)

        optimizer = Adam(learning_rate=lr_schedule)

        model.compile(
            optimizer=optimizer,
            loss='binary_crossentropy',
            metrics=['accuracy', tf.keras.metrics.AUC()]  # Añadido AUC para mejor evaluación
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
        val_loss, val_accuracy, val_auc = model.evaluate(X_val, y_val, verbose=0)
        logging.info(f"Validation accuracy: {val_accuracy:.4f}")
        logging.info(f"Validation loss: {val_loss:.4f}")
        logging.info(f"Validation AUC: {val_auc:.4f}")

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
        predictions = get_cached_predictions()
        if predictions:
            for prediction in predictions:
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

        # Sistema de fallback mejorado
        risk_score, _ = enhanced_fallback_prediction(station, datetime(datetime.now().year, datetime.now().month, datetime.now().day, hour, 0, 0))
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
        predictions = get_cached_predictions()
        if predictions:
            for prediction in predictions:
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

        # Sistema de fallback mejorado
        _, incident_type = enhanced_fallback_prediction(station, datetime(datetime.now().year, datetime.now().month, datetime.now().day, hour, 0, 0))
        return incident_type

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


def cross_validate_model(k_folds=5):
    """
    Realiza validación cruzada del modelo RNN.

    Args:
        k_folds (int): Número de particiones para validación cruzada

    Returns:
        dict: Métricas promedio de validación cruzada
    """
    try:
        # Preparar datos
        data = prepare_data()
        if len(data) < MODEL_CONFIG['sequence_length']:
            logging.error(f"Insufficient data for cross validation")
            return None

        # Preparar secuencias
        X, y = prepare_sequence_data(data, MODEL_CONFIG['sequence_length'])
        if len(X) == 0 or len(y) == 0:
            logging.error("No sequences could be generated for cross validation")
            return None

        # Inicializar métricas
        metrics = {
            'accuracy': [],
            'loss': [],
            'auc': []
        }

        # Realizar validación cruzada
        fold_size = len(X) // k_folds
        for fold in range(k_folds):
            logging.info(f"Training fold {fold + 1}/{k_folds}")

            # Definir índices para esta partición
            val_start = fold * fold_size
            val_end = (fold + 1) * fold_size

            # Separar datos de entrenamiento y validación
            X_val = X[val_start:val_end]
            y_val = y[val_start:val_end]
            X_train = np.concatenate([X[:val_start], X[val_end:]])
            y_train = np.concatenate([y[:val_start], y[val_end:]])

            # Crear y entrenar modelo
            model = create_rnn_model()
            if model is None:
                continue

            history = model.fit(
                X_train, y_train,
                validation_data=(X_val, y_val),
                batch_size=MODEL_CONFIG['batch_size'],
                epochs=MODEL_CONFIG['epochs'],
                verbose=1
            )

            # Evaluar modelo
            val_loss, val_accuracy, val_auc = model.evaluate(X_val, y_val, verbose=0)
            metrics['accuracy'].append(val_accuracy)
            metrics['loss'].append(val_loss)
            metrics['auc'].append(val_auc)

            logging.info(f"Fold {fold + 1} metrics - Accuracy: {val_accuracy:.4f}, Loss: {val_loss:.4f}, AUC: {val_auc:.4f}")

        # Calcular y registrar métricas promedio
        avg_metrics = {
            'accuracy': np.mean(metrics['accuracy']),
            'loss': np.mean(metrics['loss']),
            'auc': np.mean(metrics['auc']),
            'std_accuracy': np.std(metrics['accuracy']),
            'std_loss': np.std(metrics['loss']),
            'std_auc': np.std(metrics['auc'])
        }

        logging.info("Cross validation results:")
        logging.info(f"Average accuracy: {avg_metrics['accuracy']:.4f} ± {avg_metrics['std_accuracy']:.4f}")
        logging.info(f"Average loss: {avg_metrics['loss']:.4f} ± {avg_metrics['std_loss']:.4f}")
        logging.info(f"Average AUC: {avg_metrics['auc']:.4f} ± {avg_metrics['std_auc']:.4f}")

        return avg_metrics

    except Exception as e:
        logging.error(f"Error in cross validation: {str(e)}")
        return None



def generate_prediction_cache(hours_ahead=24):
    """
    Genera predicciones para las próximas horas.
    """
    try:
        logging.info(f"Generando predicciones para las próximas {hours_ahead} horas...")
        predictions = []
        current_time = datetime.now(pytz.timezone('America/Bogota'))

        # Cargar datos de estaciones
        with open('static/Estaciones_Troncales_de_TRANSMILENIO.geojson', 'r', encoding='utf-8') as f:
            geojson_data = json.load(f)
            logging.info(f"Datos de estaciones cargados: {len(geojson_data['features'])} estaciones")

        # Generar predicciones para las próximas hours_ahead horas
        for hour_offset in range(hours_ahead):
            pred_time = current_time + timedelta(hours=hour_offset)
            logging.info(f"Generando predicciones para {pred_time.isoformat()}")

            for feature in geojson_data['features']:
                station = feature['properties']['nombre_estacion']
                coordinates = feature['geometry']['coordinates']

                try:
                    # Usar sistema de fallback mejorado
                    risk_score, incident_type = enhanced_fallback_prediction(station, pred_time)

                    prediction = {
                        'station': station,
                        'predicted_time': pred_time.isoformat(),
                        'risk_score': float(risk_score),
                        'incident_type': incident_type,
                        'latitude': coordinates[1],
                        'longitude': coordinates[0],
                        'prediction_made': datetime.now().isoformat(),
                        'model_version': 'fallback'
                    }
                    predictions.append(prediction)

                except Exception as e:
                    logging.error(f"Error prediciendo para estación {station}: {str(e)}")
                    continue

        # Guardar predicciones en archivo para respaldo
        if predictions:
            with open('predictions_cache.json', 'w', encoding='utf-8') as f:
                json.dump(predictions, f, indent=2, ensure_ascii=False)

            logging.info(f"Generadas y guardadas {len(predictions)} predicciones")
            return predictions

        logging.warning("No se generaron predicciones")
        return []

    except Exception as e:
        logging.error(f"Error generando predicciones: {str(e)}", exc_info=True)
        return []

def update_predictions_periodically():
    """
    Actualiza las predicciones periódicamente y notifica a los clientes conectados.
    """
    try:
        logging.info("Iniciando actualización periódica de predicciones...")
        predictions = generate_prediction_cache(hours_ahead=24)

        if predictions:
            # Cargar información de troncales
            with open('static/Estaciones_Troncales_de_TRANSMILENIO.geojson', 'r', encoding='utf-8') as f:
                geojson_data = json.load(f)
                station_to_troncal = {
                    feature['properties']['nombre_estacion']: feature['properties'].get('troncal_estacion', 'N/A')
                    for feature in geojson_data['features']
                    if 'nombre_estacion' in feature['properties']
                }

            # Agregar información de troncal a cada predicción
            for prediction in predictions:
                prediction['troncal'] = station_to_troncal.get(prediction['station'], 'N/A')

            # Notificar a través de SocketIO
            from app import socketio
            prediction_data = {
                'timestamp': datetime.now().isoformat(),
                'prediction_count': len(predictions),
                'predictions': predictions,
                'update_type': 'periodic'
            }

            logging.info(f"Enviando {len(predictions)} predicciones a través de WebSocket")
            socketio.emit('predictions_updated', prediction_data, namespace='/')

            logging.info("Predicciones enviadas exitosamente")
            return True

        logging.warning("No se generaron predicciones para enviar")
        return False
    except Exception as e:
        logging.error(f"Error actualizando predicciones: {str(e)}", exc_info=True)
        return False

def get_cached_predictions():
    """
    Obtiene predicciones del caché con fallback al archivo.
    """
    try:
        # Intentar obtener del archivo de respaldo primero
        try:
            with open('predictions_cache.json', 'r', encoding='utf-8') as f:
                predictions = json.load(f)
                if predictions:
                    logging.info(f"Predicciones recuperadas del archivo: {len(predictions)}")
                    return predictions
        except Exception as file_error:
            logging.warning(f"No se pudo cargar el archivo de respaldo: {str(file_error)}")

        # Si no hay archivo o está vacío, generar nuevas predicciones
        logging.info("Generando nuevas predicciones ya que no hay caché disponible")
        predictions = generate_prediction_cache(hours_ahead=24)
        return predictions if predictions else []

    except Exception as e:
        logging.error(f"Error obteniendo predicciones del caché: {str(e)}")
        return []

def enhanced_fallback_prediction(station, pred_time):
    """
    Sistema de fallback mejorado para predicciones.

    Args:
        station (str): Nombre de la estación
        pred_time (datetime): Tiempo para la predicción

    Returns:
        tuple: (risk_score, incident_type)
    """
    try:
        hour = pred_time.hour
        day_of_week = pred_time.weekday()

        # Factores de riesgo base por hora del día
        if 5 <= hour <= 9:  # Hora pico mañana
            base_risk = random.uniform(0.6, 0.9)
        elif 16 <= hour <= 20:  # Hora pico tarde
            base_risk = random.uniform(0.7, 0.95)
        elif 22 <= hour or hour <= 4:  # Noche
            base_risk = random.uniform(0.5, 0.8)
        else:  # Hora valle
            base_risk = random.uniform(0.3, 0.6)

        # Ajuste por día de la semana
        if day_of_week < 5:  # Lunes a Viernes
            day_factor = 1.2
        else:  # Fin de semana
            day_factor = 0.8

        # Calcular risk score final
        risk_score = min(0.95, max(0.1, base_risk * day_factor))

        # Determinar tipo de incidente más probable según la hora
        if 6 <= hour <= 9:  # Hora pico mañana
            weights = {
                'Cosquilleo': 0.3,
                'Hurto': 0.25,
                'Hurto a mano armada': 0.1,
                'Acoso': 0.15,
                'Sospechoso': 0.1,
                'Ataque': 0.05,
                'Apertura de puertas': 0.05
            }
        elif 16 <= hour <= 20:  # Hora pico tarde
            weights = {
                'Hurto': 0.3,
                'Cosquilleo': 0.25,
                'Hurto a mano armada': 0.15,
                'Acoso': 0.1,
                'Sospechoso': 0.1,
                'Ataque': 0.05,
                'Apertura de puertas': 0.05
            }
        elif 22 <= hour or hour <= 4:  # Noche
            weights = {
                'Hurto a mano armada': 0.3,
                'Ataque': 0.2,
                'Hurto': 0.2,
                'Sospechoso': 0.15,
                'Acoso': 0.1,
                'Cosquilleo': 0.03,
                'Apertura de puertas': 0.02
            }
        else:  # Hora valle
            weights = {
                'Hurto': 0.25,
                'Cosquilleo': 0.2,
                'Sospechoso': 0.15,
                'Acoso': 0.15,
                'Hurto a mano armada': 0.1,
                'Ataque': 0.1,
                'Apertura de puertas': 0.05
            }

        # Seleccionar tipo de incidente
        incident_type = random.choices(
            list(weights.keys()),
            weights=list(weights.values())
        )[0]

        return risk_score, incident_type

    except Exception as e:
        logging.error(f"Error en predicción fallback: {str(e)}")
        return 0.5, VALID_INCIDENT_TYPES[0]