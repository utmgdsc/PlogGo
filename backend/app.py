from flask import Flask, request, jsonify
from pymongo import MongoClient
from dotenv import load_dotenv
from classifier import classify_litter
import os
import base64

app = Flask(__name__)

# Load environment variables
load_dotenv()

# Get MongoDB URI
mongo_uri = os.getenv("MONGO_URI")

# Connect to MongoDB
client = MongoClient(mongo_uri)
db = client["PlogGo"]

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
@app.route('/session/history', methods=['POST'])
def store_session_history():
    pass


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
