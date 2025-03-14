"""
Utilidades para el manejo y análisis de incidentes.
"""
from models import Incident
from sqlalchemy import func, desc, extract
from database import db
from datetime import datetime
import logging

def get_incidents_for_map():
    """
    Obtiene todos los incidentes para mostrar en el mapa.
    Retorna solo la información necesaria para la visualización.
    """
    try:
        # Obtener estadísticas por estación
        station_stats = db.session.query(
            Incident.nearest_station,
            func.count(Incident.id).label('total')
        ).group_by(Incident.nearest_station)\
         .order_by(desc(func.count(Incident.id)))\
         .all()

        # Crear diccionario de conteo por estación
        station_counts = {stat.nearest_station: stat.total for stat in station_stats}

        # Obtener todos los incidentes
        incidents = Incident.query.all()

        return [{
            'id': incident.id,
            'incident_type': incident.incident_type,
            'description': incident.description,
            'latitude': incident.latitude,
            'longitude': incident.longitude,
            'timestamp': incident.timestamp.isoformat(),
            'nearest_station': incident.nearest_station,
            'station_total_incidents': station_counts.get(incident.nearest_station, 0)
        } for incident in incidents]
    except Exception as e:
        logging.error(f"Error in get_incidents_for_map: {str(e)}", exc_info=True)
        return []

def get_incident_statistics(date_from=None, date_to=None):
    """
    Obtiene estadísticas detalladas de incidentes.
    """
    try:
        logging.info("Iniciando obtención de estadísticas de incidentes")

        # Construir la consulta base con filtros de fecha
        base_query = Incident.query
        if date_from:
            base_query = base_query.filter(Incident.timestamp >= date_from)
        if date_to:
            base_query = base_query.filter(Incident.timestamp <= date_to)

        # Total de incidentes
        total_incidents = base_query.count()
        logging.info(f"Total de incidentes encontrados: {total_incidents}")

        # Estadísticas por estación
        station_stats = db.session.query(
            Incident.nearest_station,
            func.count(Incident.id).label('total')
        ).group_by(Incident.nearest_station)\
         .order_by(desc(func.count(Incident.id)))\
         .all()

        logging.info(f"Estadísticas por estación obtenidas: {len(station_stats)} estaciones")

        # Conteo por tipo de incidente
        incidents_by_type = db.session.query(
            Incident.incident_type,
            func.count(Incident.id).label('count')
        ).group_by(Incident.incident_type)\
         .order_by(desc(func.count(Incident.id)))\
         .all()

        # Análisis de hora más peligrosa
        hour_column = extract('hour', Incident.timestamp)
        hour_stats = db.session.query(
            hour_column.label('hour'),
            func.count(Incident.id).label('count')
        ).group_by(hour_column)\
         .order_by(desc(func.count(Incident.id)))\
         .first()

        # Procesar estadísticas detalladas por estación
        detailed_stats = {}
        for stat in station_stats:
            station_incidents = base_query.filter(
                Incident.nearest_station == stat.nearest_station
            )
            type_counts = {}
            for incident in ['Hurto', 'Acoso', 'Cosquilleo', 'Ataque', 
                           'Apertura de puertas', 'Hurto a mano armada', 'Sospechoso']:
                count = station_incidents.filter(
                    Incident.incident_type == incident
                ).count()
                type_counts[incident.lower().replace(' ', '_')] = count

            detailed_stats[stat.nearest_station] = {
                'total': stat.total,
                **type_counts
            }

        logging.info("Estadísticas procesadas exitosamente")

        return {
            'total_incidents': total_incidents,
            'most_affected_station': station_stats[0].nearest_station if station_stats else "No data",
            'most_dangerous_hour': f"{int(hour_stats.hour):02d}:00" if hour_stats else "No data",
            'most_common_type': incidents_by_type[0].incident_type if incidents_by_type else "No data",
            'incident_types': {
                incident.incident_type: incident.count 
                for incident in incidents_by_type
            },
            'top_stations': detailed_stats
        }

    except Exception as e:
        logging.error(f"Error in get_incident_statistics: {str(e)}", exc_info=True)
        return {
            'total_incidents': 0,
            'most_affected_station': "Error",
            'most_dangerous_hour': "Error",
            'most_common_type': "Error",
            'incident_types': {},
            'top_stations': {}
        }