import pytest
from flask import json
from backend.ws import app, db
from flask_jwt_extended import decode_token
from dotenv import load_dotenv

load_dotenv()

@pytest.fixture
def client():
    app.config["TESTING"] = True
    client = app.test_client()

    # clean up before running tests
    db.user_authentication.delete_many({'auth_email': 'testuser@gmail.com'})
    db.session.delete_many({'user_id': 'test_user_id'})
    db.token_blacklist.delete_many({})

    # yield Flask test client
    yield client

    # clean up after tests
    db.user_authentication.delete_many({'auth_email': 'testuser@gmail.com'})
    db.session.delete_many({'user_id': 'test_user_id'})
    db.token_blacklist.delete_many({})

def test_register(client):
    response = client.post('/register', json={
        'email': 'testuser@gmail.com',
        'password': 'testpassword'
    })

    assert response.status_code == 201
    assert b"User registered successfully" in response.data

    user = db.user_authentication.find_one({'auth_email': 'testuser@gmail.com'}) 
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

    # check if the session is record 
    user = db.user_authentication.find_one({'auth_email': 'testuser@gmail.com'})
    session = db.session.find_one({'user_id': user['user_id']})
    assert session is not None
    assert session['start_time'] is not None

def test_login_invalid_credentials(client):
    client.post('/register', json={'email': 'testuser@gmail.com', 'password': 'testpassword'})

    response = client.post('/login', json={'email': 'testuser@gmail.com', 'password': 'wrongpassword'})

    assert response.status_code == 401
    assert b"Invalid email or password" in response.data

def test_logout(client):
    client.post('/register', json={'email': 'testuser@gmail.com', 'password': 'testpassword'})
    login_response = client.post('/login', json={'email': 'testuser@gmail.com', 'password': 'testpassword'})

    assert login_response.status_code == 200
    data = json.loads(login_response.data)
    assert "access_token" in data

    access_token = data["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    # logout request
    logout_response = client.post('/logout', headers=headers)
    assert logout_response.status_code == 200
    assert b"Successfully logged out" in logout_response.data

    # decode JWT and check blacklist status
    with app.app_context():
        decode_jwt = decode_token(access_token)
        jti = decode_jwt["jti"]

        # check if session is updated
        session_id = decode_jwt['session_id']
        session = db.session.find_one({'session_id': session_id})
        assert session is not None
        assert session['end_time'] is not None
        assert session['elapsed_time'] is not None

        blacklisted_token = db.token_blacklist.find_one({"jti": jti})
        assert blacklisted_token is not None, "Token should be blacklisted after logout"

def test_access_protected_route_after_logout(client):
    client.post('/register', json={'email': 'testuser@gmail.com', 'password': 'testpassword'})
    login_response = client.post('/login', json={'email': 'testuser@gmail.com', 'password': 'testpassword'})

    assert login_response.status_code == 200
    data = json.loads(login_response.data)
    access_token = data["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    # logout request
    client.post('/logout', headers=headers)

    # try accessing a protected route with the blacklisted token
    protected_response = client.get('/protected', headers=headers)

    assert protected_response.status_code == 401
    assert b"Token has been revoked" in protected_response.data