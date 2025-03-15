"""
Utilidades para el manejo y análisis de incidentes.
"""
from models import Incident
from sqlalchemy import func, desc, extract, text
from database import db
from datetime import datetime, timedelta
import logging
import pytz

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
    Obtiene estadísticas detalladas de incidentes con filtros de fecha opcionales.
    """
    try:
        logging.info("Iniciando obtención de estadísticas de incidentes")
        logging.info(f"Filtros de fecha recibidos - desde: {date_from}, hasta: {date_to}")

        # Construir consulta base para filtrar por fecha en zona horaria de Bogotá
        base_query = text("""
            WITH filtered_incidents AS (
                SELECT *
                FROM incident
                WHERE TRUE
                    AND CASE 
                        WHEN :date_from IS NOT NULL 
                        THEN DATE(timestamp AT TIME ZONE 'America/Bogota') >= :date_from::date
                        ELSE TRUE
                    END
                    AND CASE 
                        WHEN :date_to IS NOT NULL 
                        THEN DATE(timestamp AT TIME ZONE 'America/Bogota') <= :date_to::date
                        ELSE TRUE
                    END
            )
            SELECT 
                COUNT(*) as total_incidents,
                (
                    SELECT nearest_station 
                    FROM filtered_incidents 
                    GROUP BY nearest_station 
                    ORDER BY COUNT(*) DESC LIMIT 1
                ) as most_affected_station,
                (
                    SELECT incident_type 
                    FROM filtered_incidents 
                    GROUP BY incident_type 
                    ORDER BY COUNT(*) DESC LIMIT 1
                ) as most_common_type,
                (
                    SELECT EXTRACT(HOUR FROM timestamp AT TIME ZONE 'America/Bogota')::integer
                    FROM filtered_incidents 
                    GROUP BY EXTRACT(HOUR FROM timestamp AT TIME ZONE 'America/Bogota')
                    ORDER BY COUNT(*) DESC LIMIT 1
                ) as most_dangerous_hour,
                jsonb_object_agg(
                    incident_type, 
                    incident_count
                ) as incident_types,
                jsonb_object_agg(
                    nearest_station,
                    station_data
                ) as station_stats
            FROM filtered_incidents
            CROSS JOIN LATERAL (
                SELECT 
                    COUNT(*) as incident_count
                FROM filtered_incidents f2
                WHERE f2.incident_type = filtered_incidents.incident_type
                GROUP BY f2.incident_type
            ) incident_counts
            CROSS JOIN LATERAL (
                SELECT 
                    jsonb_build_object(
                        'total', COUNT(*)
                    ) as station_data
                FROM filtered_incidents f3
                WHERE f3.nearest_station = filtered_incidents.nearest_station
                GROUP BY f3.nearest_station
            ) station_counts
            GROUP BY incident_type, nearest_station;
        """)

        result = db.session.execute(
            base_query,
            {'date_from': date_from, 'date_to': date_to}
        ).fetchone()

        if not result:
            logging.warning("No se encontraron incidentes para los filtros especificados")
            return {
                'total_incidents': 0,
                'most_affected_station': "No data",
                'most_dangerous_hour': "No data",
                'most_common_type': "No data",
                'incident_types': {},
                'top_stations': {}
            }

        response = {
            'total_incidents': result.total_incidents,
            'most_affected_station': result.most_affected_station or "No data",
            'most_dangerous_hour': f"{result.most_dangerous_hour:02d}:00" if result.most_dangerous_hour is not None else "No data",
            'most_common_type': result.most_common_type or "No data",
            'incident_types': result.incident_types or {},
            'top_stations': result.station_stats or {}
        }

        logging.info("Estadísticas procesadas exitosamente")
        logging.info(f"Retornando resultado: {response}")
        return response

    except Exception as e:
        logging.error(f"Error en get_incident_statistics: {str(e)}", exc_info=True)
        return {
            'total_incidents': 0,
            'most_affected_station': "Error",
            'most_dangerous_hour': "Error",
            'most_common_type': "Error",
            'incident_types': {},
            'top_stations': {}
        }