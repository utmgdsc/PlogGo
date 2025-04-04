from flask import Blueprint, Flask, request, jsonify
from flask_socketio import SocketIO, emit
from pymongo import MongoClient
from dotenv import load_dotenv
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta, datetime, timezone
import os
import boto3
import base64
from flask_cors import CORS
from utils.classifier import classify_litter
from utils.helper import *
from models.detect import detect_litter_from_base64
from utils.ps_helper import load_litter_points
from collections import Counter
import json

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

# set up boto3 client for S3
s3 = boto3.client('s3',
    region_name=os.getenv("AWS_S3_REGION"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY")
)
bucket_name = os.getenv("AWS_S3_BUCKET_NAME")
region_name = os.getenv("AWS_S3_REGION")

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

    print("JID:", jid)
    if db.token_blacklist.find_one({'jti': jid}) is not None and db.token_blacklist.find_one({'jti': jid}) == jid:
        return None
    return db.user.find_one({'email': email})
    

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
    print(db)
    user = db.user.find_one({'email': email})
    print(user)
    if not user :
        return jsonify(message="Invalid email or password"), 401
    elif user and not check_password_hash(user.get('password', ''), password):
        return jsonify(message="Invalid email or password"), 401
    else:
        # create JWT token
        access_token = create_access_token(identity=email)
        return jsonify(user_id=user.get("user_id"), access_token=access_token), 200

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
        print("Missing email or password")
        return jsonify(message="Missing email or password"), 400

    # check if the username already exists
    if db.user.find_one({'email': email}):
        print("Email already exists")
        return jsonify(message="Email already exists"), 400

    # hash the password
    hashed_password = generate_password_hash(password)

    # create the default values
    # save user registered data to database
    db.user.insert_one({
        'name': 'New User',
        'pfp': 'https://example.com/default_profile_pic.jpg',  # Default profile picture URL
        'description': '',
        'total_steps': 0,
        'total_distance': 0,
        'total_time': 0,
        'total_points': 0,
        'total_litters': 0,
        'streak': 0,
        'highest_streak': 0,
        'user_id': str(db.user.count_documents({}) + 1),  # Unique user ID
        'session_id': str(db.user.count_documents({}) + 1),  # Unique session ID
        'badges': [],
        'email': email,
        'password': hashed_password
    })

    return jsonify({"message":"User registered successfully"}), 201


# Update user information (Profile), user needs to be authenticated
@api.route('/user', methods=['PUT'])
@jwt_required()
def update_user():
    user = db.user.find_one({'email': get_jwt_identity()})
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    data = request.get_json()
    update_fields = {}
    if "name" in data:
        update_fields["name"] = data["name"]
    if "pfp" in data:
        header, encoded = data["pfp"].split(",", 1)
        image_data = base64.b64decode(encoded)

        key = f"profile_pics/{user.get('email')}.jpg"
        s3.put_object(Bucket=bucket_name, Key=key, Body=image_data, ContentType='image/jpeg')

        s3_url = f"https://{bucket_name}.s3.{region_name}.amazonaws.com/{key}"
        update_fields["pfp"] = s3_url
    if "description" in data:
        update_fields["description"] = data["description"]
    if update_fields:
        db.user.update_one({'email': get_jwt_identity()}, {"$set": update_fields})
    
    user.update(update_fields)  
    
    return jsonify({
        "name": user.get("name"),
        "email": user.get("email"),
        "pfp": user.get("pfp",""),
        "description": user.get("description",""),
    }), 200
        

# Get user information (Profile)
@api.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    user = get_current_user()
    if user:
        return jsonify({
            "name": user.get("name"),
            "email": user.get("email"),
            "pfp": user.get("pfp"),
            "description": user.get("description"),
            "streak": user.get("streak"),
            "badges": [{"title":badge.title, "icon":badge.icon} for badge in user.get("badges")]
        }), 200
    return jsonify({"error": "User not found"}), 404

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
@jwt_required()
def get_leaderboard():
    metric = request.args.get('metric', 'total_points')
    count = int(request.args.get('count', '10'))
    try:
        count = int(count)  # Convert to int safely
    except ValueError:
        return jsonify({"error": "Invalid count parameter"}), 400
    users = db.user.find().sort(metric, -1).limit(count)
    leaderboard = []
    for user in users:
        leaderboard.append({
            "email": user['email'],
            metric: user.get(metric, 0),
            "name": user.get('name', '2lazy2setaname')
        })
    return jsonify({'metric': metric, 'leaderboard': leaderboard}), 200
    

# Fetching user data from db, user needs to be authenticated
@api.route('/user/data', methods=['GET'])
@jwt_required()
def get_user_data():
    return jsonify({'message': get_jwt_identity()}), 200


@api.route('/metrics', methods=['GET'])
@jwt_required()
def get_metrics():
    user = db.user.find_one({'email': get_jwt_identity()})
    print("User:", user)
    return jsonify({'time':user.get("total_time"), 
                    'distance':user.get("total_distance"),
                    'steps':user.get("total_steps"),
                    'calories':user.get("total_steps")*0.04,
                    'curr_streak':user.get("streak"),
                    'points':user.get("total_points",0),
                    'litter':user.get("total_litters",0)}), 200 

# Get current daily challenge (pick randomly 1 challenge from challenges db)
@api.route('/daily-challenge', methods=['GET'])
def get_daily_challenge():
    challenge = db.challenges.aggregate([{"$sample": {"size": 1}}])
    return jsonify({'challenge': challenge}), 200 

# Store the litter data in the database
@api.route('/store-litter', methods=['POST'])
def store_litter():
    try:
        data = request.json  # Expecting JSON body
        if 'image' not in data:
            return jsonify({'error': 'Missing image field'}), 400
        results = classify_litter(data['image'])
        points = sum(results.values()) * 10  # 10 points per litter item
        return jsonify({"points":points, "litters":results})

    except Exception as e:
        print(e)
        return jsonify({'error': str(e)}), 500


# Return the points earn of litter detections
@api.route('/detect-litter', methods=['POST'])
@jwt_required()
def detect_litter():
    try:
        data = request.json  # Expect JSON input
        if 'image' not in data:
            return jsonify({'error': 'Missing image field'}), 400

        base64_string = data['image']
        model_path = "/Users/hwey/Desktop/projects/PlogGo/backend/models/best.onnx"  # Change this to your actual model path
        labels_path = "/Users/hwey/Desktop/projects/PlogGo/backend/models/litter_classes.txt"  # Change to the actual labels path

        # Run detection
        detections = detect_litter_from_base64(base64_string, model_path, labels_path)

        # Define the point system for each litter type
        point_sys = {
            "Aluminium foil": 2,
            "Bottle cap": 3,
            "Bottle": 5,
            "Broken glass": 4,
            "Can": 4,
            "Carton": 3,
            "Cigarette": 6,
            "Cup": 3,
            "Lid": 2,
            "Other litter": 1,
            "Other plastic": 4,
            "Paper": 2,
            "Plastic bag - wrapper": 5,
            "Plastic container": 5,
            "Pop tab": 2,
            "Straw": 4,
            "Styrofoam piece": 5,
            "Unlabeled litter": 1
        }

        # Count detected litter
        litter_counts = Counter(detections)

        # calculate the total points
        total_points = sum(point_sys[litter] * count for litter, count in litter_counts.items())

        # Update user points in the database   
        db.user.update_one(
            {'email': get_jwt_identity()},
            {'$inc': {'total_points': total_points, 'total_litters': sum(litter_counts.values())}}
        )

        # Prepare the JSON result
        result = {
            "points": total_points,
            "litter": {litter: count for litter, count in litter_counts.items()}
        }
        
        points_earn = json.dumps(result)

        return points_earn
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