from flask import Flask, request, jsonify
from pymongo import MongoClient
from dotenv import load_dotenv
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta, datetime, timezone
import os
import base64
import certifi
import uuid
from flask_cors import CORS
from classifier import classify_litter
import os
import base64
from datetime import datetime, timezone

from flask_jwt_extended import JWTManager
from flask_jwt_extended import create_access_token

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
app.config["DEBUG"] = True
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
    print(uri)
    # check if the username and password match
    user_profile = db.user_authentication.find_one({'auth_email': email})
    
    if not user_profile :
        return jsonify(message="Invalid email or password"), 401
    elif user_profile and not check_password_hash(user_profile.get('auth_password', ''), password):
        return jsonify(message="Invalid email or password"), 401
    else:
        # retrieve user id
        uid = user_profile.get('user_id')

        # generate a unique session id
        session_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, email))

        # record session starting time
        start_time = datetime.now(timezone.utc)

        # record session details
        db.session.insert_one({
            'session_id': session_id,
            'user_id': uid,
            'start_time': start_time,
            'end_time': None, 
            'elapsed_time': None
        })

        # create JWT token
        access_token = create_access_token(identity=email, additional_claims={'user_id': uid, 'session_id': session_id})
        return jsonify(access_token=access_token), 200

# logout route
@app.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    # get jwt token
    claim = get_jwt()
    session_id = claim.get('session_id')

    # check if session id is generated
    if not session_id:
        return jsonify(message="Session ID missing from token"), 55
    
    # record logout time
    end_time = datetime.now(timezone.utc)

    # fetch the session details from db to calculate elapsed time
    session_data = db.session.find_one({'session_id': session_id})

    # check if session is recorded
    if not session_data:
        return jsonify(message="Session not found"), 55

    start_time = session_data['start_time'].astimezone(timezone.utc)

    elapsed_time = (end_time - start_time).total_seconds()

    # update session info with end_time and elapsed_time
    db.session.update_one(
        {'session_id': session_id}, 
        {'$set': {'end_time': end_time, 'elapsed_time': elapsed_time}}
    )

    jti = get_jwt()["jti"] # get unique JWT ID
    exp = get_jwt()["exp"] # get the expiration time

    # store the token in database
    db.token_blacklist.insert_one({
        "jti": jti, 
        "exp": datetime.fromtimestamp(exp, tz=timezone.utc)
    })
    
    return jsonify(message="Successfully logged out", elapsed_time=elapsed_time), 200

@jwt.token_in_blocklist_loader
def check_if_token_is_blacklisted(jwt_header, jwt_payload):
    jti=jwt_payload["jti"]
    return db.token_blacklist.find_one({"jti": jti}) is not None

@app.route('/user/sessions', methods=['GET'])
@jwt_required()
def get_user_sessions():
    uid = get_jwt_identity()['user_id']
    sessions = list(db.session.find({'user_id': uid, 'end_time': None}, {'_id': 0}))
    return jsonify(sessions=sessions), 200

@app.route('/logout/session/<session_id>', methods=['POST'])
@jwt_required()
def logout_specific_session(session_id):
    uid = get_jwt_identity()['user_id']

    # ensure session belongs to authenticated user
    session_data = db.session.find_one({'session_id': session_id, 'user_id': uid})
    if not session_data:
        return jsonify(message="Session not found or authoriszed"), 403

    end_time = datetime.now(timezone.utc)
    elapsed_time = end_time - session_data['start_time']

    # update session as logged out
    db.session.update_one(
        {'session_id': session_id}, 
        {'$set': {'end_time': end_time, 'elapsed_time': elapsed_time}}
    )

    return jsonify(message="Session logged out", session_id=session_id), 200

@app.route('/protected', methods=['GET'])
@jwt_required()
def protected():
    identity = get_jwt_identity()
    return jsonify({"message": "Access granted", "user_id": identity['user_id']}), 200

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
    
    # generate a unique user id
    uid = str(uuid.uuid4())

    # hash the password
    hashed_password = generate_password_hash(password)

    # save user registered data to database
    db.user_authentication.insert_one({
        'user_id': uid,
        'auth_email': email, 
        'auth_password': hashed_password
    })
    return jsonify(message="User registered successfully", user_id=uid), 201


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