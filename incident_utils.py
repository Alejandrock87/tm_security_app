"""
Utilidades para el manejo y análisis de incidentes.
"""
from models import Incident
from sqlalchemy import func, desc, case, extract
from database import db
from datetime import datetime

def get_incidents_for_map():
    """
    Obtiene todos los incidentes para mostrar en el mapa.
    Retorna solo la información necesaria para la visualización.
    """
    incidents = Incident.query.all()
    return [{
        'id': incident.id,
        'incident_type': incident.incident_type,
        'description': incident.description,
        'latitude': incident.latitude,
        'longitude': incident.longitude,
        'timestamp': incident.timestamp.isoformat(),
        'nearest_station': incident.nearest_station
    } for incident in incidents]

def get_incident_statistics(date_from=None, date_to=None):
    """
    Obtiene estadísticas detalladas de incidentes por estación.
    Incluye conteos por tipo de incidente y métricas generales.
    """
    try:
        # Construir la consulta base con filtros de fecha
        base_query = Incident.query
        if date_from:
            base_query = base_query.filter(Incident.timestamp >= date_from)
        if date_to:
            base_query = base_query.filter(Incident.timestamp <= date_to)

        # Total de incidentes
        total_incidents = base_query.count()

        # Estadísticas por estación usando expresiones case más simples
        station_stats = db.session.query(
            Incident.nearest_station,
            func.count(Incident.id).label('total')
        ).group_by(Incident.nearest_station)\
         .order_by(desc(func.count(Incident.id)))\
         .all()

        # Conteo por tipo de incidente
        incidents_by_type = db.session.query(
            Incident.incident_type,
            func.count(Incident.id).label('count')
        ).group_by(Incident.incident_type)\
         .order_by(desc('count'))\
         .all()

        # Análisis de hora más peligrosa
        dangerous_hour = db.session.query(
            extract('hour', Incident.timestamp).label('hour'),
            func.count(Incident.id).label('count')
        ).group_by('hour')\
         .order_by(desc('count'))\
         .first()

        # Obtener estadísticas detalladas por tipo de incidente para cada estación
        detailed_stats = {}
        for stat in station_stats:
            station_incidents = base_query.filter(Incident.nearest_station == stat.nearest_station)
            incident_counts = {}
            for incident_type in ['Hurto', 'Acoso', 'Cosquilleo', 'Ataque', 
                                'Apertura de puertas', 'Hurto a mano armada', 'Sospechoso']:
                count = station_incidents.filter(Incident.incident_type == incident_type).count()
                incident_counts[incident_type.lower().replace(' ', '_')] = count

            detailed_stats[stat.nearest_station] = {
                'total': stat.total,
                **incident_counts
            }

        # Formatear resultados
        most_dangerous_hour = f"{int(dangerous_hour.hour):02d}:00" if dangerous_hour else "No data"
        most_common_type = incidents_by_type[0].incident_type if incidents_by_type else "No data"
        most_affected_station = station_stats[0].nearest_station if station_stats else "No data"

        return {
            'total_incidents': total_incidents,
            'most_affected_station': most_affected_station,
            'most_dangerous_hour': most_dangerous_hour,
            'most_common_type': most_common_type,
            'incident_types': {
                incident.incident_type: incident.count 
                for incident in incidents_by_type
            },
            'top_stations': {
                station: stats
                for station, stats in detailed_stats.items()
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
    """
    Obtiene estadísticas detalladas por estación.
    Es un wrapper de get_incident_statistics para mantener compatibilidad.
    """
    return get_incident_statistics()