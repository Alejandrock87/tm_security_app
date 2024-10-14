from flask import render_template, flash, redirect, url_for, request, jsonify
from flask_login import login_user, logout_user, current_user, login_required
from urllib.parse import urlparse
from forms import LoginForm, RegistrationForm, IncidentReportForm
from incident_utils import get_incidents_for_map, get_incident_statistics
from utils import send_notification, send_push_notification
from datetime import datetime
from ml_models import predict_incident_probability, get_incident_trends, get_model_insights
import logging
from models import User, Incident
from database import db
from transmilenio_api import get_all_stations, get_route_information

def init_routes(app):
    @app.route('/')
    @app.route('/index')
    def index():
        return render_template('index.html', title='Home')

    @app.route('/login', methods=['GET', 'POST'])
    def login():
        if current_user.is_authenticated:
            return redirect(url_for('index'))
        form = LoginForm()
        if form.validate_on_submit():
            user = User.query.filter_by(username=form.username.data).first()
            if user is None or not user.check_password(form.password.data):
                flash('Invalid username or password')
                return redirect(url_for('login'))
            login_user(user, remember=form.remember_me.data)
            next_page = request.args.get('next')
            if not next_page or urlparse(next_page).netloc != '':
                next_page = url_for('index')
            return redirect(next_page)
        return render_template('login.html', title='Sign In', form=form)

    @app.route('/logout')
    def logout():
        logout_user()
        return redirect(url_for('index'))

    @app.route('/register', methods=['GET', 'POST'])
    def register():
        if current_user.is_authenticated:
            return redirect(url_for('index'))
        form = RegistrationForm()
        if form.validate_on_submit():
            user = User(username=form.username.data, email=form.email.data)
            user.set_password(form.password.data)
            db.session.add(user)
            db.session.commit()
            flash('Congratulations, you are now a registered user!')
            return redirect(url_for('login'))
        return render_template('register.html', title='Register', form=form)

    @app.route('/report_incident', methods=['GET', 'POST'])
    @login_required
    def report_incident():
        form = IncidentReportForm()
        if form.validate_on_submit():
            latitude = request.form.get('latitude')
            longitude = request.form.get('longitude')
            if not latitude or not longitude:
                flash('Location data is required. Please enable geolocation in your browser.')
                return redirect(url_for('report_incident'))
            
            incident = Incident(incident_type=form.incident_type.data,
                                description=form.description.data,
                                latitude=float(latitude),
                                longitude=float(longitude),
                                user_id=current_user.id,
                                nearest_station=request.form.get('nearest_station'))
            db.session.add(incident)
            db.session.commit()
            flash('Incident reported successfully!')
            
            send_notification(incident.incident_type, incident.timestamp.isoformat())
            
            device_token = "simulated_device_token"
            send_push_notification(incident.incident_type, incident.timestamp.isoformat(), device_token)
            
            return redirect(url_for('index'))
        return render_template('report_incident.html', title='Report Incident', form=form)

    @app.route('/dashboard')
    @login_required
    def dashboard():
        try:
            logging.info("Fetching data for dashboard")
            incidents = get_incidents_for_map()
            logging.info(f"Fetched {len(incidents)} incidents")
            
            statistics = get_incident_statistics()
            logging.info("Fetched incident statistics")
            
            trends = get_incident_trends()
            logging.info("Fetched incident trends")
            
            model_insights = get_model_insights()
            logging.info("Fetched model insights")
            
            return render_template('dashboard.html', 
                                   incidents=incidents, 
                                   statistics=statistics,
                                   trends=trends,
                                   model_insights=model_insights)
        except Exception as e:
            logging.error(f"Error in dashboard route: {str(e)}")
            flash("An error occurred while loading the dashboard. Please try again later.", "error")
            return redirect(url_for('index'))

    @app.route('/model_insights')
    @login_required
    def model_insights():
        try:
            insights = get_model_insights()
            return render_template('model_insights.html', insights=insights)
        except Exception as e:
            logging.error(f"Error in model_insights route: {str(e)}")
            flash("An error occurred while loading model insights. Please try again later.", "error")
            return redirect(url_for('dashboard'))

    @app.route('/real_time_map')
    @login_required
    def real_time_map():
        return render_template('real_time_map.html')

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