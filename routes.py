from flask import render_template, flash, redirect, url_for, request, jsonify
from flask_login import login_user, logout_user, current_user, login_required
from urllib.parse import urlparse
from forms import LoginForm, RegistrationForm, IncidentReportForm
from utils import get_incidents_for_map, get_incident_statistics
from datetime import datetime
from ml_models import predict_incident_probability, get_incident_trends, get_model_insights
import logging
from models import User, Incident
from database import db

logging.basicConfig(filename='app.log', level=logging.ERROR)

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
            return redirect(url_for('index'))
        return render_template('report_incident.html', title='Report Incident', form=form)

    @app.route('/dashboard')
    @login_required
    def dashboard():
        incidents = get_incidents_for_map()
        statistics = get_incident_statistics()
        trends = {}
        model_insights = {}
        
        try:
            trends = get_incident_trends()
        except Exception as e:
            logging.error(f"Error in get_incident_trends: {str(e)}", exc_info=True)
            flash("An error occurred while fetching incident trends. Some data may not be displayed correctly.", "warning")
        
        try:
            model_insights = get_model_insights()
        except Exception as e:
            logging.error(f"Error in get_model_insights: {str(e)}", exc_info=True)
            flash("An error occurred while fetching model insights. Some data may not be displayed correctly.", "warning")
        
        return render_template('dashboard.html', 
                               incidents=incidents, 
                               statistics=statistics,
                               trends=trends,
                               model_insights=model_insights)

    @app.route('/api/incidents')
    def get_incidents():
        incidents = get_incidents_for_map()
        return jsonify(incidents)

    @app.route('/api/statistics')
    def get_statistics():
        statistics = get_incident_statistics()
        return jsonify(statistics)

    @app.route('/predict', methods=['POST'])
    @login_required
    def predict_incident():
        data = request.json
        probability = predict_incident_probability(
            data['latitude'],
            data['longitude'],
            data['hour'],
            data['day_of_week'],
            data['month'],
            data['nearest_station']
        )
        return jsonify(probability)

    @app.route('/model_insights')
    @login_required
    def model_insights():
        try:
            insights = get_model_insights()
            if isinstance(insights, str):
                flash(insights, "warning")
                return render_template('model_insights.html', title='Model Insights', insights=None)
            return render_template('model_insights.html', title='Model Insights', insights=insights)
        except Exception as e:
            logging.error(f"Error in model_insights route: {str(e)}", exc_info=True)
            flash("An error occurred while fetching model insights. Please try again later.", "error")
            return render_template('model_insights.html', title='Model Insights', insights=None)
