from app import app, db
from models import User

def main():
    with app.app_context():
        users = User.query.all()
        print('Usuarios en la base de datos:')
        for user in users:
            print(f'Usuario: {user.username}, Hash: {user.password_hash}')

if __name__ == '__main__':
    main()
