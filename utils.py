from models import Incident
from sqlalchemy import func

def get_incidents_for_map():
    incidents = Incident.query.all()
    return [{
        'id': incident.id,
        'title': incident.title,
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

    return {
        'total_incidents': total_incidents,
        'incidents_by_day': [{'date': str(day.date), 'count': day.count} for day in incidents_by_day]
    }
