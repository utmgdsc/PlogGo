from flask import Flask, request, jsonify
from pymongo import MongoClient
from dotenv import load_dotenv
from flask_cors import CORS
from classifier import classify_litter
import os
import base64
from datetime import datetime, timezone

from flask_jwt_extended import JWTManager
from flask_jwt_extended import create_access_token
from werkzeug.security import generate_password_hash, check_password_hash
import os
import certifi

# initalize Flask app
app = Flask(__name__)
CORS(app)

# load env variables
load_dotenv()

# initialize MongoDB connection
uri = os.getenv("MONGO_URI")
client = MongoClient(uri, tlsCAFile=certifi.where())
db = client["PlogGo"]

# set up JWT
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
jwt = JWTManager(app)

### all the routes will expect a JSON body ###
### all the routes will return a JSON response ###

# Authentication
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


@app.route('/logout', methods=['POST'])
def logout():
    pass


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


# Update user information (Profile), user needs to be authenticated
@app.route('/user/update', methods=['PUT'])
def update_user():
    pass


# Fetching user data from db, user needs to be authenticated
@app.route('/user/data', methods=['GET'])
def get_user_data():
    pass


# Get current daily challenge (pick randomly 1 challenge from challenges db), user needs to be authenticated
@app.route('/daily-challenge', methods=['GET'])
def get_daily_challenge():
    pass


# Return the classification of the litter
@app.route('/classify-litter', methods=['POST'])
def classify_litter():
    pass


# Store the litter data in the database
@app.route('/store-litter', methods=['POST'])
def store_litter():
    try:
        data = request.json  # Expecting JSON body
        if 'image' not in data:
            return jsonify({'error': 'Missing image field'}), 400

        image_data = base64.b64decode(data['image'])  # Decode Base64
        classification = classify_litter(image_data) 
        with open("received.jpg", "wb") as f:
            f.write(image_data)
        return jsonify({'classification': 'classification'})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Store user session history (distance, activities, etc.)
@app.route('/session', methods=['POST'])
def store_session_history():
    try:
        # Retrieve data from the request body (JSON)
        data = request.json
        if not data:
            return jsonify({'error': 'No data received'}), 400

        # Validate if required fields are present (adjust based on your requirements)
        required_fields = ['routes', 'distancesTravelled', 'steps', 'timeStart', 'timeEnd','elapsedTime', 'userid', 'sessionid']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing {field} field'}), 400

        # Assuming session data looks like: { "distance": 123.4, "activities": ["running", "cycling"] }
        print(data)
        session_data = {
            "userid": data['userid'],
            "sessionid": data['sessionid'],
            "startTime": datetime.fromtimestamp(data['timeStart']//1000, tz=timezone.utc),
            "endTime": datetime.fromtimestamp(data['timeEnd']//1000, tz=timezone.utc),
            "elapsedTime": data['elapsedTime'],
            "routes": data['routes'],
            "distancesTravelled": data['distancesTravelled'],
            "steps": data['steps'],
        }

        # Insert the session data into MongoDB collection
        result = db['session'].insert_one(session_data)
        print('inserted', result.inserted_id, 'to session collection')
        # Return a success response with inserted session ID
        return jsonify({'message': 'data stored successfully'}), 200

    except Exception as e:
        print("Error storing session history:", e)  # Log the error
        return jsonify({'error': str(e)}), 500
    


# Fetch current user session history, user needs to be authenticated
@app.route('/session/history', methods=['GET'])
def get_session_history():
    pass


# Fetch posts from another user
@app.route('/social-media/posts', methods=['GET'])
def fetch_social_media_posts():
    pass


# Create a new post for the current user
@app.route('/social-media/posts', methods=['POST'])
def create_social_media_post():
    pass


# Fetch badges from the current user, user doesn't need to be authenticated
@app.route('/user/badges', methods=['GET'])
def fetch_user_badges():
    pass


# Fetch user milestones (completed challenges, etc), user doesn't need to be authenticated
@app.route('/user/milestones', methods=['GET'])
def fetch_user_milestones():
    pass


# Fetch user profile
@app.route('/user/<id>', methods=['GET'])
def get_user(id):
    pass


if __name__ == '__main__':
    app.run(debug=True)