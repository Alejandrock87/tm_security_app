from extensions import db
from sqlalchemy.orm import DeclarativeBase
from contextlib import contextmanager

class Base(DeclarativeBase):
    pass

def init_db(app):
    db.init_app(app)

@contextmanager
def transaction_context():
    try:
        yield
        db.session.commit()
    except:
        db.session.rollback()
        raise
    finally:
        db.session.close()