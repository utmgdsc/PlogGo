from flask import Blueprint, Flask, request, jsonify
from flask_socketio import SocketIO, emit
from pymongo import MongoClient
from dotenv import load_dotenv
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta, datetime, timezone
import os
import base64
import certifi
from flask_cors import CORS
from utils.classifier import classify_litter
from utils.helper import *
import uuid 

# initalize Flask app
api = Blueprint('api', __name__, url_prefix='/api')
app = Flask(__name__)
CORS(app)

# Set up Flask-SocketIO
socketio = SocketIO(app, cors_allowed_origins="*")  # Allow connections from any origin

# load env variables
load_dotenv()

# initialize MongoDB connection
uri = os.getenv("MONGO_URI")
client = MongoClient(uri)
db = client["PlogGo"]

# set up JWT
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=1) # set time limit for token
jwt = JWTManager(app)

sessions = {}

def validate_jwt(token):
    """Manually validate a JWT token."""
    try:
        decoded_token = jwt.decode(token, os.getenv("JWT_SECRET_KEY"))
        jti = decoded_token["jti"]
        # Check if token is revoked
        if jti in db.token_blacklist.find_one({'jti': jti}):
            return None, "Token has been revoked"

        return decoded_token, None  # Valid token
    except jwt.ExpiredSignatureError:
        return None, "Token has expired"
    except jwt.InvalidTokenError:
        return None, "Invalid token"
 
def get_current_user():
    email = get_jwt_identity()
    if not email:
        return None
    jid = get_jwt()['jti']
    if jid in db.token_blacklist.find_one({'jti': jid}):
        return None
    return db.user.find_one({email}), email
    
# WebSocket route to handle WebSocket events
@socketio.on('connect')
def handle_connect():
    print("A new WebSocket connection has been established.")

@socketio.on('disconnect')
def handle_disconnect(data):
    print("A WebSocket connection has been disconnected.")

@socketio.on('authenticate')
def handle_authenticate(data):
    """ Authenticate the user and store session data """
    user,email = get_current_user()
    if not user:
        emit("error", {"message": "Invalid token"})
        return
    
    # Check if the user has an active session
    session_id = user.get('session_id')
    if not user.get('session_id'): # User might have started a session before 
        session_id = str(uuid.uuid4())
        db.user.update_one({email}, {'$set': {session_id}})
    
    # Start a new session for the user
    if not sessions[session_id]:
        sessions[session_id] = {
            "user_id": user["_id"],
            "route": [],
            "start_time": None,
            "end_time": None,
            "total_distance": 0,
            "steps": 0
        }
    
    # Send the session ID to the client
    print(f"User {email} authenticated and session started.")
    emit("authenticated", {"message": "Authentication successful", "session_id": session_id})

@socketio.on('start_time')
def handle_start_time(data):
    """ Store start time for the session """
    session_id = data.get("session_id")
    if sessions[session_id]["start_time"] is not None:
        sessions[session_id]["start_time"] = datetime.now()
        emit("time_started", {"message": "Session started", "start_time": sessions[session_id]["start_time"]})
    else:
        emit("error", {"message": "Session not found"})

