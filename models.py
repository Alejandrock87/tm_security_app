
from database import db
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    incidents = db.relationship('Incident', backref='author', lazy='dynamic')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Incident(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    __table_args__ = (
        db.Index('idx_incident_timestamp', 'timestamp'),
        db.Index('idx_incident_station', 'nearest_station'),
        db.Index('idx_incident_type', 'incident_type'),
    )
    incident_type = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    nearest_station = db.Column(db.String(100), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'incident_type': self.incident_type,
            'description': self.description,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'timestamp': self.timestamp.isoformat(),
            'user_id': self.user_id,
            'nearest_station': self.nearest_station
        }
