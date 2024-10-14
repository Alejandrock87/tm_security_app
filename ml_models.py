import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from models import Incident
from app import db
import logging
from datetime import datetime, timedelta

def prepare_data():
    incidents = Incident.query.all()
    
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
    
    # Feature engineering
    data['is_weekend'] = data['day_of_week'].isin([5, 6]).astype(int)
    data['is_night'] = ((data['hour'] >= 22) | (data['hour'] < 6)).astype(int)
    data['distance_from_center'] = np.sqrt((data['latitude'] - data['latitude'].mean())**2 + 
                                           (data['longitude'] - data['longitude'].mean())**2)
    
    return data

def train_model():
    data = prepare_data()
    
    if len(data) < 100:
        return None, None
    
    X = data.drop('incident_type', axis=1)
    y = data['incident_type']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Define preprocessing steps
    numeric_features = ['latitude', 'longitude', 'hour', 'day_of_week', 'month', 'is_weekend', 'is_night', 'distance_from_center']
    categorical_features = ['nearest_station']
    
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
    
    # Create a pipeline with preprocessor and XGBoost classifier
    model = Pipeline(steps=[('preprocessor', preprocessor),
                            ('classifier', XGBClassifier(random_state=42))])
    
    # Hyperparameter tuning
    param_grid = {
        'classifier__n_estimators': [100, 200],
        'classifier__max_depth': [3, 5, 7],
        'classifier__learning_rate': [0.01, 0.1, 0.3]
    }
    
    grid_search = GridSearchCV(model, param_grid, cv=5, n_jobs=-1, verbose=1)
    grid_search.fit(X_train, y_train)
    
    best_model = grid_search.best_estimator_
    
    # Evaluate the model
    y_pred = best_model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    report = classification_report(y_test, y_pred)
    conf_matrix = confusion_matrix(y_test, y_pred)
    
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
    
    input_data = pd.DataFrame({
        'latitude': [latitude],
        'longitude': [longitude],
        'hour': [hour],
        'day_of_week': [day_of_week],
        'month': [month],
        'nearest_station': [nearest_station],
        'is_weekend': [is_weekend],
        'is_night': [is_night],
        'distance_from_center': [distance_from_center]
    })
    
    # Make prediction
    probabilities = model.predict_proba(input_data)[0]
    
    # Get the incident types in order
    incident_types = model.named_steps['classifier'].classes_
    
    # Create a dictionary of incident types and their probabilities
    prediction = {incident_type: float(prob) for incident_type, prob in zip(incident_types, probabilities)}
    
    return prediction

def get_high_risk_areas():
    data = prepare_data()
    
    if len(data) < 100:
        logging.warning("Not enough data to identify high-risk areas.")
        return []
    
    try:
        # Group by location and calculate incident frequency
        location_risk = data.groupby(['latitude', 'longitude']).size().reset_index(name='incident_count')
        
        # Calculate the risk score based on incident count and recency
        current_time = datetime.utcnow()
        location_risk['risk_score'] = location_risk.apply(lambda row: calculate_risk_score(row, current_time), axis=1)
        
        # Sort by risk score in descending order and get top 5 high-risk areas
        high_risk_areas = location_risk.sort_values('risk_score', ascending=False).head(5)
        
        return high_risk_areas.to_dict('records')
    except Exception as e:
        logging.error(f"Error in get_high_risk_areas: {str(e)}", exc_info=True)
        return []

def calculate_risk_score(row, current_time):
    incidents = Incident.query.filter_by(latitude=row['latitude'], longitude=row['longitude']).all()
    
    total_score = 0
    for incident in incidents:
        time_diff = current_time - incident.timestamp
        if time_diff <= timedelta(days=7):
            total_score += 1  # Higher weight for recent incidents
        elif time_diff <= timedelta(days=30):
            total_score += 0.5
        else:
            total_score += 0.1
    
    return total_score

def get_incident_trends():
    data = prepare_data()
    
    if len(data) < 100:
        return None
    
    # Group by date and incident type
    daily_incidents = data.groupby([pd.Grouper(key='timestamp', freq='D'), 'incident_type']).size().unstack(fill_value=0)
    
    # Calculate 7-day moving average
    trends = daily_incidents.rolling(window=7).mean()
    
    return trends.to_dict()

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
