import pytest
from app import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_health_check(client):
    """Test that the health check endpoint returns 200 and correct status"""
    rv = client.get('/health')
    assert rv.status_code == 200
    assert rv.json == {"status": "application running"}

def test_success_log(client):
    """Test the success endpoint generates an INFO log correctly"""
    rv = client.get('/success')
    assert rv.status_code == 200
    assert b"Success" in rv.data

def test_error_log(client):
    """Test the error endpoint returns bad request 400"""
    rv = client.get('/error')
    assert rv.status_code == 400
    assert b"Error" in rv.data

def test_load_counter(client):
    """Test the load endpoint properly increments its counter"""
    rv1 = client.get('/load')
    assert rv1.status_code == 200
    rv2 = client.get('/load')
    assert rv2.status_code == 200
    assert rv1.data != rv2.data # Check counter has incremented
