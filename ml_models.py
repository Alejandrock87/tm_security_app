import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from models import Incident
from app import db

def prepare_data():
    # Fetch all incidents from the database
    incidents = Incident.query.all()
    
    # Convert incidents to a pandas DataFrame
    data = pd.DataFrame([
        {
            'incident_type': incident.incident_type,
            'latitude': incident.latitude,
            'longitude': incident.longitude,
            'hour': incident.timestamp.hour,
            'day_of_week': incident.timestamp.weekday(),
            'month': incident.timestamp.month
        }
        for incident in incidents
    ])
    
    # Encode categorical variables
    data = pd.get_dummies(data, columns=['incident_type'])
    
    return data

def train_model():
    data = prepare_data()
    
    if len(data) < 100:  # We need a minimum amount of data to train the model
        return None
    
    # Separate features and target
    X = data.drop('incident_type_Hurto', axis=1)  # Using 'Hurto' as the target variable
    y = data['incident_type_Hurto']
    
    # Split the data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Scale the features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Train the model
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train_scaled, y_train)
    
    # Evaluate the model
    y_pred = model.predict(X_test_scaled)
    accuracy = accuracy_score(y_test, y_pred)
    report = classification_report(y_test, y_pred)
    
    print(f"Model Accuracy: {accuracy}")
    print("Classification Report:")
    print(report)
    
    return model, scaler

def predict_incident_probability(latitude, longitude, hour, day_of_week, month):
    model, scaler = train_model()
    
    if model is None:
        return "Not enough data to make predictions yet."
    
    # Prepare the input data
    input_data = pd.DataFrame({
        'latitude': [latitude],
        'longitude': [longitude],
        'hour': [hour],
        'day_of_week': [day_of_week],
        'month': [month]
    })
    
    # Add dummy columns for all incident types (except 'Hurto' which is our target)
    incident_types = ['Hurto a mano armada', 'Cosquilleo', 'Ataque', 'Apertura de Puertas', 'Sospechoso', 'Acoso']
    for incident_type in incident_types:
        input_data[f'incident_type_{incident_type}'] = 0
    
    # Scale the input data
    input_data_scaled = scaler.transform(input_data)
    
    # Make prediction
    probability = model.predict_proba(input_data_scaled)[0][1]  # Probability of 'Hurto'
    
    return probability

def get_high_risk_areas():
    data = prepare_data()
    
    if len(data) < 100:  # We need a minimum amount of data to identify high-risk areas
        return []
    
    # Group by location and calculate incident frequency
    location_risk = data.groupby(['latitude', 'longitude']).size().reset_index(name='incident_count')
    
    # Sort by incident count in descending order and get top 5 high-risk areas
    high_risk_areas = location_risk.sort_values('incident_count', ascending=False).head(5)
    
    return high_risk_areas.to_dict('records')
