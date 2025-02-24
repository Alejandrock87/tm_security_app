from app import app
from models import User
from database import db

def create_test_user():
    with app.app_context():
        # Verificar si el usuario ya existe
        if not User.query.filter_by(username='testuser').first():
            user = User(username='testuser', email='test@example.com')
            user.set_password('testpass123')
            db.session.add(user)
            db.session.commit()
            print("Usuario de prueba creado exitosamente")
        else:
            print("El usuario de prueba ya existe")

if __name__ == '__main__':
    create_test_user()
