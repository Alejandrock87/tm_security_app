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
    """
    Obtiene estadísticas detalladas de incidentes por estación.
    """
    try:
        query = Incident.query

        if date_from:
            query = query.filter(Incident.timestamp >= date_from)
        if date_to:
            query = query.filter(Incident.timestamp <= date_to)

        # Total de incidentes
        total_incidents = query.count()

        # Incidentes por tipo y estación usando subconsultas simples
        station_stats = db.session.query(
            Incident.nearest_station,
            func.count(Incident.id).label('total'),
            func.sum(case([(Incident.incident_type == 'Hurto', 1)], else_=0)).label('hurtos'),
            func.sum(case([(Incident.incident_type == 'Acoso', 1)], else_=0)).label('acosos'),
            func.sum(case([(Incident.incident_type == 'Cosquilleo', 1)], else_=0)).label('cosquilleos'),
            func.sum(case([(Incident.incident_type == 'Ataque', 1)], else_=0)).label('ataques'),
            func.sum(case([(Incident.incident_type == 'Apertura de puertas', 1)], else_=0)).label('aperturas'),
            func.sum(case([(Incident.incident_type == 'Hurto a mano armada', 1)], else_=0)).label('hurtos_armados'),
            func.sum(case([(Incident.incident_type == 'Sospechoso', 1)], else_=0)).label('sospechosos')
        ).group_by(Incident.nearest_station)\
        .order_by(desc('total')).all()

        # Incidentes por tipo
        incidents_by_type = db.session.query(
            Incident.incident_type,
            func.count(Incident.id).label('count')
        ).group_by(Incident.incident_type)\
        .order_by(desc('count')).all()

        # Hora más peligrosa
        dangerous_hours = db.session.query(
            func.extract('hour', Incident.timestamp).label('hour'),
            func.count(Incident.id).label('count')
        ).group_by('hour')\
        .order_by(desc('count')).first()

        most_dangerous_hour = f"{int(dangerous_hours[0]):02d}:00" if dangerous_hours else "No data"
        most_common_type = incidents_by_type[0][0] if incidents_by_type else "No data"
        most_affected_station = station_stats[0][0] if station_stats else "No data"

        return {
            'total_incidents': total_incidents,
            'most_affected_station': most_affected_station,
            'most_dangerous_hour': most_dangerous_hour,
            'most_common_type': most_common_type,
            'incident_types': {incident_type: count for incident_type, count in incidents_by_type},
            'top_stations': {
                stat.nearest_station: {
                    'total': stat.total,
                    'hurtos': stat.hurtos or 0,
                    'acosos': stat.acosos or 0,
                    'cosquilleos': stat.cosquilleos or 0,
                    'ataques': stat.ataques or 0,
                    'aperturas': stat.aperturas or 0,
                    'hurtos_armados': stat.hurtos_armados or 0,
                    'sospechosos': stat.sospechosos or 0
                } for stat in station_stats[:10]
            }
        }
    except Exception as e:
        print(f"Error in get_incident_statistics: {str(e)}")
        return {
            'total_incidents': 0,
            'most_affected_station': "Error",
            'most_dangerous_hour': "Error",
            'most_common_type': "Error",
            'incident_types': {},
            'top_stations': {}
        }

def get_station_statistics():
    """Obtiene estadísticas detalladas por estación"""
    return get_incident_statistics()