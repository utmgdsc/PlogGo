from flask import Flask, request, jsonify
from pymongo import MongoClient
from dotenv import load_dotenv
# from classifier import classify_litter
import os
import base64
from utils.to_mongo import *

app = Flask(__name__)

# Load environment variables
load_dotenv()

# Get MongoDB URI
mongo_uri = os.getenv("MONGO_URI")

# Connect to MongoDB
client = MongoClient(mongo_uri, tls=True, tlsAllowInvalidCertificates=True)
db = client["PlogGo"]
# documents = [
#     {"name": "Kimberly", "email": "janesmith@example.com", "age": 25},
#     {"name": "Alice Johnson", "email": "alicej@example.com", "age": 22}
# ]
# result = insert_data_to_mongo(db,documents, "litter")
# print(result)
# dcmnt = [{"_id": result[0], "name": "mew"}]
# update(db, dcmnt, "litter")
# delete_all(db, "litter")

def get_current_user_id(req):
    # TODO : get current user id from the JWT token 
    pass 

def get_current_session_id(req):
    # TODO : get current session id from the JWT token 
    pass

### all the routes will expect a JSON body ###
### all the routes will return a JSON response ###

# Authentication
@app.route('/login', methods=['POST'])
def login():
    pass


@app.route('/logout', methods=['POST'])
def logout():
    pass


@app.route('/register', methods=['POST'])
def register():
    pass


# Update user information (Profile), user needs to be authenticated
@app.route('/user', methods=['PUT'])
def update_user(request):
    user_id = get_current_user_id(request) 
    try:
        data = request.get_json()
        data['_id'] = user_id
        update(db, data, "user_profile")
    except Exception as e:
        return jsonify({"error": str(e)}), 500
        

# Fetching user profile data from db
@app.route('/user', methods=['GET'])
def get_current_user(request):
    user_id = get_current_user_id(request) # Fetch Current user id based on jwt token 
    collection = db['user_profile']
    user_data = collection.find_one({"_id": ObjectId(user_id)}, {"_id": 0})
    return jsonify(user_data)


# Get current daily challenge (pick randomly 1 challenge from challenges db), user needs to be authenticated
@app.route('/daily-challenge', methods=['GET'])
def get_daily_challenge():
    collection = db['challenges']
    daily_challenge = collection.aggregate([{"$sample": {"size": 1}}]).next()  # Get one random challenge
    return jsonify(daily_challenge)

# # Return the classification of the litter
# @app.route('/classify-litter', methods=['POST'])
# def classify_litter():
#     pass


# Store the litter data in the database
@app.route('/store-litter', methods=['POST'])
def store_litter(request):
    try:
        data = request.get_json()  # Expecting JSON body
        if 'image' not in data:
            return jsonify({'error': 'Missing image field'}), 400
        image_data = base64.b64decode(data['image'])  # Decode Base64
        classification = classify_litter(image_data) 
        return jsonify({'classification': classification})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Store user session history (distance, activities, etc.)
@app.route('/history', methods=['POST'])
def store_session_history():
    current_session = get_current_session_id()
    current_user = get_current_user_id()


# Fetch current user session history, user needs to be authenticated
@app.route('/history', methods=['GET'])
def get_session_history():
    current_session = get_current_session_id()
    current_user = get_current_user_id()
    


# Fetch posts from another user
@app.route('/social-media/posts', methods=['GET'])
def fetch_social_media_posts():
    pass


# Create a new post for the current user
@app.route('/social-media/posts', methods=['POST'])
def create_social_media_post():
    pass


# Fetch badges from the current user, user doesn't need to be authenticated
@app.route('/badges', methods=['GET'])
def fetch_user_badges():
    current_user = get_current_user_id()
    # TODO fetch


# Fetch user milestones (completed challenges, etc), user doesn't need to be authenticated
@app.route('/milestones', methods=['GET'])
def fetch_user_milestones():
    pass


# Fetch user profile
@app.route('/user/<id>', methods=['GET'])
def get_user(id):
    collection = db['user_profile']
    user_data = collection.find_one({"_id": ObjectId(id)}, {"_id": 0})
    return jsonify(user_data)


if __name__ == '__main__':
    app.run(debug=True, use_reloader=False)