@socketio.on('end_time')
def handle_end_time(data):
    """ Store end time and session info when the session ends """
    session_id = data.get("session_id")
    end_time = data.get("endTime")
    if session_id in sessions:
        sessions[session_id]["end_time"] = end_time
        data = sessions[session_id]
        new_badges = db.badge.find({"steps_required": {"$lte": data['steps']}})
        
        # Update Badges
        badge_ids = [badge["_id"] for badge in new_badges]
        if badge_ids:
            print("New badges:", badge_ids)
            db.user.update_one(
                {"_id": data["user_id"]}, 
                {"$addToSet": {"badges": {"$each": badge_ids}}}  # Add badges without duplicates
            )
            print("Badges awarded!")
        
        # Update Streaks
        user = db.user.find_one({'_id': data["user_id"]})
        last_date = user['last_plog_date']
        user_highest_streak = user['highest_streak'] if user['highest_streak'] else 0
        if last_date is None or last_date - datetime.now().date() > 1:
            db.user.update_one(
                {"_id": data["user_id"]},
                {"$inc": {"streak": 1, "last_plog_date": datetime.now().date(), "highest_streak": max(user_highest_streak, 1)}}
            )
        elif last_date == datetime.now().date() + 1 : # streak ended
            db.user.update_one(
                {"_id": data["user_id"]},
                {"$set": {"streak": user['streak']+1, "last_plog_date": datetime.now().date(), "highest_streak": max(user_highest_streak, user['streak']+1)}}
            )
        
        
        # Insert the session data into MongoDB collection
        result = db['plogging_session'].insert_one(sessions['session_id'])
        print('inserted', result.inserted_id, 'to session collection')
        # Calculate total distance and steps here, if needed
        emit("session_ended", {"message": "Session ended", "end_time": end_time, "session_data": sessions[session_id]})
        print(f"Session {session_id} ended at {end_time}")
    else:
        emit("error", {"message": "Session not found"})

@socketio.on('location_update')
def handle_location_update(data):
    """ Handle location updates from the frontend """
    session_id = data.get("session_id")
    latitude = data.get("latitude")
    longitude = data.get("longitude")
    timestamp = data.get("timestamp")

    if session_id in sessions:
        session = sessions[session_id]
        routes = session["route"]
        routes.append({
            "latitude": latitude,
            "longitude": longitude,
            "timestamp": timestamp
        })
        n = len(routes)
        if n > 1:
            session["total_distance"] += haversine_distance(latitude, longitude,routes[n-2]["latitude"], routes[n-2, "longitude"] )  # Update total distance
        print(f"Received location update: {latitude}, {longitude} at {timestamp}")
        
    else:
        emit("error", {"message": "Session not found"})

### all the routes will expect a JSON body ###
### all the routes will return a JSON response ###

# Authentication
# login route
@api.route('/login', methods=['POST'])
def login():
    if not request.is_json:
        return jsonify(message="Missing JSON in request"),405

    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    if not email or not password:
        return jsonify(message="Missing email or password"), 400
    # check if the username and password match
    user = db.user.find_one({'email': email})
    
    if not user :
        return jsonify(message="Invalid email or password"), 401
    elif user and not check_password_hash(user.get('auth_password', ''), password):
        return jsonify(message="Invalid email or password"), 401
    else:
        # create JWT token
        access_token = create_access_token(identity=email, additional_claims={'user_id': uid})
        return jsonify(access_token=access_token), 200

# logout route
@app.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    # get jwt token
    claim = get_jwt()
    jti = get_jwt()["jti"] # get unique JWT ID

    # store the token in database
    db.token_blacklist.insert_one({
        "jti": jti, 
    })
    
    return jsonify(message="Successfully logged out"), 200

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
@api.route('/register', methods=['POST'])
def register():    
    # retrieve email and password submission
    data = request.get_json()
    if not data:
        return jsonify(message="Missing JSON in request"),

    email = data.get('email')
    password = data.get('password')
    if not email or not password:
        return jsonify(message="Missing email or password"), 400

    # check if the username already exists
    if db.user_authentication.find_one({'auth_email': email}):
        return jsonify(message="Email already exists"), 400

    # hash the password
    hashed_password = generate_password_hash(password)

    # save user registered data to database
    id = db.user_authentication.insert_one({
        'auth_email': email, 
        'auth_password': hashed_password
    })
    return jsonify(message="User registered successfully", user_id=id), 201


# Update user information (Profile), user needs to be authenticated
@api.route('/user', methods=['PUT'])
@jwt_required()
def update_user():
    pass

@api.route('/badge', methods=['GET'])
@jwt_required()
def get_badge():
    badges_id = db.user.find_one({'email': get_jwt_identity()}).badges
    badges = []
    for badge_id in badges_id:
        badge = db.badge.find_one({'_id': badge_id})
        badges.append(badge)
    return jsonify({'badges': badges}), 200

