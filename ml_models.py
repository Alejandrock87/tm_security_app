import logging
import os
import pickle
import time
from datetime import datetime, timedelta

# Configure basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODEL_CACHE_FILE = 'model_cache.pkl'
FEATURE_CACHE_FILE = 'feature_cache.pkl'

def load_ml_dependencies():
    """Lazy load ML dependencies to avoid startup issues"""
    try:
        global np, pd, Pipeline, StandardScaler, OneHotEncoder, LabelEncoder
        global RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
        global SMOTE, Sequential, LSTM, Dense, Dropout, BatchNormalization, Adam

        import numpy as np
        import pandas as pd
        from sklearn.pipeline import Pipeline
        from sklearn.preprocessing import StandardScaler, OneHotEncoder, LabelEncoder
        from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
        from imblearn.over_sampling import SMOTE
        from tensorflow.keras.models import Sequential
        from tensorflow.keras.layers import LSTM, Dense, Dropout, BatchNormalization
        from tensorflow.keras.optimizers import Adam

        return True
    except ImportError as e:
        logger.error(f"Failed to load ML dependencies: {str(e)}")
        return False

def prepare_rnn_data():
    try:
        # Reemplazar transaction_context con una consulta directa
        incidents = Incident.query.order_by(Incident.timestamp).all()

        if not incidents:
            logging.warning("No incidents found in database")
            return None, None, None

        logging.info(f"Found {len(incidents)} incidents")

        # Validación inicial de datos
        if len(incidents) < 100:
            logging.warning("Insufficient data for training")
            return None, None, None

        df = pd.DataFrame([{
            'timestamp': incident.timestamp,
            'hour': incident.timestamp.hour,
            'day_of_week': incident.timestamp.weekday(),
            'month': incident.timestamp.month,
            'station': incident.nearest_station,
            'latitude': incident.latitude,
            'longitude': incident.longitude,
            'incident_type': incident.incident_type,
            'is_weekend': incident.timestamp.weekday() >= 5,
            'is_peak_hour': incident.timestamp.hour in [6,7,8,17,18,19]
        } for incident in incidents])

        # Normalización de coordenadas
        scaler = StandardScaler()
        df[['latitude', 'longitude']] = scaler.fit_transform(df[['latitude', 'longitude']])

        # Codificación de variables categóricas
        le = LabelEncoder()
        df['incident_type_encoded'] = le.fit_transform(df['incident_type'])
        incident_types = le.classes_

        # Crear secuencias temporales con validación
        sequence_length = 24
        X = []
        y = []

        feature_columns = ['hour', 'day_of_week', 'month', 'latitude', 
                         'longitude', 'is_weekend', 'is_peak_hour']

        for station in df['station'].unique():
            station_data = df[df['station'] == station].sort_values('timestamp')
            if len(station_data) >= sequence_length:
                sequences = []
                for i in range(len(station_data) - sequence_length):
                    sequence = station_data.iloc[i:i+sequence_length]
                    features = sequence[feature_columns].values
                    if features.shape == (sequence_length, len(feature_columns)):
                        sequences.append(features)
                        y.append(station_data.iloc[i+sequence_length]['incident_type_encoded'])

                if sequences:
                    X.extend(sequences)

        if not X:
            logging.error("No valid sequences generated")
            return None, None, None

        X = np.array(X, dtype=np.float32)
        y = np.array(y, dtype=np.int32)

        # Validación de dimensiones
        if len(X.shape) != 3:
            logging.error(f"Invalid tensor shape. Expected 3D, got {len(X.shape)}D")
            return None, None, None

        if X.shape[1] != sequence_length:
            logging.error(f"Invalid sequence length. Expected {sequence_length}, got {X.shape[1]}")
            return None, None, None

        logging.info(f"X shape: {X.shape}, y shape: {y.shape}")
        return X, y, len(incident_types)

    except Exception as e:
        logging.error(f"Error preparing RNN data: {str(e)}")
        return None, None, None

def create_rnn_model(input_shape, num_classes):
    logging.info(f"Creating RNN model with input_shape={input_shape}, num_classes={num_classes}")
    model = Sequential([
        LSTM(64, return_sequences=True, 
             input_shape=input_shape,
             kernel_regularizer=l2(0.001)),
        BatchNormalization(),
        Dropout(0.2),
        LSTM(64, return_sequences=True),
        BatchNormalization(),
        Dropout(0.3),
        LSTM(32),
        BatchNormalization(),
        Dropout(0.2),
        Dense(32, activation='relu'),
        BatchNormalization(),
        Dropout(0.2),
        Dense(num_classes, activation='softmax')
    ])

    model.compile(
        optimizer=Adam(learning_rate=0.001),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    return model

def train_model():
    X, y, num_classes = prepare_rnn_data()
    if X is None or y is None or num_classes is None:
        logging.error("Failed to prepare data for training")
        return None, None

    try:
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        # Crear y entrenar modelo
        input_shape = (X_train.shape[1], X_train.shape[2])
        model = create_rnn_model(input_shape, num_classes)

        early_stopping = EarlyStopping(
            monitor='val_loss',
            patience=10,
            restore_best_weights=True
        )

        reduce_lr = ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.2,
            patience=5,
            min_lr=0.0001
        )

        history = model.fit(
            X_train, y_train,
            epochs=100,
            batch_size=32,
            validation_split=0.2,
            callbacks=[early_stopping, reduce_lr],
            shuffle=True
        )

        test_loss, test_acc = model.evaluate(X_test, y_test)
        logging.info(f"Test accuracy: {test_acc:.4f}")

        return model, history

    except Exception as e:
        logging.error(f"Error training model: {str(e)}")
        return None, None

