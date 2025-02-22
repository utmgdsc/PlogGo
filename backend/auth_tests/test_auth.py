import pytest
from flask import json
from backend.app import app, db
from dotenv import load_dotenv

load_dotenv()

@pytest.fixture
def client():
    app.config["TESTING"] = True
    client = app.test_client()

    # Cleanup before running tests
    db.user_authentication.delete_many({'auth_email': 'testuser@gmail.com'})

    yield client

    # Cleanup after tests
    db.user_authentication.delete_many({'auth_email': 'testuser@gmail.com'})

def test_register(client):
    response = client.post('/register', json={
        'email': 'testuser@gmail.com',
        'password': 'testpassword'
    })

    assert response.status_code == 201
    assert b"User registered successfully" in response.data

    user = db.user_authentication.find_one({'auth_email': 'testuser@gmail.com'})  # Fixed collection name
    assert user is not None
    assert user['auth_email'] == 'testuser@gmail.com'

def test_register_duplicate_username(client):
    client.post('/register', json={'email': 'testuser@gmail.com', 'password': 'testpassword'})

    response = client.post('/register', json={'email': 'testuser@gmail.com', 'password': 'testpassword'})

    assert response.status_code == 400
    assert b"Email already exists" in response.data

def test_login(client):
    client.post('/register', json={'email': 'testuser@gmail.com', 'password': 'testpassword'})

    response = client.post('/login', json={'email': 'testuser@gmail.com', 'password': 'testpassword'})

    assert response.status_code == 200

    data = json.loads(response.data)
    assert "access_token" in data
    assert data["access_token"] is not None

def test_login_invalid_credentials(client):
    client.post('/register', json={'email': 'testuser@gmail.com', 'password': 'testpassword'})

    response = client.post('/login', json={'email': 'testuser@gmail.com', 'password': 'wrongpassword'})

    assert response.status_code == 401
    assert b"Invalid email or password" in response.data
