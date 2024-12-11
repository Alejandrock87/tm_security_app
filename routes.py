from flask import render_template, flash, redirect, url_for, request, jsonify
from flask_login import login_user, logout_user, current_user, login_required
from urllib.parse import urlparse
from forms import LoginForm, RegistrationForm, IncidentReportForm
from incident_utils import get_incidents_for_map, get_incident_statistics
from utils import send_notification, send_push_notification
from datetime import datetime, timedelta
from ml_models import predict_incident_probability, get_incident_trends, get_model_insights
import logging
from models import User, Incident
from database import db
from transmilenio_api import get_all_stations, get_route_information
from sqlalchemy import func

def init_routes(app):
    @app.route('/')
    @app.route('/index')
    def index():
        if not current_user.is_authenticated:
            return render_template('index.html', title='Inicio')
        return render_template('home.html', title='Inicio')

    @app.route('/login', methods=['GET', 'POST'])
    def login():
        if current_user.is_authenticated:
            return redirect(url_for('index'))
        form = LoginForm()
        if form.validate_on_submit():
            user = User.query.filter_by(username=form.username.data).first()
            if user is None or not user.check_password(form.password.data):
                flash('Nombre de usuario o contraseña inválidos')
                return redirect(url_for('login'))
            login_user(user, remember=form.remember_me.data)
            next_page = request.args.get('next')
            if not next_page or urlparse(next_page).netloc != '':
                next_page = url_for('index')
            flash('¡Inicio de sesión exitoso!')
            return redirect(next_page)
        return render_template('login.html', title='Iniciar sesión', form=form)

    @app.route('/logout')
    def logout():
        logout_user()
        flash('Has cerrado sesión exitosamente.')
        return redirect(url_for('index'))

    @app.route('/register', methods=['GET', 'POST'])
    def register():
        if current_user.is_authenticated:
            return redirect(url_for('dashboard'))
        form = RegistrationForm()
        if form.validate_on_submit():
            user = User(username=form.username.data, email=form.email.data)
            user.set_password(form.password.data)
            db.session.add(user)
            db.session.commit()
            flash('¡Felicidades, ahora estás registrado!')
            return redirect(url_for('login'))
        return render_template('register.html', title='Registro', form=form)

    @app.route('/report_incident', methods=['GET', 'POST'])
    @login_required
    def report_incident():
        form = IncidentReportForm()
        # Load all stations from GeoJSON file
        import json
        with open('static/Estaciones_Troncales_de_TRANSMILENIO.geojson', 'r', encoding='utf-8') as f:
            geojson_data = json.load(f)
            stations = [(feature['properties']['nombre_estacion'], 
                        f"{feature['properties']['nombre_estacion']} - {feature['properties'].get('troncal_estacion', 'N/A')}")
                       for feature in geojson_data['features']
                       if 'nombre_estacion' in feature['properties']]
            stations.sort(key=lambda x: x[0])  # Sort by station name
            form.station.choices = stations
        if form.validate_on_submit():
            latitude = request.form.get('latitude')
            longitude = request.form.get('longitude')
            nearest_station = request.form.get('nearest_station')
            
            if not all([latitude, longitude, nearest_station]):
                flash('Se requieren datos de ubicación y estación. Por favor, active la geolocalización.')
                return redirect(url_for('report_incident'))
            
            incident = Incident(
                incident_type=form.incident_type.data,
                description=form.description.data,
                latitude=float(latitude),
                longitude=float(longitude),
                incident_date=form.incident_date.data,
                incident_time=form.incident_time.data,
                user_id=current_user.id,
                nearest_station=form.station.data,
                timestamp=datetime.combine(form.incident_date.data, form.incident_time.data)
            )
            db.session.add(incident)
            db.session.commit()
            
            flash('¡Incidente reportado con éxito!')
            send_notification(incident.incident_type, incident.timestamp.isoformat())
            device_token = "simulated_device_token"
            send_push_notification(incident.incident_type, incident.timestamp.isoformat(), device_token)
            
            return redirect(url_for('dashboard'))
        return render_template('report_incident.html', title='Reportar incidente', form=form)

    @app.route('/station_statistics')
    @login_required
    def station_statistics():
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        incidents_by_station = db.session.query(
            Incident.nearest_station,
            func.count(Incident.id).label('incident_count')
        ).filter(
            Incident.timestamp >= thirty_days_ago
        ).group_by(
            Incident.nearest_station
        ).all()
        
        statistics = {station: count for station, count in incidents_by_station}
        return jsonify(statistics)

    @app.route('/dashboard')
    @login_required
    def dashboard():
        try:
            logging.info("Obteniendo datos para el panel de control")
            incidents = get_incidents_for_map()
            
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            station_stats = db.session.query(
                Incident.nearest_station,
                func.count(Incident.id).label('incident_count')
            ).filter(
                Incident.timestamp >= thirty_days_ago
            ).group_by(
                Incident.nearest_station
            ).all()
            
            station_security_levels = {}
            for station, count in station_stats:
                if count > 5:
                    level = 'high'
                    color = '#ff0000'
                elif count >= 2:
                    level = 'medium'
                    color = '#ffa500'
                else:
                    level = 'low'
                    color = '#008000'
                station_security_levels[station] = {'level': level, 'color': color, 'count': count}
            
            statistics = get_incident_statistics()
            trends = get_incident_trends()
            model_insights = get_model_insights()
            
            return render_template('dashboard.html',
                                incidents=incidents,
                                statistics=statistics if statistics else {},
                                trends=trends if trends else [],
                                model_insights=model_insights if model_insights else {},
                                station_security_levels=station_security_levels)
        except Exception as e:
            logging.error(f"Error en la ruta del panel de control: {str(e)}")
            flash("Ocurrió un error al cargar el panel de control. Por favor, intente de nuevo más tarde.", "error")
            return redirect(url_for('index'))

    @app.route('/model_insights')
    @login_required
    def model_insights():
        try:
            insights = get_model_insights()
            return render_template('model_insights.html', insights=insights)
        except Exception as e:
            logging.error(f"Error en la ruta de insights del modelo: {str(e)}")
            flash("Ocurrió un error al cargar los insights del modelo. Por favor, intente de nuevo más tarde.", "error")
            return redirect(url_for('dashboard'))

    @app.route('/real_time_map')
    @login_required
    def real_time_map():
        stations = get_all_stations()
        return render_template('real_time_map.html', stations=stations)

    @app.route('/api/stations')
    @login_required
    def api_stations():
        stations = get_all_stations()
        return jsonify(stations)

    @app.route('/route/<route_id>')
    @login_required
    def route_information(route_id):
        route_info = get_route_information(route_id)
        return render_template('route_information.html', route_info=route_info)

    return app
