import pytest
from app import app
import json
from datetime import datetime, timedelta
import logging
from models import User, db, Incident

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

@pytest.fixture
def test_client():
    """Create a test client"""
    with app.test_client() as testing_client:
        with app.app_context():
            # Create all database tables
            db.create_all()
            yield testing_client
            db.session.remove()
            db.drop_all()

@pytest.fixture
def test_user(test_client):
    """Create a test user for authentication"""
    with app.app_context():
        user = User(username='test_user', email='test@example.com')
        user.set_password('test_password')
        db.session.add(user)
        db.session.commit()
        yield user
        db.session.delete(user)
        db.session.commit()

@pytest.fixture
def authenticated_client(test_client, test_user):
    """Create an authenticated client session"""
    test_client.post('/login', data={
        'username': 'test_user',
        'password': 'test_password'
    }, follow_redirects=True)
    return test_client

@pytest.fixture
def sample_incidents(test_client, test_user):
    """Create sample incidents for testing predictions"""
    with app.app_context():
        # Crear 30 incidentes para una estación específica
        station = "Pepe Sierra"
        base_time = datetime.now() - timedelta(days=30)

        for i in range(30):
            incident = Incident(
                incident_type="Hurto" if i % 2 == 0 else "Acoso",
                description=f"Incidente de prueba {i}",
                latitude=4.6097,  # Coordenadas de prueba para Bogotá
                longitude=-74.0817,
                user_id=test_user.id,
                nearest_station=station,
                timestamp=base_time + timedelta(days=i)
            )
            db.session.add(incident)

        db.session.commit()
        yield
        # Limpiar datos de prueba
        Incident.query.delete()
        db.session.commit()

def test_predictions_endpoint(authenticated_client, sample_incidents):
    """Test the predictions endpoint basic functionality"""
    logger.info("Testing predictions endpoint")
    response = authenticated_client.get('/api/predictions')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert isinstance(data, list)

    if len(data) > 0:
        prediction = data[0]
        required_fields = ['station', 'incident_type', 'predicted_time', 'risk_score', 'latitude', 'longitude']
        for field in required_fields:
            assert field in prediction

        # Validar tipos de datos
        assert isinstance(prediction['station'], str)
        assert isinstance(prediction['incident_type'], str)
        assert isinstance(prediction['risk_score'], float)
        assert 0 <= prediction['risk_score'] <= 1

        # Validar formato de tiempo
        predicted_time = datetime.fromisoformat(prediction['predicted_time'])
        assert predicted_time > datetime.now() - timedelta(hours=1)
        assert predicted_time < datetime.now() + timedelta(hours=4)

def test_predictions_error_handling(authenticated_client):
    """Test error handling in predictions endpoint"""
    logger.info("Testing predictions error handling")
    # Simular error de archivo no encontrado
    app.config['GEOJSON_PATH'] = 'nonexistent.geojson'
    response = authenticated_client.get('/api/predictions')
    assert response.status_code == 500
    data = json.loads(response.data)
    assert 'error' in data
    assert 'details' in data

def test_predictions_cache(authenticated_client, sample_incidents):
    """Test prediction caching functionality"""
    logger.info("Testing predictions caching")
    # Primera llamada
    response1 = authenticated_client.get('/api/predictions')
    assert response1.status_code == 200
    data1 = json.loads(response1.data)

    # Segunda llamada inmediata (debería usar caché)
    response2 = authenticated_client.get('/api/predictions')
    assert response2.status_code == 200
    data2 = json.loads(response2.data)

    # Las respuestas deberían ser idénticas si se usa caché
    assert data1 == data2

def test_prediction_data_validation(authenticated_client, sample_incidents):
    """Test data validation in predictions"""
    logger.info("Testing prediction data validation")
    response = authenticated_client.get('/api/predictions')
    assert response.status_code == 200
    data = json.loads(response.data)

    if len(data) > 0:
        for prediction in data:
            # Validar coordenadas
            assert isinstance(prediction['latitude'], (int, float))
            assert isinstance(prediction['longitude'], (int, float))
            assert -90 <= prediction['latitude'] <= 90
            assert -180 <= prediction['longitude'] <= 180

            # Validar riesgo
            assert 0 <= prediction['risk_score'] <= 1

            # Validar tipos de incidentes válidos
            valid_types = ['Hurto', 'Acoso', 'Accidente', 'Otro']
            assert prediction['incident_type'] in valid_types