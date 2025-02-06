from flask import Flask
from flask_pymongo import PyMongo

# setup a basic Flask server
app = Flask(__name__)
app.config['MONGO_URI']="mongodb://localhost:27017/test_ploggo"
mongo=PyMongo(app)

# perform a test query
try:
    mongo.db.users.find_one() # forces a connection
    print("Connected succesfully to MongoDB!")
except Exception as e:
    print(f"Connection failed: {e}")
