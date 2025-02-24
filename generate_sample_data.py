import random
from datetime import datetime, timedelta
from app import app, db
from models import Incident, User
import math

def populate_real_incident_data():
    with app.app_context():
        # Asegurar que existe un usuario
        user = User.query.first()
        if not user:
            user = User(username="sample_user", email="sample@example.com")
            user.set_password("sample_password")
            db.session.add(user)
            db.session.commit()

        # Limpiar incidentes existentes
        print("Limpiando incidentes existentes...")
        Incident.query.delete()
        db.session.commit()

        # Datos de estaciones
        stations_data = {
            "Avenida Jiménez": {
                "coords": (4.598056, -74.074167),
                "peak_hours": [(6,9), (17,20)],
                "peak_days": [0,2,4],
                "incidents": {
                    "Hurto": 30, "Cosquilleo": 20, "Acoso": 10,
                    "Hurto a mano armada": 6, "Ataque": 4,
                    "Apertura de puertas": 2, "Sospechoso": 8
                }
            },
            "Universidades": {
                "coords": (4.634667, -74.065139),
                "peak_hours": [(7,10), (16,19)],
                "peak_days": [1,3],
                "incidents": {
                    "Hurto": 24, "Cosquilleo": 16, "Acoso": 8,
                    "Hurto a mano armada": 5, "Ataque": 3,
                    "Apertura de puertas": 1, "Sospechoso": 7
                }
            },
            "Portal Norte": {
                "coords": (4.754722, -74.045278),
                "peak_hours": [(6,9), (17,20)],
                "peak_days": [0,2,4],
                "incidents": {
                    "Hurto": 26, "Cosquilleo": 18, "Acoso": 9,
                    "Hurto a mano armada": 4, "Ataque": 5,
                    "Apertura de puertas": 2, "Sospechoso": 6
                }
            },
            "Banderas": {
                "coords": (4.631944, -74.135278),
                "peak_hours": [(6,9), (17,20)],
                "peak_days": [1,3],
                "incidents": {
                    "Hurto": 28, "Cosquilleo": 17, "Acoso": 7,
                    "Hurto a mano armada": 5, "Ataque": 4,
                    "Apertura de puertas": 2, "Sospechoso": 9
                }
            },
            "Calle 76": {
                "coords": (4.665278, -74.062778),
                "peak_hours": [(7,10), (16,19)],
                "peak_days": [0,4],
                "incidents": {
                    "Hurto": 22, "Cosquilleo": 14, "Acoso": 6,
                    "Hurto a mano armada": 3, "Ataque": 2,
                    "Apertura de puertas": 1, "Sospechoso": 5
                }
            },
            "Las Aguas": {
                "coords": (4.601389, -74.066944),
                "peak_hours": [(6,9), (17,20)],
                "peak_days": [2,4],
                "incidents": {
                    "Hurto": 25, "Cosquilleo": 19, "Acoso": 8,
                    "Hurto a mano armada": 4, "Ataque": 3,
                    "Apertura de puertas": 2, "Sospechoso": 7
                }
            },
            "Marly": {
                "coords": (4.627778, -74.066944),
                "peak_hours": [(7,10), (16,19)],
                "peak_days": [1,3],
                "incidents": {
                    "Hurto": 23, "Cosquilleo": 15, "Acoso": 7,
                    "Hurto a mano armada": 4, "Ataque": 2,
                    "Apertura de puertas": 1, "Sospechoso": 6
                }
            },
            "Calle 72": {
                "coords": (4.658333, -74.062500),
                "peak_hours": [(6,9), (17,20)],
                "peak_days": [0,4],
                "incidents": {
                    "Hurto": 27, "Cosquilleo": 17, "Acoso": 9,
                    "Hurto a mano armada": 4, "Ataque": 4,
                    "Apertura de puertas": 2, "Sospechoso": 6
                }
            },
            "Calle 26": {
                "coords": (4.616667, -74.071944),
                "peak_hours": [(7,10), (16,19)],
                "peak_days": [2,4],
                "incidents": {
                    "Hurto": 21, "Cosquilleo": 13, "Acoso": 6,
                    "Hurto a mano armada": 3, "Ataque": 2,
                    "Apertura de puertas": 1, "Sospechoso": 4
                }
            },
            "Portal Tunal": {
                "coords": (4.575833, -74.130556),
                "peak_hours": [(6,9), (17,20)],
                "peak_days": [0,2,4],
                "incidents": {
                    "Hurto": 28, "Cosquilleo": 18, "Acoso": 10,
                    "Hurto a mano armada": 5, "Ataque": 4,
                    "Apertura de puertas": 2, "Sospechoso": 8
                }
            }
        }

        # Generar reportes para enero 2025
        start_date = datetime(2025, 1, 1)
        end_date = datetime(2025, 1, 25)

        print("Generando 1000 incidentes distribuidos...")
        total_incidents = 0

        for station_name, station_info in stations_data.items():
            lat, lon = station_info["coords"]

            for incident_type, count in station_info["incidents"].items():
                # Duplicar el número de incidentes por tipo
                adjusted_count = count * 2
                for _ in range(adjusted_count):
                    if total_incidents >= 1000:
                        break

                    # Seleccionar día y hora
                    current_date = start_date + timedelta(days=random.randint(0, 24))

                    # Mayor probabilidad en días pico
                    while current_date.weekday() not in station_info["peak_days"]:
                        current_date = start_date + timedelta(days=random.randint(0, 24))

                    # Seleccionar rango de hora pico
                    is_peak = random.random() < 0.7  # 70% probabilidad hora pico
                    if is_peak:
                        peak_period = random.choice(station_info["peak_hours"])
                        hour = random.randint(peak_period[0], peak_period[1]-1)
                    else:
                        hour = random.randint(5, 22)  # Resto del día

                    minute = random.randint(0, 59)
                    second = random.randint(0, 59)

                    timestamp = current_date.replace(hour=hour, minute=minute, second=second)

                    # Variación en coordenadas
                    incident_lat = lat + random.uniform(-0.0002, 0.0002)
                    incident_lon = lon + random.uniform(-0.0002, 0.0002)

                    description = f"{incident_type} reportado en la estación {station_name}"
                    if incident_type == "Hurto":
                        description += " - Pérdida de pertenencias personales"
                    elif incident_type == "Cosquilleo":
                        description += " - Intento de hurto en aglomeración"
                    elif incident_type == "Acoso":
                        description += " - Acoso verbal/físico reportado"

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
                    total_incidents += 1

                if total_incidents >= 1000:
                    break

            if total_incidents >= 1000:
                break

        db.session.commit()
        print(f"Se han generado {total_incidents} incidentes distribuidos entre las estaciones.")

if __name__ == "__main__":
    populate_real_incident_data()