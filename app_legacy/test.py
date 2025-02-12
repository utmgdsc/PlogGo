from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from flask_pymongo import PyMongo

# Replace with your Mongo URI
uri = "insert_uri_here"

try:
    # Create a client and connect to MongoDB
    client = MongoClient(uri)
    
    # Test the connection
    client.admin.command('ping')
    print("Connection successful!")
    
    # Access a database (if exists)
    db = client.get_database("PlogGo")  # Replace with your database name

    print(f"Connected to the database: {db.name}")

    
except ConnectionFailure as e:
    print(f"Could not connect to MongoDB: {e}")

