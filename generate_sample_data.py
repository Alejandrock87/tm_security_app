import random
from datetime import datetime, timedelta
import argparse
from app import app, db
from models import Incident, User
import numpy as np

# Bogotá's approximate bounding box
BOG_LAT_MIN, BOG_LAT_MAX = 4.4, 4.8
BOG_LON_MIN, BOG_LON_MAX = -74.2, -74.0

INCIDENT_TYPES = [
    'Hurto', 'Hurto a mano armada', 'Cosquilleo', 'Ataque',
    'Apertura de Puertas', 'Sospechoso', 'Acoso'
]

STATIONS = [
    "Portal Norte", "Calle 100", "Calle 72", "Calle 45", "Calle 26",
    "Ricaurte", "Portal Suba", "Portal 80", "Portal Américas", "Portal Sur",
    "Calle 187", "Terminal", "Calle 146", "Calle 127", "Pepe Sierra"
]

def generate_random_incident(user_id):
    lat = random.uniform(BOG_LAT_MIN, BOG_LAT_MAX)
    lon = random.uniform(BOG_LON_MIN, BOG_LON_MAX)
    incident_type = random.choice(INCIDENT_TYPES)
    nearest_station = random.choice(STATIONS)
    
    # Generate a random timestamp within the last year
    now = datetime.utcnow()
    random_days = random.randint(0, 365)
    random_timestamp = now - timedelta(days=random_days)
    
    return Incident(
        incident_type=incident_type,
        description=f"Sample incident: {incident_type}",
        latitude=lat,
        longitude=lon,
        timestamp=random_timestamp,
        user_id=user_id,
        nearest_station=nearest_station
    )

def generate_sample_data(num_samples):
    with app.app_context():
        # Ensure we have at least one user
        user = User.query.first()
        if not user:
            user = User(username="sample_user", email="sample@example.com")
            user.set_password("sample_password")
            db.session.add(user)
            db.session.commit()
        
        user_id = user.id
        
        for _ in range(num_samples):
            incident = generate_random_incident(user_id)
            db.session.add(incident)
        
        db.session.commit()
    
    print(f"{num_samples} sample incidents generated and saved to the database.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate sample incident data")
    parser.add_argument("--num_samples", type=int, default=1000, help="Number of sample incidents to generate")
    args = parser.parse_args()
    
    generate_sample_data(args.num_samples)
