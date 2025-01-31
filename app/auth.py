from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from .models import User
import datetime

# create blueprint object
auth_bp = Blueprint('auth', __name__)

# registration route
@auth_bp.route('/register', methods=['POST'])
def register():
    data= request.get_json()
    username = data.get('username')
    password = data.get('password')

    # check if the username already exists
    if User.find_by_username(username):
        return jsonify(message="Username already exists"), 400
    
    # hash the password
    hashed_password = generate_password_hash(password)

    # create and save the user
    user = User(username=username, password=hashed_password)
    user.save_to_db()

    return jsonify(message="User registered successfully"), 201

# login route
@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    # find the user by username
    user = User.find_by_username(username)
    if not user or not check_password_hash(user['password'], password):
        return jsonify(message="Invalid username or password"), 401
    
    # create a JWT token
    access_token = create_access_token(identity=username)
    return jsonify(access_token=access_token), 200

# protected route
# @auth_bp.route('/protected', methods=['POST'])
# @jwt_required()
# def register_litter():

#     return None

