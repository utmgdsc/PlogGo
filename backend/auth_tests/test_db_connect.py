from pymongo import MongoClient
from dotenv import load_dotenv
import certifi
import os

load_dotenv()


def test_mongo_connection():
    # Get MongoDB URI from environment variable
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")

    try:
        # Attempt to connect to MongoDB
        client = MongoClient(mongo_uri, tlsCAFile=certifi.where())  # 5-second timeout
        db = client.admin  # Connect to the admin database to run a basic command

        # Check if the connection is successful
        db.command("ping")

        print("✅ MongoDB connection successful!")
    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")

if __name__ == "__main__":
    test_mongo_connection()
