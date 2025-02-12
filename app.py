from flask import Flask, request, jsonify
from pymongo import MongoClient
from dotenv import load_dotenv
from flask_jwt_extended import JWTManager
from flask_jwt_extended import create_access_token
from werkzeug.security import generate_password_hash, check_password_hash
import os
import certifi

# initalize Flask app
app = Flask(__name__)

# load env variables
load_dotenv()

# initialize MongoDB connection
uri = os.getenv("MONGO_URI")
client = MongoClient(uri, tlsCAFile=certifi.where())
db = client["PlogGo"]

# set up JWT
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
jwt = JWTManager(app)

# registration route
@app.route('/register', methods=['POST'])
def register():    
    # retrieve email and password submission
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    # check if the username already exists
    if db.user_authentication.find_one({'auth_email': email}):
        return jsonify(message="Email already exists"), 400
    else:
        # hash the password
        hashed_password = generate_password_hash(password)

        # save user registered data to database
        db.user_authentication.insert_one({'auth_email': email, 'auth_password': hashed_password})
        return jsonify(message="User registered successfully"), 201

# login route
@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    # check if the username and password match
    user_profile = db.user_authentication.find_one({'auth_email': email})

    # retrieve password from database
    hashed_password = user_profile.get('auth_password', '')
    
    if not user_profile or not check_password_hash(hashed_password, password):
        return jsonify(message="Invalid email or password"), 401
    else:
        # create JWT token
        access_token = create_access_token(identity=email)
        return jsonify(access_token=access_token), 200

if __name__ == '__main__':
    app.run(debug=True)