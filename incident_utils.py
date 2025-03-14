from models import Incident
from sqlalchemy import func, desc, case
from database import db
from datetime import datetime

def get_incidents_for_map():
    incidents = Incident.query.all()
    return [{
        'id': incident.id,
        'incident_type': incident.incident_type,
        'latitude': incident.latitude,
        'longitude': incident.longitude,
        'timestamp': incident.timestamp.isoformat(),
        'nearest_station': incident.nearest_station
    } for incident in incidents]

def get_incident_statistics(date_from=None, date_to=None):
    query = Incident.query

    if date_from:
        query = query.filter(Incident.timestamp >= date_from)
    if date_to:
        query = query.filter(Incident.timestamp <= date_to)

    # Total de incidentes
    total_incidents = query.count()

    # Incidentes por tipo y estación usando subconsultas
    station_stats = db.session.query(
        Incident.nearest_station,
        func.count(Incident.id).label('total'),
        func.count(func.nullif(Incident.incident_type != 'Hurto', True)).label('hurtos'),
        func.count(func.nullif(Incident.incident_type != 'Acoso', True)).label('acosos'),
        func.count(func.nullif(Incident.incident_type != 'Cosquilleo', True)).label('cosquilleos'),
        func.count(func.nullif(Incident.incident_type != 'Ataque', True)).label('ataques'),
        func.count(func.nullif(Incident.incident_type != 'Apertura de puertas', True)).label('aperturas'),
        func.count(func.nullif(Incident.incident_type != 'Hurto a mano armada', True)).label('hurtos_armados'),
        func.count(func.nullif(Incident.incident_type != 'Sospechoso', True)).label('sospechosos')
    ).group_by(Incident.nearest_station)\
    .order_by(desc('total')).all()

    # Incidentes por tipo
    incidents_by_type = db.session.query(
        Incident.incident_type,
        func.count(Incident.id).label('count')
    ).group_by(Incident.incident_type).all()

    # Hora más peligrosa
    dangerous_hours = db.session.query(
        func.extract('hour', Incident.timestamp).label('hour'),
        func.count(Incident.id).label('count')
    ).group_by('hour')\
    .order_by(desc('count')).first()

    most_dangerous_hour = f"{int(dangerous_hours[0]):02d}:00" if dangerous_hours else "No data"

    # Tipo más común
    most_common_type = max(incidents_by_type, key=lambda x: x[1])[0] if incidents_by_type else "No data"

    # Estación más afectada
    most_affected_station = station_stats[0][0] if station_stats else "No data"

    return {
        'total_incidents': total_incidents,
        'most_affected_station': most_affected_station,
        'most_dangerous_hour': most_dangerous_hour,
        'most_common_type': most_common_type,
        'incident_types': {incident_type: count for incident_type, count in incidents_by_type},
        'top_stations': {
            stat[0]: {
                'total': stat[1],
                'hurtos': stat[2],
                'acosos': stat[3],
                'cosquilleos': stat[4],
                'ataques': stat[5],
                'aperturas': stat[6],
                'hurtos_armados': stat[7],
                'sospechosos': stat[8]
            } for stat in station_stats[:10]
        }
    }

def get_station_statistics():
    """Obtiene estadísticas detalladas por estación"""
    return get_incident_statistics()