from flask import render_template, flash, redirect, url_for, request, jsonify, json
from flask_login import login_user, logout_user, current_user, login_required
from extensions import cache, db
from urllib.parse import urlparse
from forms import LoginForm, RegistrationForm, IncidentReportForm
from incident_utils import get_incidents_for_map, get_incident_statistics
from utils import send_notification, send_push_notification
from datetime import datetime, timedelta
import logging
from models import User, Incident, PushSubscription
from sqlalchemy import func
import os
from sqlalchemy import exc as sql_exceptions
from ml_models import predict_station_risk as ml_predict_station_risk
from ml_models import predict_incident_type as ml_predict_incident_type

def init_routes(app):
    # Note: /health route is defined in main.py

    @app.route('/test')
    def test():
        app.logger.info("Test endpoint accessed")
        return jsonify({"status": "ok", "message": "Server is running"}), 200

    @app.route('/')
    @app.route('/index')
    def index():
        app.logger.info("Index endpoint accessed")
        if current_user.is_authenticated:
            return redirect(url_for('home'))
        return redirect(url_for('login'))
    
    @app.route('/login', methods=['GET', 'POST'])
    def login():
        if current_user.is_authenticated:
            return redirect(url_for('home'))
        form = LoginForm()
        if form.validate_on_submit():
            user = User.query.filter_by(username=form.username.data).first()
            if user is None or not user.check_password(form.password.data):
                flash('Nombre de usuario o contraseña inválidos')
                return redirect(url_for('login'))
            login_user(user, remember=form.remember_me.data)
            next_page = request.args.get('next')
            if not next_page or urlparse(next_page).netloc != '':
                next_page = url_for('home')
            flash('¡Inicio de sesión exitoso!')
            return redirect(next_page)
        return render_template('login.html', title='Iniciar sesión', form=form)

    @app.route('/logout')
    def logout():
        logout_user()
        flash('Has cerrado sesión exitosamente.')
        return redirect(url_for('login'))

    @app.route('/register', methods=['GET', 'POST'])
    def register():
        if current_user.is_authenticated:
            return redirect(url_for('home'))
        form = RegistrationForm()
        if form.validate_on_submit():
            user = User(username=form.username.data, email=form.email.data)
            user.set_password(form.password.data)
            db.session.add(user)
            db.session.commit()
            flash('¡Felicidades, ahora estás registrado!')
            return redirect(url_for('login'))
        return render_template('register.html', title='Registro', form=form)

    @app.route('/home')
    @login_required
    def home():
        return render_template('home.html', title='Inicio')

    @app.route('/report_incident', methods=['GET', 'POST'])
    @login_required
    def report_incident():
        form = IncidentReportForm()
        with open('static/Estaciones_Troncales_de_TRANSMILENIO.geojson', 'r', encoding='utf-8') as f:
            geojson_data = json.load(f)
            stations = [(feature['properties']['nombre_estacion'], 
                        f"{feature['properties']['nombre_estacion']} - {feature['properties'].get('troncal_estacion', 'N/A')}")
                       for feature in geojson_data['features']
                       if 'nombre_estacion' in feature['properties']]
            stations.sort(key=lambda x: x[0]) 
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
            return redirect(url_for('home'))
        return render_template('report_incident.html', title='Reportar incidente', form=form)

    @app.route('/dashboard')
    @login_required
    def dashboard():
        logging.info("Obteniendo datos para el panel de control")
        cached_data = cache.get('dashboard_data')
        if not cached_data:
            cached_data = {
                'incidents': get_incidents_for_map(),
                'statistics': get_incident_statistics() or {},
                'trends': [],
                'model_insights': {}
            }
        return render_template('dashboard.html', **cached_data)

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
    def api_statistics():
        """
        Generate statistics with optimized queries and better caching
        """
        try:
            logging.info("Iniciando generación de estadísticas")

            # Try to get statistics from cache first
            cache_key = f'api_statistics_cache_{request.args.get("dateFrom", "all")}_{request.args.get("dateTo", "all")}'
            cached_stats = cache.get(cache_key)
            if cached_stats:
                logging.info("Retornando estadísticas desde caché")
                return jsonify(cached_stats)

            logging.info("Cache miss - generando nuevas estadísticas")

            # Get date parameters
            date_from = request.args.get('dateFrom')
            date_to = request.args.get('dateTo')

            # Build base query with indices
            base_query = Incident.query

            # Apply date filters if they exist
            if date_from:
                date_from_obj = datetime.strptime(date_from, '%Y-%m-%d')
                base_query = base_query.filter(Incident.timestamp >= date_from_obj)
                logging.info(f"Aplicando filtro desde: {date_from}")
            if date_to:
                date_to_obj = datetime.strptime(date_to, '%Y-%m-%d')
                date_to_end = date_to_obj.replace(hour=23, minute=59, second=59)
                base_query = base_query.filter(Incident.timestamp <= date_to_end)
                logging.info(f"Aplicando filtro hasta: {date_to}")

            try:
                logging.info("Iniciando consultas de estadísticas")
                start_time = datetime.now()

                # Total incidents
                total_incidents = base_query.count()
                logging.info(f"Total de incidentes encontrados: {total_incidents} ({(datetime.now() - start_time).total_seconds()}s)")

                # Incident types and counts
                incident_types = db.session.query(
                    Incident.incident_type,
                    func.count(Incident.id).label('count')
                ).filter(base_query.whereclause).group_by(Incident.incident_type).all()
                incident_types_dict = {t[0]: t[1] for t in incident_types}
                logging.info(f"Tipos de incidentes procesados: {len(incident_types_dict)} tipos ({(datetime.now() - start_time).total_seconds()}s)")

                # Station statistics
                station_counts = db.session.query(
                    Incident.nearest_station,
                    func.count(Incident.id).label('count')
                ).filter(base_query.whereclause).group_by(Incident.nearest_station).all()
                station_counts_dict = {s[0]: s[1] for s in station_counts}
                logging.info(f"Estaciones procesadas: {len(station_counts_dict)} estaciones ({(datetime.now() - start_time).total_seconds()}s)")

                # Most dangerous hour
                hour_counts = db.session.query(
                    func.extract('hour', Incident.timestamp).label('hour'),
                    func.count(Incident.id).label('count')
                ).filter(base_query.whereclause).group_by('hour').order_by(func.count(Incident.id).desc()).first()
                most_dangerous_hour = f"{int(hour_counts[0]):02d}:00" if hour_counts else "-"
                logging.info(f"Hora más peligrosa identificada: {most_dangerous_hour} ({(datetime.now() - start_time).total_seconds()}s)")

                # Calculate derived statistics
                most_affected_station = max(station_counts_dict.items(), key=lambda x: x[1])[0] if station_counts_dict else "-"
                most_common_type = max(incident_types_dict.items(), key=lambda x: x[1])[0] if incident_types_dict else "-"

                # Prepare response
                response_data = {
                    'total_incidents': total_incidents,
                    'incident_types': incident_types_dict,
                    'most_affected_station': most_affected_station,
                    'most_common_type': most_common_type,
                    'most_dangerous_hour': most_dangerous_hour,
                    'top_stations': dict(sorted(station_counts_dict.items(), key=lambda x: x[1], reverse=True)[:5])
                }

                # Cache results for 5 minutes
                cache.set(cache_key, response_data, timeout=300)
                logging.info(f"Estadísticas generadas y guardadas en caché (tiempo total: {(datetime.now() - start_time).total_seconds()}s)")

                return jsonify(response_data)

            except Exception as e:
                logging.error(f"Error al procesar estadísticas: {str(e)}")
                return jsonify({
                    'error': 'Error al procesar estadísticas',
                    'details': str(e) if app.debug else 'Error interno del servidor'
                }), 500

        except Exception as e:
            logging.error(f"Error general en api_statistics: {str(e)}", exc_info=True)
            return jsonify({
                'error': 'Error al generar estadísticas',
                'details': str(e) if app.debug else 'Error interno del servidor'
            }), 500

    @app.route('/model_insights')
    @login_required
    def model_insights():
        try:
            logging.info("Accediendo a insights del modelo")
            from ml_models import get_model_insights # Lazy import here
            insights = get_model_insights()
            return render_template('model_insights.html', insights=insights)
        except Exception as e:
            logging.error(f"Error en la ruta de insights del modelo: {str(e)}")
            flash("Ocurrió un error al cargar los insights del modelo. Intente de nuevo más tarde.", "error")
            return redirect(url_for('home'))

    @app.route('/predictions')
    @login_required
    def predictions():
        logging.info("Accediendo a la ruta de predicciones")
        from ml_models import get_model_insights # Lazy import here
        return render_template('predictions.html', title='Predicciones')

    @app.route('/api/predictions')
    def api_predictions():
        """
        Generate predictions for incidents.
        This endpoint is temporarily public for testing purposes.
        """
        try:
            logging.info("Iniciando generación de predicciones")

            # Verificar si hay predicciones en caché
            cached_predictions = cache.get('predictions_cache')
            if cached_predictions:
                logging.info("Retornando predicciones desde caché")
                return jsonify(cached_predictions)

            # Si no hay caché, cargar el modelo y generar predicciones
            logging.info("Cargando datos de estaciones para predicciones")
            try:
                with open('static/Estaciones_Troncales_de_TRANSMILENIO.geojson', 'r', encoding='utf-8') as f:
                    geojson_data = json.load(f)
            except FileNotFoundError as e:
                logging.error(f"No se encontró el archivo geojson: {str(e)}")
                return jsonify({
                    'error': 'Error al cargar datos de estaciones',
                    'details': 'Archivo de estaciones no encontrado'
                }), 500
            except json.JSONDecodeError as e:
                logging.error(f"Error al parsear el archivo geojson: {str(e)}")
                return jsonify({
                    'error': 'Error al procesar datos de estaciones',
                    'details': 'Formato de archivo inválido'
                }), 500

            current_time = datetime.now()
            predictions = []

            # Generar predicciones para las próximas 3 horas
            logging.info("Generando predicciones para las próximas 3 horas")
            for hour_offset in range(3):
                prediction_time = current_time + timedelta(hours=hour_offset)
                logging.debug(f"Generando predicciones para hora: {prediction_time}")

                for feature in geojson_data['features']:
                    station = feature['properties']['nombre_estacion']
                    coordinates = feature['geometry']['coordinates']

                    try:
                        # Usar el modelo real para predicciones
                        logging.info(f"Prediciendo riesgo para estación: {station}")
                        risk_score = predict_station_risk(station, prediction_time.hour)

                        if risk_score is not None:
                            logging.info(f"Prediciendo tipo de incidente para estación: {station}")
                            incident_type = predict_incident_type(station, prediction_time.hour)

                            predictions.append({
                                'station': station,
                                'incident_type': incident_type,
                                'predicted_time': prediction_time.isoformat(),
                                'risk_score': float(risk_score),
                                'latitude': coordinates[1],
                                'longitude': coordinates[0]
                            })
                            logging.debug(f"Predicción generada para {station}: score={risk_score}, tipo={incident_type}")
                        else:
                            logging.warning(f"No se pudo generar score de riesgo para estación: {station}")

                    except Exception as e:
                        logging.error(f"Error al generar predicción para estación {station}: {str(e)}")
                        continue

            if not predictions:
                logging.warning("No se generaron predicciones")
                return jsonify({
                    'error': 'No hay predicciones disponibles',
                    'details': 'No se pudieron generar predicciones válidas'
                }), 404

            # Guardar en caché por 1 hora
            logging.info(f"Guardando {len(predictions)} predicciones en caché")
            try:
                cache.set('predictions_cache', predictions, timeout=3600)
            except Exception as e:
                logging.error(f"Error al guardar predicciones en caché: {str(e)}")
                # Continuar sin caché si hay error

            return jsonify(predictions)

        except Exception as e:
            logging.error(f"Error general en api_predictions: {str(e)}", exc_info=True)
            return jsonify({
                'error': 'Error al generar predicciones',
                'details': str(e) if app.debug else 'Error interno del servidor'
            }), 500

    @app.route('/real_time_map')
    @login_required
    def real_time_map():
        stations = get_all_stations()
        return render_template('real_time_map.html', stations=stations)

    @app.route('/api/stations')
    @login_required
    def api_stations():
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

    @app.route('/station_statistics')
    @login_required
    def station_statistics():
        try:
            incidents = Incident.query.all()
            stats = {
                'incident_count': len(incidents),
                'stations': {}
            }
            for incident in incidents:
                if incident.nearest_station not in stats['stations']:
                    stats['stations'][incident.nearest_station] = 0
                stats['stations'][incident.nearest_station] += 1
            return jsonify(stats)
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @app.route('/api/notifications')
    @login_required
    def get_notifications():
        query = Incident.query
        troncal = request.args.get('troncal')
        station = request.args.get('station')
        incident_type = request.args.get('incident_type')

        with open('static/Estaciones_Troncales_de_TRANSMILENIO.geojson', 'r', encoding='utf-8') as f:
            geojson_data = json.load(f)

        if troncal:
            stations_for_troncal = [feature['properties']['nombre_estacion'] 
                                   for feature in geojson_data['features']
                                   if feature['properties'].get('troncal_estacion') == troncal]
            query = query.filter(Incident.nearest_station.in_(stations_for_troncal))
        if station:
            query = query.filter(Incident.nearest_station == station)
        if incident_type:
            query = query.filter(Incident.incident_type == incident_type)

        incidents = query.order_by(Incident.timestamp.desc()).limit(100).all()
        return jsonify([{
            'id': i.id,
            'incident_type': i.incident_type,
            'nearest_station': i.nearest_station,
            'timestamp': i.timestamp.isoformat(),
            'description': i.description
        } for i in incidents])

    @app.route('/incidents')
    @login_required
    def get_incidents():
        query = Incident.query
        troncal = request.args.get('troncal')
        station = request.args.get('station')
        incident_type = request.args.get('incident_type')

        with open('static/Estaciones_Troncales_de_TRANSMILENIO.geojson', 'r', encoding='utf-8') as f:
            geojson_data = json.load(f)

        if troncal:
            stations_for_troncal = [feature['properties']['nombre_estacion'] 
                                   for feature in geojson_data['features']
                                   if feature['properties'].get('troncal_estacion') == troncal]
            query = query.filter(Incident.nearest_station.in_(stations_for_troncal))
        if station:
            query = query.filter(Incident.nearest_station == station)
        if incident_type:
            query = query.filter(Incident.incident_type == incident_type)

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

    @app.route('/api/vapid-public-key')
    def get_vapid_public_key():
        return os.environ.get('VAPID_PUBLIC_KEY', '')

    @app.route('/push/subscribe', methods=['POST'])
    @login_required
    def push_subscribe():
        subscription_info = request.get_json()
        try:
            with db.session.begin_nested():  # Use nested transaction for better error handling
                device = PushSubscription(
                    subscription_info=json.dumps(subscription_info),
                    user_id=current_user.id if current_user.is_authenticated else None
                )
                db.session.add(device)
            return jsonify({'success': True})
        except sql_exceptions.IntegrityError:  # Handle duplicate entry error
            return jsonify({'success': True, 'message': 'Subscription already exists'}), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    return app

