import pytest
from app import app
import json
from datetime import datetime, timedelta
import logging
from models import User, db, Incident

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

@pytest.fixture(scope='session')
def test_client():
    """Create a test client"""
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://localhost/test_db'
    with app.test_client() as testing_client:
        with app.app_context():
            # Create all database tables
            db.create_all()
            yield testing_client
            db.session.remove()
            db.drop_all()

@pytest.fixture(scope='session')
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

@pytest.fixture(scope='session')
def authenticated_client(test_client, test_user):
    """Create an authenticated client session"""
    test_client.post('/login', data={
        'username': 'test_user',
        'password': 'test_password'
    }, follow_redirects=True)
    return test_client

@pytest.fixture(scope='function')
def sample_incidents(test_client, test_user):
    """Create sample incidents for testing predictions"""
    logger.info("Creating sample incidents for testing")
    with app.app_context():
        # Crear suficientes incidentes para el entrenamiento del modelo
        stations = ["Pepe Sierra", "Calle 100", "Virrey"]
        base_time = datetime.now() - timedelta(days=30)
        incident_types = ["Hurto", "Acoso", "Accidente", "Otro"]

        try:
            # Limpiar datos anteriores
            Incident.query.delete()
            db.session.commit()
            logger.info("Cleaned previous test data")

            total_incidents = 0
            # Crear nuevos incidentes
            for station in stations:
                logger.info(f"Creating incidents for station: {station}")
                for incident_index in range(100):  # 100 incidentes por estación
                    incident = Incident(
                        incident_type=incident_types[incident_index % len(incident_types)],
                        description=f"Incidente de prueba {incident_index} en {station}",
                        latitude=4.6097 + (incident_index * 0.0001),
                        longitude=-74.0817 + (incident_index * 0.0001),
                        user_id=test_user.id,
                        nearest_station=station,
                        timestamp=base_time + timedelta(
                            days=incident_index//4,
                            hours=incident_index%24
                        )
                    )
                    db.session.add(incident)
                    total_incidents += 1

                    if incident_index > 0 and incident_index % 50 == 0:  # Commit cada 50 registros
                        db.session.commit()
                        logger.info(f"Committed {incident_index} incidents for station {station}")

                # Commit final para esta estación
                db.session.commit()
                logger.info(f"Finished creating incidents for station {station}")

            # Verificar la creación
            verification_count = Incident.query.count()
            logger.info(f"Verification: Total incidents in database: {verification_count}")
            assert verification_count == total_incidents, f"Expected {total_incidents} incidents, but found {verification_count}"

            # Verificar distribución por estación
            for station in stations:
                station_count = Incident.query.filter_by(nearest_station=station).count()
                logger.info(f"Station {station} has {station_count} incidents")
                assert station_count == 100, f"Expected 100 incidents for station {station}, but found {station_count}"

            yield

            # Limpiar datos de prueba
            Incident.query.delete()
            db.session.commit()
            logger.info("Cleaned up test data")

        except Exception as e:
            logger.error(f"Error creating sample incidents: {str(e)}")
            db.session.rollback()
            raise

def test_predictions_endpoint(authenticated_client, sample_incidents):
    """Test the predictions endpoint basic functionality"""
    logger.info("Testing predictions endpoint")
    with app.app_context():
        try:
            response = authenticated_client.get('/api/predictions')
            assert response.status_code == 200
            data = json.loads(response.data)
            assert isinstance(data, list)
            logger.info(f"Received {len(data)} predictions")

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

        except Exception as e:
            logger.error(f"Error in test_predictions_endpoint: {str(e)}")
            raise

def test_predictions_error_handling(authenticated_client):
    """Test error handling in predictions endpoint"""
    logger.info("Testing predictions error handling")
    with app.app_context():
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
    with app.app_context():
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
    with app.app_context():
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

def test_no_historical_data(authenticated_client):
    """Test behavior when there is no historical data"""
    logger.info("Testing predictions with no historical data")
    with app.app_context():
        # Asegurar que no hay datos históricos
        Incident.query.delete()
        db.session.commit()

        response = authenticated_client.get('/api/predictions')
        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'error' in data
        assert 'No hay predicciones disponibles' in data['error']

def test_invalid_authentication(test_client):
    """Test predictions endpoint with invalid authentication"""
    logger.info("Testing predictions with invalid authentication")
    with app.app_context():
        response = test_client.get('/api/predictions')
        assert response.status_code == 302  # Redirección a login
        assert '/login' in response.location

def test_multiple_predictions_same_station(authenticated_client, sample_incidents):
    """Test multiple predictions for the same station"""
    logger.info("Testing multiple predictions for same station")
    with app.app_context():
        response = authenticated_client.get('/api/predictions')
        assert response.status_code == 200
        data = json.loads(response.data)

        # Agrupar predicciones por estación
        predictions_by_station = {}
        for prediction in data:
            station = prediction['station']
            if station not in predictions_by_station:
                predictions_by_station[station] = []
            predictions_by_station[station].append(prediction)

        # Verificar que las predicciones para la misma estación son diferentes
        for station, predictions in predictions_by_station.items():
            if len(predictions) > 1:
                # Las predicciones deben tener diferentes tiempos
                times = [p['predicted_time'] for p in predictions]
                assert len(set(times)) == len(times), f"Predicciones duplicadas para estación {station}"

def test_model_prediction_consistency(authenticated_client, sample_incidents):
    """Test consistency of model predictions"""
    logger.info("Testing model prediction consistency")
    with app.app_context():
        # Hacer dos llamadas con suficiente tiempo entre ellas
        response1 = authenticated_client.get('/api/predictions')
        data1 = json.loads(response1.data)

        # Esperar un momento y hacer otra llamada
        import time
        time.sleep(1)

        response2 = authenticated_client.get('/api/predictions')
        data2 = json.loads(response2.data)

        # Las predicciones deberían ser similares pero no idénticas
        if len(data1) > 0 and len(data2) > 0:
            # Comparar predicciones para la misma estación
            station = data1[0]['station']
            pred1 = next((p for p in data1 if p['station'] == station), None)
            pred2 = next((p for p in data2 if p['station'] == station), None)

            if pred1 and pred2:
                # Los scores de riesgo no deberían variar dramáticamente
                assert abs(pred1['risk_score'] - pred2['risk_score']) < 0.5