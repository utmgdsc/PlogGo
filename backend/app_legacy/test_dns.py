from flask import Flask
from flask_pymongo import PyMongo

# Initialize Flask app
app = Flask(__name__)

# Replace with your actual MongoDB URI
app.config["MONGO_URI"] = "insert_link_here"

# Initialize PyMongo
mongo = PyMongo(app)

@app.route("/test_db")
def test_db():
    try:
        # Try to insert and retrieve a test document
        test_collection = mongo.db.test_collection
        test_collection.insert_one({"message": "MongoDB connection successful!"})
        
        # Retrieve the inserted document
        result = test_collection.find_one({}, {"_id": 0})  # Exclude _id for simplicity
        return result if result else {"error": "No document found"}

    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    app.run(debug=True)
