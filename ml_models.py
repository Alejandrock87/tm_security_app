import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from xgboost import XGBClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from models import Incident
from app import db
import logging
from datetime import datetime, timedelta

def prepare_data():
    incidents = Incident.query.all()
    
    if not incidents:
        return pd.DataFrame()
    
    data = pd.DataFrame([
        {
            'incident_type': incident.incident_type,
            'latitude': incident.latitude,
            'longitude': incident.longitude,
            'hour': incident.timestamp.hour,
            'day_of_week': incident.timestamp.weekday(),
            'month': incident.timestamp.month,
            'nearest_station': incident.nearest_station
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
    
    return data

def train_model():
    data = prepare_data()
    
    if len(data) < 100:
        logging.warning("Not enough data to train the model.")
        return None, None
    
    X = data.drop('incident_type', axis=1)
    y = data['incident_type']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Define preprocessing steps
    numeric_features = ['latitude', 'longitude', 'hour', 'day_of_week', 'month', 'is_weekend', 'is_night', 'distance_from_center']
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
    
    # Create pipelines for multiple models
    xgb_pipeline = Pipeline(steps=[('preprocessor', preprocessor),
                                   ('classifier', XGBClassifier(random_state=42))])
    
    rf_pipeline = Pipeline(steps=[('preprocessor', preprocessor),
                                  ('classifier', RandomForestClassifier(random_state=42))])
    
    # Hyperparameter tuning
    xgb_param_grid = {
        'classifier__n_estimators': [100, 200],
        'classifier__max_depth': [3, 5, 7],
        'classifier__learning_rate': [0.01, 0.1, 0.3]
    }
    
    rf_param_grid = {
        'classifier__n_estimators': [100, 200],
        'classifier__max_depth': [10, 20, None],
        'classifier__min_samples_split': [2, 5, 10]
    }
    
    xgb_grid_search = GridSearchCV(xgb_pipeline, xgb_param_grid, cv=5, n_jobs=-1, verbose=1)
    rf_grid_search = GridSearchCV(rf_pipeline, rf_param_grid, cv=5, n_jobs=-1, verbose=1)
    
    # Train both models
    xgb_grid_search.fit(X_train, y_train)
    rf_grid_search.fit(X_train, y_train)
    
    # Compare models and choose the best one
    xgb_score = xgb_grid_search.best_score_
    rf_score = rf_grid_search.best_score_
    
    best_model = xgb_grid_search.best_estimator_ if xgb_score > rf_score else rf_grid_search.best_estimator_
    
    # Evaluate the best model
    y_pred = best_model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    report = classification_report(y_test, y_pred)
    conf_matrix = confusion_matrix(y_test, y_pred)
    
    logging.info(f"Best Model: {'XGBoost' if xgb_score > rf_score else 'Random Forest'}")
    logging.info(f"Model Accuracy: {accuracy}")
    logging.info("Classification Report:")
    logging.info(report)
    logging.info("Confusion Matrix:")
    logging.info(conf_matrix)
    
    # Feature importance
    feature_importance = best_model.named_steps['classifier'].feature_importances_
    feature_names = (numeric_features + 
                     best_model.named_steps['preprocessor']
                     .named_transformers_['cat']
                     .named_steps['onehot']
                     .get_feature_names(categorical_features).tolist())
    
    feature_importance_dict = dict(zip(feature_names, feature_importance))
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
        'season': [season]
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
    model, feature_importance = train_model()
    
    if model is None:
        return "Not enough data to generate insights."
    
    insights = {
        "feature_importance": feature_importance,
        "model_parameters": model.named_steps['classifier'].get_params(),
        "top_predictors": sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)[:5]
    }
    
    return insights
