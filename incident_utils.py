"""
Utilidades para el manejo y análisis de incidentes.
"""
from models import Incident
from sqlalchemy import func, desc, extract, text
from database import db
from datetime import datetime
import logging
import pytz

def get_incidents_for_map():
    """
    Obtiene todos los incidentes para mostrar en el mapa.
    Retorna solo la información necesaria para la visualización.
    """
    try:
        # Obtener estadísticas por estación usando la misma lógica que get_incident_statistics
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

        # Procesar cada incidente incluyendo el total de su estación
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
    Obtiene estadísticas detalladas de incidentes con filtros de fecha opcionales.
    Los filtros de fecha se interpretan en la zona horaria local del usuario.
    """
    try:
        logging.info("Iniciando obtención de estadísticas de incidentes")
        logging.info(f"Filtros de fecha recibidos - desde: {date_from}, hasta: {date_to}")

        # Construir la consulta base
        base_query = Incident.query

        # Aplicar filtros de fecha usando la zona horaria local
        if date_from:
            # Construir y loggear la expresión SQL para el filtro de fecha inicial
            date_filter = text("DATE(timestamp AT TIME ZONE 'America/Bogota') >= :date_from")
            logging.info(f"Aplicando filtro de fecha inicial: {date_filter}")
            base_query = base_query.filter(date_filter, date_from=date_from)

        if date_to:
            # Construir y loggear la expresión SQL para el filtro de fecha final
            date_filter = text("DATE(timestamp AT TIME ZONE 'America/Bogota') <= :date_to")
            logging.info(f"Aplicando filtro de fecha final: {date_filter}")
            base_query = base_query.filter(date_filter, date_to=date_to)

        # Total de incidentes
        total_incidents = base_query.count()
        logging.info(f"Total de incidentes encontrados: {total_incidents}")

        # Estadísticas por estación
        station_stats = db.session.query(
            Incident.nearest_station,
            func.count(Incident.id).label('total')
        ).filter(
            *base_query._where_criteria
        ).group_by(Incident.nearest_station)\
         .order_by(desc(func.count(Incident.id)))\
         .all()

        # Conteo por tipo de incidente
        incidents_by_type = db.session.query(
            Incident.incident_type,
            func.count(Incident.id).label('count')
        ).filter(
            *base_query._where_criteria
        ).group_by(Incident.incident_type)\
         .order_by(desc(func.count(Incident.id)))\
         .all()

        # Análisis de hora más peligrosa usando la hora local
        hour_stats = db.session.query(
            extract('hour', text("timestamp AT TIME ZONE 'America/Bogota'")).label('hour'),
            func.count(Incident.id).label('count')
        ).filter(
            *base_query._where_criteria
        ).group_by('hour')\
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
        result = {
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
        logging.info(f"Retornando resultado: {result}")
        return result

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