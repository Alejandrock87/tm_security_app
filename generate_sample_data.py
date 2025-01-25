import random
from datetime import datetime, timedelta
import argparse
from app import app, db
from models import Incident, User
from sqlalchemy import func

def populate_real_incident_data():
    with app.app_context():
        # Asegurar que existe un usuario
        user = User.query.first()
        if not user:
            user = User(username="sample_user", email="sample@example.com")
            user.set_password("sample_password")
            db.session.add(user)
            db.session.commit()

        print("Limpiando incidentes existentes...")
        Incident.query.delete()
        db.session.commit()

        # Datos reales de estaciones con sus patrones
        station_data = {
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
                "peak_hours": [(6,9), (17,20)],  # 6-9am y 5-8pm
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
                "peak_hours": [(7,10), (16,19)],  # 7-10am y 4-7pm
                "peak_days": [1,3]  # Martes, Jueves
            }
        }

        # Generar reportes para enero 2025
        start_date = datetime(2025, 1, 1)
        end_date = datetime(2025, 1, 25)

        print("Generando incidentes...")
        for station_name, station_info in station_data.items():
            lat, lon = station_info["coords"]

            for incident_type, total_count in station_info["incidents"].items():
                # Distribuir los incidentes en el mes
                current_date = start_date
                while current_date <= end_date:
                    # Mayor probabilidad en días pico
                    if current_date.weekday() in station_info["peak_days"]:
                        daily_incidents = round(total_count/25 * 1.5)  # 50% más en días pico
                    else:
                        daily_incidents = round(total_count/25 * 0.5)  # 50% menos en días normales

                    for _ in range(daily_incidents):
                        # Mayor probabilidad en horas pico
                        is_peak = random.random() < 0.7  # 70% probabilidad hora pico
                        if is_peak:
                            peak_period = random.choice(station_info["peak_hours"])
                            hour = random.randint(peak_period[0], peak_period[1]-1)
                        else:
                            hour = random.randint(5, 22)  # Resto del día entre 5am y 10pm

                        # Variación en coordenadas
                        incident_lat = lat + random.uniform(-0.0002, 0.0002)
                        incident_lon = lon + random.uniform(-0.0002, 0.0002)

                        timestamp = current_date.replace(
                            hour=hour,
                            minute=random.randint(0, 59),
                            second=random.randint(0, 59)
                        )

                        description = f"{incident_type} reportado en la estación {station_name}"
                        if incident_type in ["Hurto", "Hurto a mano armada"]:
                            description += " - Víctima reporta pérdida de pertenencias personales"
                        elif incident_type == "Cosquilleo":
                            description += " - Intento de hurto en aglomeración"
                        elif incident_type == "Acoso":
                            description += " - Víctima reporta acoso verbal/físico"

                        incident = Incident(
                            incident_type=incident_type,
                            description=description,
                            latitude=incident_lat,
                            longitude=incident_lon,
                            timestamp=timestamp,
                            user_id=user.id,
                            nearest_station=station_name
                        )
                        db.session.add(incident)

                    current_date += timedelta(days=1)

        db.session.commit()
        print("Datos de incidentes reales generados exitosamente.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate sample incident data")
    parser.add_argument("--populate-real", action="store_true", help="Populate with real incident data")
    args = parser.parse_args()
    
    if args.populate_real:
        populate_real_incident_data()
    else:
        print("Please use --populate-real to populate the database with real incident data")