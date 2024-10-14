import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, GridSearchCV, cross_val_score
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from xgboost import XGBClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, roc_auc_score
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
    
    # New features
    data['incident_count'] = data.groupby('nearest_station')['incident_type'].transform('count')
    data['station_risk_score'] = data.groupby('nearest_station')['incident_type'].transform(lambda x: x.nunique() / len(x))
    
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
    numeric_features = ['latitude', 'longitude', 'hour', 'day_of_week', 'month', 'is_weekend', 'is_night', 'distance_from_center', 'incident_count', 'station_risk_score']
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
    
    # Create ensemble model
    xgb_model = XGBClassifier(random_state=42)
    rf_model = RandomForestClassifier(random_state=42)
    gb_model = GradientBoostingClassifier(random_state=42)
    
    ensemble_model = VotingClassifier(
        estimators=[
            ('xgb', xgb_model),
            ('rf', rf_model),
            ('gb', gb_model)
        ],
        voting='soft'
    )
    
    # Create pipeline
    model_pipeline = Pipeline(steps=[('preprocessor', preprocessor),
                                     ('classifier', ensemble_model)])
    
    # Hyperparameter tuning
    param_grid = {
        'classifier__xgb__n_estimators': [100, 200],
        'classifier__xgb__max_depth': [3, 5, 7],
        'classifier__xgb__learning_rate': [0.01, 0.1],
        'classifier__rf__n_estimators': [100, 200],
        'classifier__rf__max_depth': [10, 20, None],
        'classifier__gb__n_estimators': [100, 200],
        'classifier__gb__max_depth': [3, 5, 7],
        'classifier__gb__learning_rate': [0.01, 0.1]
    }
    
    grid_search = GridSearchCV(model_pipeline, param_grid, cv=5, n_jobs=-1, verbose=1)
    
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
    cv_scores = cross_val_score(best_model, X, y, cv=5)
    
    logging.info(f"Model Accuracy: {accuracy}")
    logging.info(f"ROC AUC Score: {roc_auc}")
    logging.info(f"Cross-validation Scores: {cv_scores}")
    logging.info(f"Mean CV Score: {np.mean(cv_scores)}")
    logging.info("Classification Report:")
    logging.info(report)
    logging.info("Confusion Matrix:")
    logging.info(conf_matrix)
    
    # Feature importance
    feature_importance = best_model.named_steps['classifier'].estimators_[1].feature_importances_
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
        cv_scores = cross_val_score(model, X, y, cv=5)
        
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