def prepare_data():
    with db.session.begin(): #using db session directly as per intention.
        incidents = Incident.query.order_by(Incident.timestamp).all()

    if not incidents:
        return pd.DataFrame()

    # Crear DataFrame con ordenamiento temporal
    data = pd.DataFrame([
        {
            'incident_type': incident.incident_type,
            'latitude': incident.latitude,
            'longitude': incident.longitude,
            'hour': incident.timestamp.hour,
            'day_of_week': incident.timestamp.weekday(),
            'month': incident.timestamp.month,
            'nearest_station': incident.nearest_station,
            'timestamp': incident.timestamp
        }
        for incident in incidents
    ])

    # Advanced feature engineering
    data['is_weekend'] = data['day_of_week'].isin([5, 6]).astype(int)
    data['is_night'] = ((data['hour'] >= 22) | (data['hour'] < 6)).astype(int)
    data['distance_from_center'] = np.sqrt((data['latitude'] - data['latitude'].mean())**2 + 
                                           (data['longitude'] - data['longitude'].mean())**2)
    data['time_of_day'] = pd.cut(data['hour'], bins=[0, 6, 12, 18, 24], labels=['Night', 'Morning', 'Afternoon', 'Evening'])
    data['season'] = pd.cut(data['month'], bins=[0, 3, 6, 9, 12], labels=['Winter', 'Spring', 'Summer', 'Fall'])

    # New features
    data['incident_count'] = data.groupby('nearest_station')['incident_type'].transform('count')
    data['station_risk_score'] = data.groupby('nearest_station')['incident_type'].transform(lambda x: x.nunique() / len(x))

    # Time-based features
    data['day_of_month'] = data['timestamp'].dt.day
    data['week_of_year'] = data['timestamp'].dt.isocalendar().week

    # Interaction features
    data['hour_day_interaction'] = data['hour'] * data['day_of_week']
    data['lat_long_interaction'] = data['latitude'] * data['longitude']

    return data

def load_cached_model():
    try:
        if os.path.exists(MODEL_CACHE_FILE) and os.path.exists(FEATURE_CACHE_FILE):
            # Check if cache is less than 24 hours old
            cache_time = os.path.getmtime(MODEL_CACHE_FILE)
            if time.time() - cache_time < 24 * 3600:  # 24 hours in seconds
                with open(MODEL_CACHE_FILE, 'rb') as f:
                    model = pickle.load(f)
                with open(FEATURE_CACHE_FILE, 'rb') as f:
                    feature_importance = pickle.load(f)
                return model, feature_importance
    except Exception as e:
        logging.error(f"Error loading cached model: {e}")
    return None, None

def save_model_cache(model, feature_importance):
    try:
        with open(MODEL_CACHE_FILE, 'wb') as f:
            pickle.dump(model, f)
        with open(FEATURE_CACHE_FILE, 'wb') as f:
            pickle.dump(feature_importance, f)
    except Exception as e:
        logging.error(f"Error saving model cache: {e}")


def predict_incident_probability(latitude, longitude, hour, day_of_week, month, nearest_station):
    model, _ = train_model()

    if model is None:
        return "Not enough data to make predictions yet."

    # Feature engineering for input data
    is_weekend = int(day_of_week in [5, 6])
    is_night = int((hour >= 22) or (hour < 6))
    distance_from_center = np.sqrt((latitude - 4.6097)**2 + (longitude - (-74.0817))**2)  # Bogotá coordinates
    time_of_day = pd.cut([hour], bins=[0, 6, 12, 18, 24], labels=['Night', 'Morning', 'Afternoon', 'Evening'])[0]
    season = pd.cut([month], bins=[0, 3, 6, 9, 12], labels=['Winter', 'Spring', 'Summer', 'Fall'])[0]

    # Get incident count and station risk score for the nearest station
    data = prepare_data()
    station_data = data[data['nearest_station'] == nearest_station]
    incident_count = station_data['incident_count'].iloc[0] if not station_data.empty else 0
    station_risk_score = station_data['station_risk_score'].iloc[0] if not station_data.empty else 0

    input_data = pd.DataFrame({
        'latitude': [latitude],
        'longitude': [longitude],
        'hour': [hour],
        'day_of_week': [day_of_week],
        'month': [month],
        'nearest_station': [nearest_station],
        'is_weekend': [is_weekend],
        'is_night': [is_night],
        'distance_from_center': [distance_from_center],
        'time_of_day': [time_of_day],
        'season': [season],
        'incident_count': [incident_count],
        'station_risk_score': [station_risk_score]
    })

    # Make prediction
    probabilities = model.predict_proba(input_data)[0]

    # Get the incident types in order
    incident_types = model.named_steps['classifier'].classes_

    # Create a dictionary of incident types and their probabilities
    prediction = {incident_type: float(prob) for incident_type, prob in zip(incident_types, probabilities)}

    return prediction

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
    try:
        model, feature_importance = train_model()

        if model is None:
            return "Not enough data to generate insights. Please ensure there are at least 100 incident reports."

        # Get cross-validation scores
        data = prepare_data()
        X = data.drop('incident_type', axis=1)
        y = data['incident_type']
        cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        cv_scores = cross_val_score(model, X, y, cv=cv)

        insights = {
            "feature_importance": feature_importance,
            "model_parameters": model.named_steps['classifier'].get_params(),
            "top_predictors": sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)[:10],
            "cross_validation_scores": {
                "mean": float(np.mean(cv_scores)),
                "std": float(np.std(cv_scores)),
                "scores": [float(score) for score in cv_scores]
            }
        }
        return insights
    except Exception as e:
        logging.error(f"Error in get_model_insights: {str(e)}", exc_info=True)
        return "An error occurred while generating model insights. Please check the logs for more information."

