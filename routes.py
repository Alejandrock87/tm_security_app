from flask import render_template, redirect, url_for, flash, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from app import app, db, login_manager
from models import User, Incident
from forms import LoginForm, RegistrationForm, IncidentReportForm
from utils import get_incidents_for_map, get_incident_statistics
from datetime import datetime

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route('/')
@app.route('/index')
def index():
    return render_template('index.html')

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
        return redirect(url_for('index'))
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
        nearest_station = request.form.get('nearest_station')
        if not latitude or not longitude:
            flash('Location data is required. Please enable geolocation in your browser.')
            return render_template('report_incident.html', title='Report Incident', form=form)
        
        incident = Incident(
            incident_type=form.incident_type.data,
            description=form.description.data,
            latitude=float(latitude),
            longitude=float(longitude),
            nearest_station=nearest_station,
            author=current_user,
            timestamp=datetime.utcnow()
        )
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
    return render_template('dashboard.html', incidents=incidents, statistics=statistics)

@app.route('/api/incidents')
def get_incidents():
    incidents = get_incidents_for_map()
    return jsonify(incidents)

@app.route('/api/statistics')
def get_statistics():
    statistics = get_incident_statistics()
    return jsonify(statistics)
