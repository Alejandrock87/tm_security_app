from flask import render_template, flash, redirect, url_for, request, jsonify, json
from flask_login import login_user, logout_user, current_user, login_required
from app import cache
from urllib.parse import urlparse
from forms import LoginForm, RegistrationForm, IncidentReportForm
from incident_utils import get_incidents_for_map, get_incident_statistics
from utils import send_notification, send_push_notification
from datetime import datetime, timedelta
from ml_models import predict_incident_probability, get_incident_trends, get_model_insights, predict_station_risk, predict_incident_type
import logging
from models import User, Incident
from database import db
from transmilenio_api import get_all_stations, get_route_information
from sqlalchemy import func
import os

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
            cached_data = cache.get('dashboard_data')
            if not cached_data:
                # Si no hay caché, usar datos básicos sin predicciones
                cached_data = {
                    'incidents': get_incidents_for_map(),
                    'statistics': get_incident_statistics() or {},
                    'trends': [],
                    'model_insights': {}
                }
            return render_template('dashboard.html', **cached_data)

        except Exception as e:
            logging.error(f"Error en la ruta del panel de control: {str(e)}")
            flash("Ocurrió un error al cargar el panel de control. Por favor, intente de nuevo más tarde.", "error")
            return redirect(url_for('index'))

    @app.route('/predictions')
    @login_required
    def predictions():
        return render_template('predictions.html')

    @app.route('/notifications')
    @login_required
    def notifications():
        return render_template('notifications.html')

    @app.route('/statistics')
    @login_required
    def statistics():
        return render_template('statistics.html')

    @app.route('/api/statistics')
    @login_required
    def get_statistics():
        try:
            # Get filter parameters
            date_from = request.args.get('dateFrom')
            date_to = request.args.get('dateTo')
            time_from = request.args.get('timeFrom')
            time_to = request.args.get('timeTo')
            incident_type = request.args.get('incidentType')
            troncal = request.args.get('troncal')

            # Base query
            query = Incident.query

            # Apply filters
            if date_from:
                query = query.filter(Incident.timestamp >= datetime.strptime(date_from, '%Y-%m-%d'))
            if date_to:
                query = query.filter(Incident.timestamp <= datetime.strptime(date_to, '%Y-%m-%d'))
            if time_from:
                hour_from = int(time_from.split(':')[0])
                query = query.filter(func.extract('hour', Incident.timestamp) >= hour_from)
            if time_to:
                hour_to = int(time_to.split(':')[0])
                query = query.filter(func.extract('hour', Incident.timestamp) <= hour_to)
            if incident_type != 'all':
                query = query.filter(Incident.incident_type == incident_type)

            incidents = query.all()

        # Process data for charts and summary
        hourly_stats = {}
        incident_types = {}
        station_counts = {}

        for incident in incidents:
            # Hourly statistics
            hour = incident.timestamp.hour
            day = incident.timestamp.strftime('%A')
            if day not in hourly_stats:
                hourly_stats[day] = {}
            hourly_stats[day][hour] = hourly_stats[day].get(hour, 0) + 1

            # Incident types
            incident_types[incident.incident_type] = incident_types.get(incident.incident_type, 0) + 1

            # Station counts
            station_counts[incident.nearest_station] = station_counts.get(incident.nearest_station, 0) + 1

        # Get top 5 stations
        top_stations = dict(sorted(station_counts.items(), key=lambda x: x[1], reverse=True)[:5])

        # Get summary data
        total_incidents = len(incidents)
        most_affected_station = max(station_counts.items(), key=lambda x: x[1])[0] if station_counts else "-"
        most_dangerous_hour = max([(h, sum(d.get(h, 0) for d in hourly_stats.values())) 
                                 for h in range(24)], key=lambda x: x[1])[0] if hourly_stats else "-"
        most_common_type = max(incident_types.items(), key=lambda x: x[1])[0] if incident_types else "-"

        return jsonify({
            'hourly_stats': hourly_stats,
            'incident_types': incident_types,
            'top_stations': top_stations,
            'total_incidents': total_incidents,
            'most_affected_station': most_affected_station,
            'most_dangerous_hour': f"{most_dangerous_hour}:00",
            'most_common_type': most_common_type
        })
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @app.route('/api/predictions')
    @login_required
    def get_predictions():
        try:
            PREDICTIONS_CACHE_FILE = 'predictions_cache.json'
            if os.path.exists(PREDICTIONS_CACHE_FILE):
                with open(PREDICTIONS_CACHE_FILE, 'r') as f:
                    predictions = json.load(f)
                return jsonify(sorted(predictions, key=lambda x: x['risk_score'], reverse=True))
            else:
                logging.warning("No cached predictions found")
                return jsonify([])
        except Exception as e:
            logging.error(f"Error getting predictions: {str(e)}")
            return jsonify([])


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
        import json
        with open('static/Estaciones_Troncales_de_TRANSMILENIO.geojson', 'r', encoding='utf-8') as f:
            geojson_data = json.load(f)
            stations = [{
                'nombre': feature['properties']['nombre_estacion'],
                'troncal': feature['properties'].get('troncal_estacion', 'N/A'),
                'latitude': feature['geometry']['coordinates'][1],
                'longitude': feature['geometry']['coordinates'][0]
            } for feature in geojson_data['features']]
        return jsonify(stations)

    @app.route('/route/<route_id>')
    @login_required
    def route_information(route_id):
        route_info = get_route_information(route_id)
        return render_template('route_information.html', route_info=route_info)

    @app.route('/incidents')
    @login_required
    def get_incidents():
        query = Incident.query

        troncal = request.args.get('troncal')
        station = request.args.get('station')
        incident_type = request.args.get('incident_type')
        security_level = request.args.get('security_level')

        # Obtener todas las estaciones para el filtrado por troncal
        with open('static/Estaciones_Troncales_de_TRANSMILENIO.geojson', 'r', encoding='utf-8') as f:
            geojson_data = json.load(f)
            # Primero obtenemos todas las troncales
            all_features = geojson_data['features']
            all_troncales = set(
                feature['properties'].get('troncal_estacion')
                for feature in all_features
                if feature['properties'].get('troncal_estacion')
            )

            # Luego construimos el diccionario de estaciones por troncal
            stations_by_troncal = {
                current_troncal: [
                    feature['properties']['nombre_estacion']
                    for feature in all_features
                    if feature['properties'].get('troncal_estacion') == current_troncal
                ]
                for current_troncal in all_troncales
            }


        # Aplicar filtros
        if troncal:
            stations_in_troncal = stations_by_troncal.get(troncal, [])
            query = query.filter(Incident.nearest_station.in_(stations_in_troncal))

        if station:
            query = query.filter(Incident.nearest_station == station)

        if incident_type:
            query = query.filter(Incident.incident_type == incident_type)

        if security_level:
            # Implementar lógica de nivel de seguridad si es necesario
            pass

        incidents = query.all()
        return jsonify([{
            'id': i.id,
            'incident_type': i.incident_type,
            'latitude': i.latitude,
            'longitude': i.longitude,
            'timestamp': i.timestamp.isoformat(),
            'nearest_station': i.nearest_station,
            'description': i.description
        } for i in incidents])

    return app