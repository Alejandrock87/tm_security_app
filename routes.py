from flask import render_template, flash, redirect, url_for, request, jsonify, json, session
from flask_login import login_user, logout_user, current_user, login_required
import logging
from datetime import datetime, timedelta
import os
from sqlalchemy import exc as sql_exceptions
# from app import cache  # Eliminado para evitar importación circular
from urllib.parse import urlparse
from forms import LoginForm, RegistrationForm, IncidentReportForm
from incident_utils import get_incidents_for_map, get_incident_statistics
from utils import send_notification, send_push_notification
from models import User, Incident, PushSubscription
from database import db
from sqlalchemy import func
from sqlalchemy.sql import desc

def init_routes(app):
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

    @app.route('/dashboard')
    def dashboard():
        app.logger.info("Dashboard endpoint accessed")
        try:
            app.logger.info("Intentando obtener incidentes para el mapa")
            incidents = get_incidents_for_map()
            app.logger.info(f"Obtenidos {len(incidents)} incidentes para el mapa")

            app.logger.info("Intentando obtener estadísticas")
            statistics = get_incident_statistics()
            app.logger.info(f"Estadísticas obtenidas: {statistics}")

            data = {
                'incidents': incidents,
                'statistics': statistics or {},
                'trends': [],
                'model_insights': {}
            }

            app.logger.info("Renderizando template dashboard.html")
            return render_template('dashboard.html', **data)
        except Exception as e:
            app.logger.error(f"Error en dashboard: {str(e)}", exc_info=True)
            return jsonify({"error": str(e)}), 500

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

    @app.route('/report_incident', methods=['GET', 'POST'])
    @login_required
    def report_incident():
        app.logger.info(f"Accessing report_incident. User: {current_user}, Remote addr: {request.remote_addr}")
        app.logger.debug(f"Request headers: {dict(request.headers)}")
        app.logger.debug(f"Session data: {dict(session)}")
        app.logger.debug(f"User authenticated: {current_user.is_authenticated}")

        form = IncidentReportForm()
        try:
            with open('static/Estaciones_Troncales_de_TRANSMILENIO.geojson', 'r', encoding='utf-8') as f:
                geojson_data = json.load(f)
                stations = [(feature['properties']['nombre_estacion'],
                             f"{feature['properties']['nombre_estacion']} - {feature['properties'].get('troncal_estacion', 'N/A')}")
                            for feature in geojson_data['features']
                            if 'nombre_estacion' in feature['properties']]
                stations.sort(key=lambda x: x[0])
                form.station.choices = [(s[0], s[1]) for s in stations]

            if form.validate_on_submit():
                app.logger.info("Form submitted and validated")
                app.logger.debug(f"Form data: {request.form}")

                latitude = request.form.get('latitude')
                longitude = request.form.get('longitude')
                nearest_station = request.form.get('nearest_station')

                app.logger.debug(f"Location data - Lat: {latitude}, Long: {longitude}, Station: {nearest_station}")

                if not all([latitude, longitude, nearest_station]):
                    flash('Se requieren datos de ubicación y estación. Por favor, active la geolocalización.')
                    return redirect(url_for('report_incident'))

                incident_date = form.incident_date.data or datetime.now().date()
                incident_time = form.incident_time.data or datetime.now().time()

                try:
                    user = User.query.get(current_user.id)
                    if not user:
                        app.logger.error(f"Usuario no encontrado: ID {current_user.id}")
                        flash('Error de autenticación. Por favor, inicie sesión nuevamente.')
                        return redirect(url_for('login'))

                    app.logger.debug(f"Converting latitude: {latitude} and longitude: {longitude} to float")

                    try:
                        float_lat = float(latitude)
                        float_lon = float(longitude)
                        app.logger.debug(f"Converted values - Lat: {float_lat}, Long: {float_lon}")
                    except ValueError as ve:
                        app.logger.error(f"Error converting coordinates to float: {str(ve)}")
                        flash('Error en el formato de las coordenadas. Por favor, intente de nuevo.')
                        return redirect(url_for('report_incident'))

                    incident = Incident(
                        incident_type=form.incident_type.data,
                        description=form.description.data,
                        latitude=float_lat,
                        longitude=float_lon,
                        user_id=current_user.id,
                        nearest_station=form.station.data,
                        timestamp=datetime.combine(incident_date, incident_time)
                    )

                    app.logger.debug(f"Created incident object: {incident.to_dict()}")

                    db.session.add(incident)
                    app.logger.debug("Added incident to session, attempting commit")
                    db.session.commit()
                    app.logger.info("Incident saved successfully")

                    flash('¡Incidente reportado con éxito!')
                    
                    # Enviar notificación en tiempo real a todos los usuarios
                    send_notification(
                        incident_type=incident.incident_type,
                        timestamp=incident.timestamp.isoformat(),
                        nearest_station=incident.nearest_station,
                        description=incident.description
                    )
                    
                    return redirect(url_for('home'))
                except ValueError as e:
                    db.session.rollback()
                    app.logger.error(f"Error de formato en los datos: {str(e)}", exc_info=True)
                    flash('Error en el formato de los datos. Por favor, verifique la información ingresada.')
                    return redirect(url_for('report_incident'))
                except Exception as e:
                    db.session.rollback()
                    app.logger.error(f"Error al guardar el incidente: {str(e)}", exc_info=True)
                    flash('Error al guardar el incidente. Por favor, intente de nuevo.')
                    return redirect(url_for('report_incident'))

            app.logger.info("Rendering report_incident template")
            return render_template('report_incident.html', title='Reportar incidente', form=form)

        except Exception as e:
            app.logger.error(f"Error general en report_incident: {str(e)}", exc_info=True)
            flash('Error al cargar la página. Por favor, intente de nuevo.')
            return redirect(url_for('home'))

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
            try:
                # Validación adicional en el backend como medida de seguridad
                existing_user_by_username = User.query.filter_by(username=form.username.data).first()
                if existing_user_by_username:
                    app.logger.warning(f"Intento de registro con username existente: {form.username.data}")
                    flash('El nombre de usuario ya está en uso. Por favor, elija otro.')
                    return render_template('register.html', title='Registro', form=form)
                
                existing_user_by_email = User.query.filter_by(email=form.email.data).first()
                if existing_user_by_email:
                    app.logger.warning(f"Intento de registro con email existente: {form.email.data}")
                    flash('El correo electrónico ya está registrado. Por favor, use otro.')
                    return render_template('register.html', title='Registro', form=form)
                
                # Crear nuevo usuario
                user = User(username=form.username.data, email=form.email.data)
                user.set_password(form.password.data)
                
                app.logger.info(f"Creando nuevo usuario: {form.username.data} con email: {form.email.data}")
                
                db.session.add(user)
                db.session.commit()
                
                app.logger.info(f"Usuario registrado exitosamente: {form.username.data}")
                flash('¡Felicidades, ahora estás registrado!')
                return redirect(url_for('login'))
                
            except sql_exceptions.IntegrityError as e:
                # Manejo específico para errores de integridad de base de datos
                db.session.rollback()
                app.logger.error(f"Error de integridad en registro: {str(e)}")
                
                if 'username' in str(e).lower():
                    flash('El nombre de usuario ya está en uso. Por favor, elija otro.')
                elif 'email' in str(e).lower():
                    flash('El correo electrónico ya está registrado. Por favor, use otro.')
                else:
                    flash('Error en el registro. Los datos proporcionados ya están en uso.')
                    
                return render_template('register.html', title='Registro', form=form)
                
            except Exception as e:
                # Manejo general de errores
                db.session.rollback()
                app.logger.error(f"Error general en registro de usuario: {str(e)}", exc_info=True)
                flash('Ocurrió un error durante el registro. Por favor, intente de nuevo.')
                return render_template('register.html', title='Registro', form=form)
                
        return render_template('register.html', title='Registro', form=form)

    @app.route('/home')
    @login_required
    def home():
        return render_template('home.html', title='Inicio')

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
        try:
            app.logger.info("Endpoint /api/statistics accessed")
            query = Incident.query

            date_from = request.args.get('dateFrom')
            date_to = request.args.get('dateTo')
            date_from_obj = None
            date_to_end = None

            app.logger.info(f"Filtros de fecha recibidos - desde: {date_from}, hasta: {date_to}")

            if date_from:
                date_from_obj = datetime.strptime(date_from, '%Y-%m-%d')
                query = query.filter(Incident.timestamp >= date_from_obj)
            if date_to:
                date_to_obj = datetime.strptime(date_to, '%Y-%m-%d')
                date_to_end = date_to_obj.replace(hour=23, minute=59, second=59)
                query = query.filter(Incident.timestamp <= date_to_end)

            app.logger.info("Obteniendo estadísticas de incidentes...")
            statistics = get_incident_statistics(date_from_obj, date_to_end)

            if not statistics['total_incidents']:
                app.logger.warning("No se encontraron incidentes para los filtros especificados")
                return jsonify({
                    'total_incidents': 0,
                    'incident_types': {},
                    'most_affected_station': '-',
                    'most_common_type': '-',
                    'most_dangerous_hour': '-',
                    'top_stations': {}
                })

            app.logger.info(f"Retornando datos - Total de incidentes: {statistics['total_incidents']}")
            app.logger.info(f"Estación más afectada: {statistics['most_affected_station']}")
            app.logger.info(f"Tipos de incidentes: {statistics['incident_types']}")
            app.logger.info(f"Top estaciones: {statistics['top_stations']}")

            return jsonify(statistics)

        except Exception as e:
            app.logger.error(f"Error en /api/statistics: {str(e)}", exc_info=True)
            return jsonify({'error': str(e)}), 500

    @app.route('/model_insights')
    @login_required
    def model_insights():
        try:
            from ml_models import get_model_insights
            insights = get_model_insights()
            return render_template('model_insights.html', insights=insights)
        except Exception as e:
            logging.error(f"Error en la ruta de insights del modelo: {str(e)}")
            flash("Ocurrió un error al cargar los insights del modelo. Intente de nuevo más tarde.", "error")
            return redirect(url_for('home'))

    @app.route('/predictions')
    @login_required
    def predictions():
        app.logger.info("Accediendo a la página de predicciones")
        try:
            app.logger.debug("Usuario autenticado: %s", current_user.username if current_user else "No autenticado")
            return render_template('predictions.html', title='Predicciones')
        except Exception as e:
            app.logger.error("Error al cargar la página de predicciones: %s", str(e))
            flash("Error al cargar las predicciones. Por favor, intente de nuevo.")
            return redirect(url_for('home'))

    @app.route('/api/predictions')
    def api_predictions():
        """
        Endpoint para obtener predicciones.
        No requiere autenticación para acceso público básico.
        """
        try:
            app.logger.info("Solicitud de predicciones API recibida")
            from ml_models import get_cached_predictions
            predictions = get_cached_predictions()

            if not predictions:
                app.logger.warning("No se encontraron predicciones en caché, generando nuevas")
                from ml_models import generate_prediction_cache
                predictions = generate_prediction_cache(hours_ahead=3)
                if not predictions:
                    app.logger.error("No se pudieron generar predicciones")
                    return jsonify({
                        'error': 'No se pudieron generar predicciones',
                        'predictions': []
                    }), 500

            with open('static/Estaciones_Troncales_de_TRANSMILENIO.geojson', 'r', encoding='utf-8') as f:
                geojson_data = json.load(f)
                station_to_troncal = {
                    feature['properties']['nombre_estacion']: feature['properties'].get('troncal_estacion', 'N/A')
                    for feature in geojson_data['features']
                    if 'nombre_estacion' in feature['properties']
                }

            # Agregar información de troncal a cada predicción
            for prediction in predictions:
                prediction['troncal'] = station_to_troncal.get(prediction['station'], 'N/A')

            app.logger.info(f"Retornando {len(predictions)} predicciones")
            # Force prediction generation if empty
            if not predictions:
                app.logger.warning("Lista de predicciones vacía, forzando generación")
                predictions = generate_prediction_cache(hours_ahead=3)

            return jsonify(predictions)

        except Exception as e:
            app.logger.error(f"Error generando predicciones: {str(e)}", exc_info=True)
            return jsonify({
                'error': 'Error al generar predicciones',
                'message': str(e),
                'predictions': []
            }), 500

    @app.route('/initialize_predictions')
    def initialize_predictions():
        """
        Endpoint para forzar la generación inicial de predicciones.
        """
        try:
            app.logger.info("Forzando generación inicial de predicciones")
            from ml_models import generate_prediction_cache
            predictions = generate_prediction_cache(hours_ahead=24)
            return jsonify({
                'success': True,
                'message': f'Generadas {len(predictions)} predicciones',
                'count': len(predictions)
            })
        except Exception as e:
            app.logger.error(f"Error en generación inicial: {str(e)}", exc_info=True)
            return jsonify({'error': str(e)}), 500

    @app.route('/real_time_map')
    @login_required
    def real_time_map():
        stations = get_all_stations()
        return render_template('real_time_map.html', stations=stations)

    @app.route('/api/stations')
    @login_required
    def api_stations():
        try:
            with open('static/Estaciones_Troncales_de_TRANSMILENIO.geojson', 'r', encoding='utf-8') as f:
                geojson_data = json.load(f)
                stations = [{
                    'nombre': feature['properties']['nombre_estacion'],
                    'troncal': feature['properties'].get('troncal_estacion', 'N/A'),
                    'latitude': feature['geometry']['coordinates'][1],
                    'longitude': feature['geometry']['coordinates'][0]
                } for feature in geojson_data['features']]
                return jsonify(stations)
        except Exception as e:
            app.logger.error(f"Error en /api/stations: {str(e)}")
            return jsonify({'error': 'Error al cargar las estaciones'}), 500

    @app.route('/incidents')
    @login_required
    def get_incidents():
        try:
            query = Incident.query
            troncal = request.args.get('troncal')
            station = request.args.get('station')
            incident_type = request.args.get('incident_type')

            with open('static/Estaciones_Troncales_de_TRANSMILENIO.geojson', 'r', encoding='utf-8') as f:
                geojson_data = json.load(f)

            if troncal and troncal != 'all':
                stations_for_troncal = [feature['properties']['nombre_estacion']
                                       for feature in geojson_data['features']
                                       if feature['properties'].get('troncal_estacion') == troncal]
                query = query.filter(Incident.nearest_station.in_(stations_for_troncal))
            if station and station != 'all':
                query = query.filter(Incident.nearest_station == station)
            if incident_type and incident_type != 'all':
                query = query.filter(Incident.incident_type == incident_type)

            station_stats = db.session.query(
                Incident.nearest_station,
                func.count(Incident.id).label('total')
            ).group_by(Incident.nearest_station) \
                .order_by(desc(func.count(Incident.id))) \
                .all()

            station_counts = {stat.nearest_station: stat.total for stat in station_stats}

            incidents = query.all()
            return jsonify([{
                'id': i.id,
                'incident_type': i.incident_type,
                'latitude': i.latitude,
                'longitude': i.longitude,
                'timestamp': i.timestamp.isoformat(),
                'nearest_station': i.nearest_station,
                'description': i.description,
                'station_total_incidents': station_counts.get(i.nearest_station, 0)
            } for i in incidents])
        except Exception as e:
            app.logger.error(f"Error en /incidents: {str(e)}")
            return jsonify({'error': 'Error al cargar los incidentes'}), 500

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
        try:
            troncal = request.args.get('troncal', '')
            station = request.args.get('station', '')
            incident_type = request.args.get('incident_type', '')

            app.logger.info(f"Parámetros recibidos en /api/notifications:")
            app.logger.info(f"- Troncal: {troncal}")
            app.logger.info(f"- Estación: {station}")
            app.logger.info(f"- Tipo de incidente: {incident_type}")

            query = Incident.query.order_by(Incident.timestamp.desc())

            troncal_list = [t.strip() for t in troncal.split(',') if t.strip()]
            station_list = [s.strip() for s in station.split(',') if s.strip()]
            type_list = [t.strip() for t in incident_type.split(',') if t.strip()]

            app.logger.info("Listas de filtros procesadas:")
            app.logger.info(f"- Troncales: {troncal_list}")
            app.logger.info(f"- Estaciones: {station_list}")
            app.logger.info(f"- Tipos: {type_list}")

            if troncal_list:
                with open('static/Estaciones_Troncales_de_TRANSMILENIO.geojson', 'r', encoding='utf-8') as f:
                    geojson_data = json.load(f)
                    stations_for_troncal = [
                        feature['properties']['nombre_estacion']
                        for feature in geojson_data['features']
                        if feature['properties'].get('troncal_estacion') in troncal_list
                    ]
                    app.logger.info(f"Estaciones encontradas para troncales: {stations_for_troncal}")
                    query = query.filter(Incident.nearest_station.in_(stations_for_troncal))

            if station_list:
                app.logger.info(f"Filtrando por estaciones: {station_list}")
                query = query.filter(Incident.nearest_station.in_(station_list))

            if type_list:
                app.logger.info(f"Filtrando por tipos: {type_list}")
                query = query.filter(Incident.incident_type.in_(type_list))

            incidents = query.limit(100).all()
            app.logger.info(f"Total de incidentes encontrados: {len(incidents)}")

            result = [{
                'id': incident.id,
                'incident_type': incident.incident_type,
                'description': incident.description,
                'nearest_station': incident.nearest_station,
                'timestamp': incident.timestamp.isoformat(),
                'troncal': next(
                    (feature['properties'].get('troncal_estacion')
                     for feature in json.load(open('static/Estaciones_Troncales_de_TRANSMILENIO.geojson', 'r', encoding='utf-8'))['features']
                     if feature['properties'].get('nombre_estacion') == incident.nearest_station),
                    'N/A'
                )
            } for incident in incidents]

            app.logger.info("Respuesta JSON generada exitosamente")
            return jsonify(result)

        except Exception as e:
            app.logger.error(f"Error en /api/notifications: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/vapid-public-key')
    def get_vapid_public_key():
        return os.environ.get('VAPID_PUBLIC_KEY', '')

    @app.route('/push/subscribe', methods=['POST'])
    @login_required
    def push_subscribe():
        subscription_info = request.get_json()
        try:
            with db.session.begin_nested():
                device = PushSubscription(
                    subscription_info=json.dumps(subscription_info),
                    user_id=current_user.id if current_user.is_authenticated else None
                )
                db.session.add(device)
            return jsonify({'success': True})
        except sql_exceptions.IntegrityError:
            return jsonify({'success': True, 'message': 'Subscription already exists'}), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @app.route('/test_notification')
    @login_required
    def test_notification():
        app.logger.info("Probando notificación")
        try:
            test_prediction = {
                'station': 'Estación de Prueba',
                'incident_type': 'Prueba',
                'predicted_time': datetime.now().isoformat(),
                'risk_score': 0.8
            }
            # socketio ya está importado correctamente al inicio del archivo
            socketio.emit('prediction_alert', test_prediction)
            return jsonify({'success': True, 'message': 'Notificación de prueba enviada'})
        except Exception as e:
            app.logger.error(f"Error al enviar notificación de prueba: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/training-history')
    @login_required
    def api_training_history():
        """
        Endpoint para obtener el historial de entrenamiento del modelo.
        """
        try:
            app.logger.info("Solicitud de historial de entrenamiento recibida")
            
            # Ruta a los archivos de entrenamiento
            base_dir = os.path.dirname(os.path.abspath(__file__))
            training_history_path = os.path.join(base_dir, 'models', 'training_history.json')
            training_report_path = os.path.join(base_dir, 'models', 'training_report.json')
            model_path = os.path.join(base_dir, 'models', 'rnn_model.h5')
            
            # Inicializar respuesta por defecto
            response_data = {
                'status': 'not_trained',
                'last_trained': None,
                'epochs_trained': 0,
                'needs_retraining': False,
                'days_since_training': 0,
                'final_metrics': {
                    'loss': None,
                    'val_loss': None,
                    'accuracy': None,
                    'val_accuracy': None
                },
                'learning_summary': {
                    'loss_trend': 'unknown',
                    'accuracy_trend': 'unknown',
                    'overfitting_analysis': 'No hay datos suficientes para análisis'
                }
            }
            
            # Verificar si el modelo existe
            if os.path.exists(model_path):
                response_data['status'] = 'trained'
                
                # Leer el reporte de entrenamiento
                if os.path.exists(training_report_path):
                    with open(training_report_path, 'r', encoding='utf-8') as f:
                        training_report = json.load(f)
                        
                        timestamp_str = training_report.get('timestamp')
                        response_data['last_trained'] = timestamp_str
                        response_data['epochs_trained'] = training_report.get('convergence', {}).get('final_epoch', 0)
                        
                        # Calcular días desde el último entrenamiento
                        if timestamp_str:
                            try:
                                from datetime import datetime
                                last_training_date = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                                current_date = datetime.now()
                                days_diff = (current_date - last_training_date).days
                                response_data['days_since_training'] = days_diff
                                
                                # Determinar si necesita reentrenamiento (más de 7 días)
                                response_data['needs_retraining'] = days_diff > 7
                            except Exception as e:
                                app.logger.warning(f"Error calculando días desde entrenamiento: {e}")
                                response_data['days_since_training'] = 0
                                response_data['needs_retraining'] = False
                        
                        metrics = training_report.get('metrics', {})
                        response_data['final_metrics'] = {
                            'loss': metrics.get('loss'),
                            'val_loss': metrics.get('val_loss'),
                            'accuracy': metrics.get('accuracy'),
                            'val_accuracy': metrics.get('val_accuracy')
                        }
                
                # Leer el historial de entrenamiento para análisis de tendencias
                if os.path.exists(training_history_path):
                    with open(training_history_path, 'r', encoding='utf-8') as f:
                        history = json.load(f)
                        
                        # Analizar tendencias de pérdida
                        if 'loss' in history and len(history['loss']) > 1:
                            loss_values = history['loss']
                            if loss_values[-1] < loss_values[0]:
                                response_data['learning_summary']['loss_trend'] = 'decreasing'
                            else:
                                response_data['learning_summary']['loss_trend'] = 'increasing'
                        
                        # Analizar tendencias de precisión
                        if 'accuracy' in history and len(history['accuracy']) > 1:
                            acc_values = history['accuracy']
                            if acc_values[-1] > acc_values[0]:
                                response_data['learning_summary']['accuracy_trend'] = 'increasing'
                            else:
                                response_data['learning_summary']['accuracy_trend'] = 'decreasing'
                        
                        # Análisis de sobreajuste
                        if ('val_loss' in history and 'loss' in history and 
                            len(history['val_loss']) > 0 and len(history['loss']) > 0):
                            
                            final_train_loss = history['loss'][-1] if history['loss'] else 0
                            final_val_loss = history['val_loss'][-1] if history['val_loss'] else 0
                            
                            if final_val_loss > final_train_loss * 1.2:
                                response_data['learning_summary']['overfitting_analysis'] = 'Posible sobreajuste detectado: la pérdida de validación es significativamente mayor que la de entrenamiento'
                            elif final_val_loss > final_train_loss * 1.1:
                                response_data['learning_summary']['overfitting_analysis'] = 'Ligero sobreajuste: diferencia moderada entre pérdidas de entrenamiento y validación'
                            else:
                                response_data['learning_summary']['overfitting_analysis'] = 'Buen balance: no se detecta sobreajuste significativo'
                        else:
                            response_data['learning_summary']['overfitting_analysis'] = 'No hay datos de validación disponibles para análisis'
            
            app.logger.info(f"Historial de entrenamiento enviado - Estado: {response_data['status']}")
            return jsonify(response_data)
            
        except Exception as e:
            app.logger.error(f"Error al obtener historial de entrenamiento: {str(e)}", exc_info=True)
            return jsonify({
                'error': 'Error al cargar el historial de entrenamiento',
                'status': 'error'
            }), 500
    
    @app.route('/api/retrain-model', methods=['POST'])
    @login_required
    def retrain_model():
        """Endpoint para reentrenar el modelo manualmente"""
        try:
            # Solo permitir a administradores
            if not current_user.is_admin:
                return jsonify({
                    'error': 'No tienes permisos para reentrenar el modelo',
                    'status': 'unauthorized'
                }), 403
            
            app.logger.info(f"Reentrenamiento manual iniciado por usuario: {current_user.username}")
            
            # Importar y ejecutar el entrenamiento
            import subprocess
            import threading
            
            def run_training():
                """Ejecuta el entrenamiento en un hilo separado"""
                try:
                    result = subprocess.run(
                        ["python", "train_model.py"], 
                        capture_output=True, 
                        text=True,
                        timeout=3600  # Timeout de 1 hora
                    )
                    app.logger.info(f"Resultado entrenamiento manual: {result.stdout}")
                    if result.stderr:
                        app.logger.error(f"Errores en entrenamiento: {result.stderr}")
                except Exception as e:
                    app.logger.error(f"Error en entrenamiento manual: {str(e)}", exc_info=True)
            
            # Ejecutar en hilo separado para no bloquear la respuesta
            training_thread = threading.Thread(target=run_training)
            training_thread.daemon = True
            training_thread.start()
            
            return jsonify({
                'message': 'Reentrenamiento iniciado correctamente',
                'status': 'started',
                'info': 'El proceso puede tardar varios minutos. Revisa los logs para seguimiento.'
            }), 200
            
        except Exception as e:
            app.logger.error(f"Error al iniciar reentrenamiento: {str(e)}", exc_info=True)
            return jsonify({
                'error': 'Error al iniciar el reentrenamiento',
                'status': 'error'
            }), 500

    return app


def predict_station_risk(station, hour):
    try:
        from ml_models import predict_station_risk as ml_predict_station_risk
        return ml_predict_station_risk(station, hour)
    except Exception as e:
        logging.error(f"Error predicting risk for station {station}: {str(e)}")
        import random
        return random.uniform(0.1, 1.0)


def predict_incident_type(station, hour):
    try:
        from ml_models import predict_incident_type as ml_predict_incident_type
        return ml_predict_incident_type(station, hour)
    except Exception as e:
        logging.error(f"Error predicting incident type for station {station}: {str(e)}")
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