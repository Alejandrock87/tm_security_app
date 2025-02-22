import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, GridSearchCV, cross_val_score, StratifiedKFold
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.feature_selection import SelectFromModel
from xgboost import XGBClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, roc_auc_score
from models import Incident
from database import db
import logging
from datetime import datetime, timedelta

def prepare_data():
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

import pickle
import os
from pathlib import Path

MODEL_CACHE_FILE = 'model_cache.pkl'
FEATURE_CACHE_FILE = 'feature_cache.pkl'

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

def train_model():
    model, feature_importance = load_cached_model()
    if model is not None and feature_importance is not None:
        logging.info("Using cached model")
        return model, feature_importance

    # Continue with training if no cached model exists
    data = prepare_data()

    if len(data) < 100:
        logging.warning("Not enough data to train the model.")
        return None, None

    X = data.drop('incident_type', axis=1)
    y = data['incident_type']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    # Define preprocessing steps
    numeric_features = ['latitude', 'longitude', 'hour', 'day_of_week', 'month', 'is_weekend', 'is_night', 'distance_from_center', 'incident_count', 'station_risk_score', 'day_of_month', 'week_of_year', 'hour_day_interaction', 'lat_long_interaction']
    categorical_features = ['nearest_station', 'time_of_day', 'season']

    numeric_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ])

    categorical_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='constant', fill_value='missing')),
        ('onehot', OneHotEncoder(handle_unknown='ignore'))
    ])

    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numeric_transformer, numeric_features),
            ('cat', categorical_transformer, categorical_features)
        ])

    from imblearn.over_sampling import SMOTE
    from imblearn.pipeline import Pipeline as ImbPipeline
    
    # Balancear clases
    smote = SMOTE(random_state=42)
    
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dense, Dropout, Embedding
    from tensorflow.keras.optimizers import Adam
    from tensorflow.keras.preprocessing.sequence import pad_sequences
    from tensorflow.keras.callbacks import EarlyStopping
    
    # Crear secuencias temporales
    sequence_length = 24  # 24 horas de historial
    
    # Modelo LSTM
    model = Sequential([
        LSTM(128, return_sequences=True, input_shape=(sequence_length, X_train.shape[2])),
        Dropout(0.3),
        LSTM(64, return_sequences=False),
        Dropout(0.3),
        Dense(32, activation='relu'),
        Dropout(0.2),
        Dense(len(np.unique(y)), activation='softmax')
    ])
    
    # Compilar modelo
    model.compile(
        optimizer=Adam(learning_rate=0.001),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    
    # Early stopping para evitar overfitting
    early_stopping = EarlyStopping(
        monitor='val_loss',
        patience=5,
        restore_best_weights=True
    )

    # Feature selection
    selector = SelectFromModel(RandomForestClassifier(n_estimators=100, random_state=42), threshold='median')

    # Create pipeline
    model_pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('selector', selector),
        ('classifier', ensemble_model)
    ])

    # Hyperparameter tuning
    param_grid = {
        'selector__estimator__max_depth': [5, 10],
        'classifier__xgb__max_depth': [3, 5],
        'classifier__rf__max_depth': [5, 10],
        'classifier__gb__max_depth': [3, 5],
    }

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    grid_search = GridSearchCV(model_pipeline, param_grid, cv=cv, n_jobs=-1, verbose=1, scoring='accuracy')

    # Train the model
    grid_search.fit(X_train, y_train)

    best_model = grid_search.best_estimator_

    # Evaluate the model
    y_pred = best_model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    report = classification_report(y_test, y_pred)
    conf_matrix = confusion_matrix(y_test, y_pred)

    # Calculate ROC AUC score
    y_pred_proba = best_model.predict_proba(X_test)
    roc_auc = roc_auc_score(y_test, y_pred_proba, multi_class='ovr')

    # Cross-validation score
    cv_scores = cross_val_score(best_model, X, y, cv=cv, scoring='accuracy')

    logging.info(f"Model Accuracy: {accuracy}")
    logging.info(f"ROC AUC Score: {roc_auc}")
    logging.info(f"Cross-validation Scores: {cv_scores}")
    logging.info(f"Mean CV Score: {np.mean(cv_scores)}")
    logging.info("Classification Report:")
    logging.info(report)
    logging.info("Confusion Matrix:")
    logging.info(conf_matrix)

    # Feature importance
    feature_importance = best_model.named_steps['selector'].estimator_.feature_importances_
    feature_names = (numeric_features + 
                     best_model.named_steps['preprocessor']
                     .named_transformers_['cat']
                     .named_steps['onehot']
                     .get_feature_names_out(categorical_features).tolist())

    selected_features_mask = best_model.named_steps['selector'].get_support()
    selected_feature_names = [name for name, selected in zip(feature_names, selected_features_mask) if selected]
    selected_feature_importance = feature_importance[selected_features_mask]

    feature_importance_dict = dict(zip(selected_feature_names, selected_feature_importance))
    logging.info("Feature Importance:")
    logging.info(feature_importance_dict)

    return best_model, feature_importance_dict

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

def create_rnn_model():
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dense, Dropout
    from tensorflow.keras.optimizers import Adam

    model = Sequential([
        LSTM(64, return_sequences=True, input_shape=(24, 7)),  # 24 horas, 7 características
        Dropout(0.2),
        LSTM(32),
        Dropout(0.2),
        Dense(16, activation='relu'),
        Dense(1, activation='sigmoid')
    ])

    model.compile(optimizer=Adam(learning_rate=0.001),
                 loss='binary_crossentropy',
                 metrics=['accuracy'])
    return model

def prepare_rnn_data():
    incidents = Incident.query.all()
    if not incidents:
        return None, None

    df = pd.DataFrame([{
        'hour': incident.timestamp.hour,
        'day_of_week': incident.timestamp.weekday(),
        'month': incident.timestamp.month,
        'station': incident.nearest_station,
        'latitude': incident.latitude,
        'longitude': incident.longitude,
        'incident_type': incident.incident_type
    } for incident in incidents])

    # Crear características temporales
    df['is_peak_hour'] = df['hour'].apply(lambda x: 1 if x in [6,7,8,17,18,19] else 0)

    # Codificar variables categóricas
    df_encoded = pd.get_dummies(df, columns=['station', 'incident_type'])

    # Preparar secuencias de 24 horas
    sequences = []
    labels = []
    for station in df['station'].unique():
        station_data = df_encoded[df_encoded[f'station_{station}'] == 1]
        for day in station_data['day_of_week'].unique():
            day_data = station_data[station_data['day_of_week'] == day]
            if len(day_data) >= 24:
                sequences.append(day_data.iloc[:24].values)
                labels.append(1 if len(day_data) > 24 else 0)

    return np.array(sequences), np.array(labels)

def train_rnn_model():
    X, y = prepare_rnn_data()
    if X is None:
        return None

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

    model = create_rnn_model()
    model.fit(X_train, y_train, epochs=50, batch_size=32, validation_split=0.2)

    return model

def predict_station_risk(station, hour):
    model = train_rnn_model()
    if model is None:
        return None

    # Preparar datos de entrada para la predicción
    input_data = prepare_prediction_data(station, hour)
    risk_score = model.predict(input_data)

    return float(risk_score[0])

def predict_incident_type(station, hour):
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