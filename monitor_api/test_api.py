import pytest
import os
from api import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_home_check(client):
    """Test base default endpoint is working"""
    rv = client.get('/')
    assert rv.status_code == 200
    assert b"Monitoring API Running" in rv.data

def test_summary_format(client):
    """Test the summary aggregator returns valid valid dictionary breakdown"""
    rv = client.get('/summary')
    assert rv.status_code == 200
    # Log counts are dynamic, we just ensure it returns a valid dict type
    assert type(rv.json) == dict

def test_logs_endpoint(client):
    """Test log list endpoint operates correctly list format"""
    rv = client.get('/logs')
    assert rv.status_code == 200
    assert type(rv.json) == list

def test_clear_logs(client):
    """Test the newly added DELETE logs functionality successfully triggers"""
    rv = client.delete('/logs')
    assert rv.status_code == 200
    assert rv.json == {"status": "cleared"}
