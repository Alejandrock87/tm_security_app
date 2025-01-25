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
import datetime
from models import Incident, User, db
from app import app
import argparse
from random import uniform

def populate_real_incident_data():
    with app.app_context():
        # Ensure we have at least one user
        user = User.query.first()
        if not user:
            user = User(username="sample_user", email="sample@example.com")
            user.set_password("sample_password")
            db.session.add(user)
            db.session.commit()

        # Clear existing incidents
        print("Clearing existing incidents...")
        Incident.query.delete()
        db.session.commit()

        # Real station data with coordenadas
        stations_data = {
            "Avenida Jiménez": {
                "coords": (4.598056, -74.074167),
                "incidents": {
                    "Hurto": 150,
                    "Cosquilleo": 100,
                    "Acoso": 50,
                    "Hurto a mano armada": 30,
                    "Ataque": 20,
                    "Apertura de puertas": 10,
                    "Sospechoso": 40
                },
                "peak_hours": [(6,9), (17,20)],
                "peak_days": [0,2,4]  # Lunes, Miércoles, Viernes
            },
            "Universidades": {
                "coords": (4.634667, -74.065139),
                "incidents": {
                    "Hurto": 120,
                    "Cosquilleo": 80,
                    "Acoso": 40,
                    "Hurto a mano armada": 25,
                    "Ataque": 15,
                    "Apertura de puertas": 5,
                    "Sospechoso": 35
                },
                "peak_hours": [(7,10), (16,19)],
                "peak_days": [1,3]  # Martes, Jueves
            }
        }

        # Generar reportes para enero 2025
        start_date = datetime.datetime(2025, 1, 1)
        end_date = datetime.datetime(2025, 1, 25)  # Hasta hoy
        
        print("Generating incidents...")
        for station_name, station_info in stations_data.items():
            lat, lon = station_info["coords"]
            
            for incident_type, total_count in station_info["incidents"].items():
                # Distribuir los incidentes a lo largo del mes
                incidents_per_day = total_count // 25  # Distribuir en 25 días
                remaining = total_count % 25
                
                current_date = start_date
                while current_date <= end_date:
                    day_count = incidents_per_day + (1 if remaining > 0 else 0)
                    remaining -= 1 if remaining > 0 else 0
                    
                    for _ in range(day_count):
                        # Generar hora con preferencia por horas pico
                        is_peak = random.random() < 0.7  # 70% probabilidad hora pico
                        if is_peak:
                            peak_period = random.choice(station_info["peak_hours"])
                            hour = random.randint(peak_period[0], peak_period[1]-1)
                        else:
                            hour = random.randint(0, 23)
                        
                        # Variación en coordenadas
                        incident_lat = lat + random.uniform(-0.0002, 0.0002)
                        incident_lon = lon + random.uniform(-0.0002, 0.0002)
                        
                        timestamp = current_date.replace(hour=hour, 
                                                      minute=random.randint(0, 59))
                        
                        incident = Incident(
                            incident_type=incident_type,
                            description=f"Incidente reportado en estación {station_name}",
                            latitude=incident_lat,
                            longitude=incident_lon,
                            timestamp=timestamp,
                            user_id=user.id,
                            nearest_station=station_name
                        )
                        db.session.add(incident)
                    
                    current_date += datetime.timedelta(days=1)
        
        db.session.commit()
        print("Real incident data has been populated successfully.")

        # Clear existing incidents
        Incident.query.delete()
        db.session.commit()
        
        # Coordenadas de las estaciones
        station_coords = {
            "Avenida Jiménez": (4.598056, -74.074167),
            "Universidades": (4.634667, -74.065139),
            "Portal Norte": (4.754722, -74.045556),
            "Banderas": (4.616389, -74.135833)
        }

        # Data de incidentes por estación
        station_data = {
            "Avenida Jiménez": {
                "peak_hours": [(6,9), (17,20)],
                "peak_days": [0,2,4],  # Lunes, Miércoles, Viernes
                "incidents": {
                    "Hurto": 150,
                    "Cosquilleo": 100,
                    "Acoso": 50,
                    "Hurto a mano armada": 30,
                    "Ataque": 20,
                    "Apertura de puertas": 10,
                    "Sospechoso": 40
                }
            },
            "Universidades": {
                "peak_hours": [(7,10), (16,19)],
                "peak_days": [1,3],  # Martes, Jueves
                "incidents": {
                    "Hurto": 120,
                    "Cosquilleo": 80,
                    "Acoso": 40,
                    "Hurto a mano armada": 25,
                    "Ataque": 15,
                    "Apertura de puertas": 5,
                    "Sospechoso": 35
                }
            },
            "Portal Norte": {
                "peak_hours": [(6,9), (17,20)],
                "peak_days": [0,2,4],  # Lunes, Miércoles, Viernes
                "incidents": {
                    "Hurto": 130,
                    "Cosquilleo": 90,
                    "Acoso": 45,
                    "Hurto a mano armada": 20,
                    "Ataque": 25,
                    "Apertura de puertas": 8,
                    "Sospechoso": 30
                }
            }
        }

        # Generar incidentes para los últimos 30 días
        start_date = datetime.datetime.now() - datetime.timedelta(days=30)

        for station, data in station_data.items():
            lat, lon = station_coords[station]
            
            for incident_type, count in data["incidents"].items():
                for _ in range(count):
                    # Generar hora aleatoria con preferencia por horas pico
                    is_peak = uniform(0, 1) < 0.7  # 70% de probabilidad de hora pico
                    if is_peak:
                        peak_period = data["peak_hours"][int(uniform(0, len(data["peak_hours"])))]
                        hour = int(uniform(peak_period[0], peak_period[1]))
                    else:
                        hour = int(uniform(0, 24))
                    
                    # Generar día aleatorio con preferencia por días pico
                    is_peak_day = uniform(0, 1) < 0.7  # 70% de probabilidad de día pico
                    if is_peak_day and data["peak_days"]:
                        day = data["peak_days"][int(uniform(0, len(data["peak_days"])))]
                    else:
                        day = int(uniform(0, 7))
                    
                    random_days = int(uniform(0, 30))
                    timestamp = start_date + datetime.timedelta(days=random_days)
                    timestamp = timestamp.replace(hour=hour)
                    
                    # Añadir variación aleatoria a las coordenadas
                    incident_lat = lat + uniform(-0.0002, 0.0002)
                    incident_lon = lon + uniform(-0.0002, 0.0002)
                    
                    incident = Incident(
                        incident_type=incident_type,
                        description=f"Incidente reportado en {station}",
                        latitude=incident_lat,
                        longitude=incident_lon,
                        timestamp=timestamp,
                        user_id=user.id,
                        nearest_station=station
                    )
                    db.session.add(incident)

        db.session.commit()
        print("Real incident data has been populated successfully.")
        
        station_data = {
            "Avenida Jiménez": {"lat": 4.598056, "lon": -74.074167},
            "Universidades": {"lat": 4.634667, "lon": -74.065139},
            "Portal Norte": {"lat": 4.754722, "lon": -74.045556},
            "Banderas": {"lat": 4.616389, "lon": -74.135833},
            "Calle 76": {"lat": 4.664722, "lon": -74.060556},
            "Las Aguas": {"lat": 4.601944, "lon": -74.066944},
            "Marly": {"lat": 4.627778, "lon": -74.066944},
            "Calle 72": {"lat": 4.658333, "lon": -74.060556},
            "Calle 26": {"lat": 4.616667, "lon": -74.071944},
            "Portal Tunal": {"lat": 4.576389, "lon": -74.130833}
        }

        incident_counts = {
            "Avenida Jiménez": {"Hurto": 150, "Cosquilleo": 100, "Acoso": 50, "Hurto a mano armada": 30, "Ataque": 20, "Apertura de puertas": 10, "Sospechoso": 40},
            "Universidades": {"Hurto": 120, "Cosquilleo": 80, "Acoso": 40, "Hurto a mano armada": 25, "Ataque": 15, "Apertura de puertas": 5, "Sospechoso": 35},
            "Portal Norte": {"Hurto": 130, "Cosquilleo": 90, "Acoso": 45, "Hurto a mano armada": 20, "Ataque": 25, "Apertura de puertas": 8, "Sospechoso": 30},
            "Banderas": {"Hurto": 140, "Cosquilleo": 85, "Acoso": 35, "Hurto a mano armada": 25, "Ataque": 20, "Apertura de puertas": 12, "Sospechoso": 45},
            "Calle 76": {"Hurto": 110, "Cosquilleo": 70, "Acoso": 30, "Hurto a mano armada": 15, "Ataque": 10, "Apertura de puertas": 5, "Sospechoso": 25},
            "Las Aguas": {"Hurto": 125, "Cosquilleo": 95, "Acoso": 40, "Hurto a mano armada": 20, "Ataque": 15, "Apertura de puertas": 10, "Sospechoso": 35},
            "Marly": {"Hurto": 115, "Cosquilleo": 75, "Acoso": 35, "Hurto a mano armada": 18, "Ataque": 12, "Apertura de puertas": 7, "Sospechoso": 28},
            "Calle 72": {"Hurto": 135, "Cosquilleo": 85, "Acoso": 45, "Hurto a mano armada": 22, "Ataque": 18, "Apertura de puertas": 9, "Sospechoso": 32},
            "Calle 26": {"Hurto": 105, "Cosquilleo": 65, "Acoso": 30, "Hurto a mano armada": 15, "Ataque": 10, "Apertura de puertas": 5, "Sospechoso": 20},
            "Portal Tunal": {"Hurto": 140, "Cosquilleo": 90, "Acoso": 50, "Hurto a mano armada": 25, "Ataque": 20, "Apertura de puertas": 10, "Sospechoso": 40}
        }

        # Generate incidents for the last 30 days
        start_date = datetime.datetime.now() - datetime.timedelta(days=30)
        
        for station, incidents in incident_counts.items():
            for incident_type, count in incidents.items():
                for _ in range(count):
                    # Random time within peak hours
                    hour = 7 if uniform(0, 1) < 0.5 else 17  # Peak hours
                    minute = int(uniform(0, 59))
                    
                    # Random day within last 30 days
                    random_days = int(uniform(0, 30))
                    timestamp = start_date + datetime.timedelta(days=random_days, hours=hour, minutes=minute)
                    
                    # Add some random variation to coordinates
                    lat = station_data[station]["lat"] + uniform(-0.0001, 0.0001)
                    lon = station_data[station]["lon"] + uniform(-0.0001, 0.0001)
                    
                    incident = Incident(
                        incident_type=incident_type,
                        description=f"Incidente reportado en {station}",
                        latitude=lat,
                        longitude=lon,
                        timestamp=timestamp,
                        user_id=user.id,
                        nearest_station=station
                    )
                    db.session.add(incident)
        
        db.session.commit()
        print("Real incident data has been populated successfully.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate sample incident data")
    parser.add_argument("--populate-real", action="store_true", help="Populate with real incident data")
    args = parser.parse_args()
    
    if args.populate_real:
        populate_real_incident_data()
    else:
        print("Please use --populate-real to populate the database with real incident data")
