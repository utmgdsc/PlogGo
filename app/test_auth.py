import pytest
from flask import json
from app import create_app, mongo
from app.models import User

@pytest.fixture
def client():
    # set tup flask test client
    app = create_app(testing=True)
    client = app.test_client()
    yield client
    
def test_register(client):
    # test user registration
    response = client.post('/register', json= {
        'username': 'testuser',
        'password': 'testpassword'
    })

    assert response.status_code == 201
    assert b"User registered successfully" in response.data

    # verify the user exists in the database
    user = mongo.db.users.find_one({'username': 'testuser'})
    assert user is not None
    assert user['username'] == 'testuser'

def test_register_duplicate_username(client):
    # register first user
    client.post('/register', json={
        'username': 'testuser',
        'password': 'testpassword'
    })

    # try to register the same user again
    response = client.post('/register', json={
        'username': 'testuser',
        'password': 'testpassword'
    })

    assert response.status_code == 400
    assert b"Username already exists" in response.data

def test_login(client):
    # register a user first
    client.post('/register', json={
        'username': 'testuser',
        'password': 'testpassword'
    })

    # try to login using the same username and password
    response = client.post('/login', json={
        'username': 'testuser', 
        'password': 'testpassword'
    })

    assert response.status_code == 200
    assert b"access_token" in response.data
    token = json.loads(response.data)['access_token']

    # verify that the token is a valid JWT token
    assert token is not None

def test_login_invalid_credentials(client):
    # register a user first
    client.post('/register', json={
        'username': 'testuser',
        'password': 'testpassword'
    })

    # try to login using the wrong password
    response = client.post('/login', json={
        'username': 'testuser',
        'password': 'wrongpassword'
    })

    assert response.status_code == 401
    assert b"Invalid username of password" in response.data



