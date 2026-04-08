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

def test_uptime_endpoint(client):
    """Test that the uptime endpoint returns a non-negative integer"""
    rv = client.get('/uptime')
    assert rv.status_code == 200
    data = rv.get_json()
    assert "uptime_seconds" in data
    assert data["uptime_seconds"] >= 0

def test_stress_load(client):
<<<<<<< HEAD
    """Simulate 20 rapid requests to ensure the counter is stable"""
    for _ in range(20):
        rv = client.get('/load')
        assert rv.status_code == 200

    # Verify the counter reached a high number
=======
    """Simulate 50 rapid requests to ensure the counter is thread-safe and reliable"""
    for _ in range(50):
        rv = client.get('/load')
        assert rv.status_code == 200

    # Verify the counter reached at least 50
>>>>>>> origin/main
    rv = client.get('/load')
    data = rv.get_data(as_text=True)
    # Extract number from "Request number X"
    count = int(data.split()[-1])
<<<<<<< HEAD
    assert count >= 20
=======
    assert count >= 50    
>>>>>>> origin/main