@api.route('/leaderboard', methods=['GET'])
def get_leaderboard():
    metric = request.args.get('metric', 'total_steps')
    count = int(request.args.get('count', '10'))
    try:
        count = int(count)  # Convert to int safely
    except ValueError:
        return jsonify({"error": "Invalid count parameter"}), 400
    users = db.user.find().sort(metric, -1).limit(count)
    leaderboard = []
    for user in users:
        leaderboard.append({
            "name": user['name'],
            "email": user['email'],
            "username": user['username'],
            "total_steps": user.get('total_steps', 0),
            "total_distance": user.get('total_distance', 0),
            "total_time": user.get('total_time', 0),
        })
    return jsonify({'metric': metric, 'leaderboard': leaderboard}), 200
    

# Fetching user data from db, user needs to be authenticated
@api.route('/user/data', methods=['GET'])
@jwt_required()
def get_user_data():
        return jsonify({'message': get_jwt_identity()}), 200


@api.route('/milestone', methods=['GET'])
def get_milestone():
    user = db.user.find_one({'email': get_jwt_identity()})
    milestone = {'total_steps': user.total_steps, 'total_distance': user.total_distance, 'total_time': user.total_time}
    return jsonify({'milestone': milestone}), 200

# Get current daily challenge (pick randomly 1 challenge from challenges db)
@api.route('/daily-challenge', methods=['GET'])
def get_daily_challenge():
    challenge = db.challenges.aggregate([{"$sample": {"size": 1}}])
    return jsonify({'challenge': challenge}), 200


# Return the classification of the litter
@api.route('/classify-litter', methods=['POST'])
def classify_litter():
    pass


# Store the litter data in the database
@api.route('/store-litter', methods=['POST'])
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
@api.route('/end_session', methods=['POST'])
@jwt_required()
def store_session_history():
    try:
        # Retrieve data from the request body (JSON)
        user = db.user.find_one({'email': get_jwt_identity()})
        data = request.json
        if not data:
            return jsonify({'error': 'No data received'}), 400

        # Validate if required fields are present (adjust based on your requirements)
        required_fields = ['routes', 'distancesTravelled', 'steps', 'timeStart', 'timeEnd','elapsedTime', 'userid', 'sessionid']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing {field} field'}), 400

        # Assuming session data looks like: { "distance": 123.4, "activities": ["running", "cycling"] }
        session_data = {
            "startTime": datetime.fromtimestamp(data['timeStart']//1000, tz=timezone.utc),
            "endTime": datetime.fromtimestamp(data['timeEnd']//1000, tz=timezone.utc),
            "elapsedTime": data['elapsedTime'],
            "routes": data['routes'],
            "distancesTravelled": data['distancesTravelled'],
            "steps": data['steps'],
        }
        
        user.total_steps += data['steps']
        user.total_distance += data['distancesTravelled']
        user.total_time += data['elapsedTime']
        
        # Check badges
        new_badges = db.badge.find({"steps_required": {"$lte": data['steps']}})
        badge_ids = [badge["_id"] for badge in new_badges]
        print("New badges:", badge_ids)
        if badge_ids:
            db.users.update_one(
                {"_id": data["user_id"]}, 
                {"$addToSet": {"badges": {"$each": badge_ids}}}  # Add badges without duplicates
            )
            print("Badges awarded!")
        
        # user.
        
        # Insert the session data into MongoDB collection
        result = db['plogging_session'].insert_one(session_data)
        print('inserted', result.inserted_id, 'to session collection')
        # Return a success response with inserted session ID
        return jsonify({'message': 'data stored successfully'}), 200

    except Exception as e:
        print("Error storing session history:", e)  # Log the error
        return jsonify({'error': str(e)}), 500

app.register_blueprint(api)

if __name__ == '__main__':
   
    app.run(host='0.0.0.0', port=5000, debug=True)