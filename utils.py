from models import Incident
from sqlalchemy import func
from app import db

def get_incidents_for_map():
    incidents = Incident.query.all()
    return [{
        'id': incident.id,
        'incident_type': incident.incident_type,
        'latitude': incident.latitude,
        'longitude': incident.longitude,
        'timestamp': incident.timestamp.isoformat()
    } for incident in incidents]

def get_incident_statistics():
    total_incidents = Incident.query.count()
    incidents_by_day = db.session.query(
        func.date(Incident.timestamp).label('date'),
        func.count(Incident.id).label('count')
    ).group_by(func.date(Incident.timestamp)).all()

    incidents_by_type = db.session.query(
        Incident.incident_type,
        func.count(Incident.id).label('count')
    ).group_by(Incident.incident_type).all()

    return {
        'total_incidents': total_incidents,
        'incidents_by_day': [{'date': str(day.date), 'count': day.count} for day in incidents_by_day],
        'incidents_by_type': {incident_type: count for incident_type, count in incidents_by_type}
    }
