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

# load env variables
load_dotenv()

# initialize MongoDB connection
uri = os.getenv("MONGO_URI")
client = MongoClient(uri)
db = client["PlogGo"]

# set up JWT
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
app.config["DEBUG"] = True
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
    print(user)
    if not user :
        return jsonify(message="Invalid email or password"), 401
    elif user and not check_password_hash(user.get('password', ''), password):
        return jsonify(message="Invalid email or password"), 401
    else:
        # create JWT token
        access_token = create_access_token(identity=email)
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
    if db.user.find_one({'email': email}):
        return jsonify(message="Email already exists"), 400

    # hash the password
    hashed_password = generate_password_hash(password)

    # save user registered data to database
    id = db.user.insert_one({
        'email': email, 
        'password': hashed_password
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
@jwt_required('headers')
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
            "username": user['user_id'],
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
@jwt_required()
def get_milestone():
    print(get_jwt_identity())
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