# from flask_pymongo import PyMongo

# # set up flask-pymongo ext
# mongo = PyMongo()

# class User:
#     def __init__(self, email, password):
#         self.email = email
#         self.password = password

#     # save registered user info to database
#     def save_to_db(self):
#         mongo.db.users.insert_one({
#             'username': self.email,
#             'password': self.password,
#         })

#     @staticmethod
#     def find_by_email(email):
#         return mongo.db.users.find_one({'email': email})

from datetime import datetime
from bson import ObjectId

# User Profile Table
user_profile_schema = {
    "_id": ObjectId,  # userID (MongoDB's unique identifier)
    "profile": {
        "fullName": str,
        "bio": str,
        "userProfile": str,  # URL to profile picture
        "postIDs": list  # List of posts (ObjectId references)
    },
    "authentication": {
        "email": str,
        "password_hash": str  # Hashed password for security
    },
    "activity": {
        "badges": list,  # Earned badges
        "streakCount": int,  # How many days in a row they participated
        "leaderboardRank": int,  # User’s rank on the leaderboard
        "ploggingSessions": int,  # Number of completed plogging sessions
        "last_active": datetime
    },
    "created_at": datetime
}
