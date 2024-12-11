from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, BooleanField, SubmitField, TextAreaField, SelectField
from wtforms.validators import DataRequired, Email, EqualTo, ValidationError
from models import User

class LoginForm(FlaskForm):
    username = StringField('Nombre de usuario', validators=[DataRequired()])
    password = PasswordField('Contraseña', validators=[DataRequired()])
    remember_me = BooleanField('Recordarme')
    submit = SubmitField('Iniciar sesión')

class RegistrationForm(FlaskForm):
    username = StringField('Nombre de usuario', validators=[DataRequired()])
    email = StringField('Correo electrónico', validators=[DataRequired(), Email()])
    password = PasswordField('Contraseña', validators=[DataRequired()])
    password2 = PasswordField('Repetir contraseña', validators=[DataRequired(), EqualTo('password')])
    submit = SubmitField('Registrarse')

    def validate_username(self, username):
        user = User.query.filter_by(username=username.data).first()
        if user is not None:
            raise ValidationError('Por favor, use un nombre de usuario diferente.')

    def validate_email(self, email):
        user = User.query.filter_by(email=email.data).first()
        if user is not None:
            raise ValidationError('Por favor, use una dirección de correo electrónico diferente.')

class IncidentReportForm(FlaskForm):
    incident_type = SelectField('Tipo de incidente', choices=[
        ('Hurto', 'Hurto'),
        ('Hurto a mano armada', 'Hurto a mano armada'),
        ('Cosquilleo', 'Cosquilleo'),
        ('Ataque', 'Ataque'),
        ('Apertura de Puertas', 'Apertura de Puertas'),
        ('Sospechoso', 'Sospechoso'),
        ('Acoso', 'Acoso')
    ], validators=[DataRequired()])
    description = TextAreaField('Descripción', validators=[DataRequired()])
    incident_date = DateField('Fecha del incidente', validators=[DataRequired()], default=datetime.now)
    incident_time = TimeField('Hora del incidente', validators=[DataRequired()], default=datetime.now)
    station = SelectField('Estación', validators=[DataRequired()])
    submit = SubmitField('Reportar incidente')
