from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

# Replace with your Mongo URI
uri = "mongodb+srv://nfldty:GAx4aJuymwNUKOgE@ploggo.qm3fx.mongodb.net/?retryWrites=true&w=majority&appName=PlogGo"

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

