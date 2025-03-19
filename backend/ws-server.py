import socketio
import eventlet
import os
import uuid
from pymongo import MongoClient
from dotenv import load_dotenv
from datetime import datetime
from utils.helper import haversine_distance  # Ensure this function exists

# Load environment variables
load_dotenv()

# Initialize MongoDB connection
uri = os.getenv("MONGO_URI")
client = MongoClient(uri)
db = client["PlogGo"]

# Initialize SocketIO standalone server
sio = socketio.Server(cors_allowed_origins="*")
app = socketio.WSGIApp(sio)

# In-memory session tracking
sessions = {}

@sio.event
def connect(sid, environ):
    """Handle new WebSocket connection."""
    print(f"Client {sid} connected.")

@sio.event
def disconnect(sid):
    """Handle WebSocket disconnection."""
    print(f"Client {sid} disconnected.")

@sio.event
def authenticate(sid, data):
    """Authenticate user and create a session."""
    email = data.get("email")
    if not email:
        sio.emit("error", {"message": "Invalid email"}, room=sid)
        return

    user = db.user.find_one({"email": email})
    if not user:
        sio.emit("error", {"message": "User not found"}, room=sid)
        return

    # Assign or generate session ID
    session_id = user.get("session_id", str(uuid.uuid4()))
    db.user.update_one({"email": email}, {"$set": {"session_id": session_id}})

    # Initialize session data
    sessions[session_id] = {
        "user_id": user["_id"],
        "route": [],
        "start_time": None,
        "end_time": None,
        "total_distance": 0,
        "steps": 0
    }

    print(f"User {email} authenticated. Session started: {session_id}")
    sio.emit("authenticated", {"session_id": session_id}, room=sid)

@sio.event
def start_time(sid, data):
    """Store session start time."""
    session_id = data.get("session_id")
    if session_id in sessions:
        sessions[session_id]["start_time"] = datetime.now()
        sio.emit("time_started", {"start_time": sessions[session_id]["start_time"]}, room=sid)
    else:
        sio.emit("error", {"message": "Session not found"}, room=sid)

@sio.event
def end_time(sid, data):
    """Store session end time and save session data to MongoDB."""
    session_id = data.get("session_id")
    if session_id in sessions:
        sessions[session_id]["end_time"] = datetime.now()

        # Save to MongoDB
        db['plogging_session'].insert_one(sessions[session_id])
        sio.emit("session_ended", {"message": "Session ended", "session_data": sessions[session_id]}, room=sid)
        
        print(f"Session {session_id} ended.")
    else:
        sio.emit("error", {"message": "Session not found"}, room=sid)

@sio.event
def location_update(sid, data):
    """Handle real-time location updates."""
    session_id = data.get("session_id")
    latitude = data.get("latitude")
    longitude = data.get("longitude")

    if session_id in sessions:
        session = sessions[session_id]
        session["route"].append({
            "latitude": latitude,
            "longitude": longitude,
            "timestamp": datetime.now()
        })

        # Update total distance
        if len(session["route"]) > 1:
            prev_location = session["route"][-2]
            session["total_distance"] += haversine_distance(
                latitude, longitude,
                prev_location["latitude"], prev_location["longitude"]
            )

        print(f"Received location update: {latitude}, {longitude}")
    else:
        sio.emit("error", {"message": "Session not found"}, room=sid)

# Run WebSocket server
if __name__ == "__main__":
    eventlet.wsgi.server(eventlet.listen(("0.0.0.0", 5001)), app)