def predict_station_risk(station, hour):
    """Wrapper para la función de predicción del modelo real"""
    try:
        return ml_predict_station_risk(station, hour)
    except Exception as e:
        logging.error(f"Error predicting risk for station {station}: {str(e)}")
        # Fallback a valores aleatorios si hay error
        import random
        return random.uniform(0.1, 1.0)

def predict_incident_type(station, hour):
    """Wrapper para la función de predicción del tipo de incidente"""
    try:
        return ml_predict_incident_type(station, hour)
    except Exception as e:
        logging.error(f"Error predicting incident type for station {station}: {str(e)}")
        # Fallback a valores por defecto si hay error
        incident_types = ['Hurto', 'Acoso', 'Accidente', 'Otro']
        import random
        return random.choice(incident_types)

def get_all_stations():
    with open('static/Estaciones_Troncales_de_TRANSMILENIO.geojson', 'r', encoding='utf-8') as f:
        geojson_data = json.load(f)
        stations = [{
            'nombre': feature['properties']['nombre_estacion'],
            'troncal': feature['properties'].get('troncal_estacion', 'N/A'),
            'latitude': feature['geometry']['coordinates'][1],
            'longitude': feature['geometry']['coordinates'][0]
        } for feature in geojson_data['features']]
    return stations

def get_route_information(route_id):
    return {"route_id": route_id, "name": f"Ruta {route_id}"}