def predict_station_risk(station, hour):
    """Wrapper for station risk prediction with error handling"""
    try:
        if not load_ml_dependencies():
            return 0.5  # Return default risk score if dependencies fail

        model, history = train_rnn_model()
        if model is None:
            return 0.5

        # Preparar datos de entrada para la predicción
        input_data = prepare_prediction_data(station, hour)
        if input_data is None:
            return 0.5

        predictions = model.predict(input_data)
        # Tomar el máximo de las probabilidades como score de riesgo
        risk_score = float(np.max(predictions[0]))

        return risk_score
    except Exception as e:
        logger.error(f"Error in station risk prediction: {str(e)}")
        return 0.5

def predict_incident_type(station, hour):
    """Wrapper for incident type prediction with error handling"""
    try:
        if not load_ml_dependencies():
            return "Hurto"  # Return default prediction if dependencies fail

        incidents = Incident.query.filter_by(nearest_station=station).all()
        if not incidents:
            return "Hurto"  # Default prediction

        # Get most common incident type for this hour
        hour_incidents = [i for i in incidents if i.timestamp.hour == hour]
        if not hour_incidents:
            return "Hurto"

        incident_counts = {}
        for incident in hour_incidents:
            incident_counts[incident.incident_type] = incident_counts.get(incident.incident_type, 0) + 1

        return max(incident_counts.items(), key=lambda x: x[1])[0]
    except Exception as e:
        logger.error(f"Error in incident type prediction: {str(e)}")
        return "Hurto"

#This function was not in the original code, added for completeness based on function call in predict_station_risk
def prepare_prediction_data(station, hour):
    try:
        # Obtener datos históricos de la estación
        incidents = Incident.query.filter_by(nearest_station=station).order_by(Incident.timestamp.desc()).limit(24).all()

        if len(incidents) < 24:
            logging.warning(f"Insufficient historical data for station {station}")
            return None

        # Preparar features
        sequence = []
        for incident in incidents:
            features = [
                incident.timestamp.hour,
                incident.timestamp.weekday(),
                incident.timestamp.month,
                incident.latitude,
                incident.longitude,
                1 if incident.timestamp.weekday() >= 5 else 0,
                1 if incident.timestamp.hour in [6,7,8,17,18,19] else 0
            ]
            sequence.append(features)

        # Convertir a numpy array y normalizar si es necesario
        sequence = np.array(sequence, dtype=np.float32)

        # Expandir dimensiones para match con formato de entrada del modelo
        return np.expand_dims(sequence, axis=0)

    except Exception as e:
        logging.error(f"Error preparing prediction data: {str(e)}")
        return None  

def train_rnn_model():
    X, y, num_classes = prepare_rnn_data()
    if X is None:
        return None, None

    # Split datos
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Crear y entrenar modelo
    input_shape = (X_train.shape[1], X_train.shape[2])
    model = create_rnn_model(input_shape, num_classes)

    # Callbacks para mejor entrenamiento
    early_stopping = EarlyStopping(
        monitor='val_loss',
        patience=10,
        restore_best_weights=True
    )

    reduce_lr = ReduceLROnPlateau(
        monitor='val_loss',
        factor=0.2,
        patience=5,
        min_lr=0.0001
    )

    # Entrenamiento
    history = model.fit(
        X_train, y_train,
        epochs=100,
        batch_size=32,
        validation_split=0.2,
        callbacks=[early_stopping, reduce_lr],
        shuffle=True
    )

    # Evaluación
    test_loss, test_acc = model.evaluate(X_test, y_test)
    logging.info(f"Test accuracy: {test_acc:.4f}")

    return model, history


# Export only the necessary functions
__all__ = ['predict_station_risk', 'predict_incident_type']