import socketio
import eventlet
import os
import uuid
import jwt
from pymongo import MongoClient
from dotenv import load_dotenv
from datetime import datetime
from utils.helper import haversine_distance
# Load environment variables
load_dotenv()

# Initialize MongoDB connection
uri = os.getenv("MONGO_URI")
client = MongoClient(uri)
db = client["PlogGo"]

# JWT secret key - should match your auth server
JWT_SECRET = os.getenv("JWT_SECRET_KEY", "default_secret_key")

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
def start_tracking(sid, data):
    """
    Start a tracking session, authenticate with JWT token.
    If user has an existing session ID, use it; otherwise generate a new one.
    """
    print("Received start_tracking event")
    
    # Get JWT token
    token = data.get("token")
    if not token:
        sio.emit("error", {"message": "Missing authentication token"}, room=sid)
        return
    
    try:
        # Verify JWT token
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        print("payload", payload)
        user_id = payload.get("jti")
        # Find user in database
        user = db.user.find_one({"_id": user_id})
        if not user:
            sio.emit("error", {"message": "User not found"}, room=sid)
            return
        
        # Get existing session ID or generate a new one
        session_id = user.get("session_id")
        
        if not session_id:
            # Generate new session ID
            session_id = str(uuid.uuid4())
            # Save session ID to user record
            db.user.update_one({"_id": user_id}, {"$set": {"session_id": session_id}})
            print(f"Generated new session ID: {session_id}")
        else:
            print(f"Using existing session ID: {session_id}")
        
        # Initialize session data
        sessions[session_id] = {
            "user_id": user_id,
            "route": [],
            "start_time": datetime.now(),
            "end_time": None,
            "total_distance": 0,
            "steps": 0
        }
        
        print(f"User {user_id} started tracking. Session: {session_id}")
        
        # Send session ID back to client
        sio.emit("session_id", {"sessionId": session_id}, room=sid)
        
    except jwt.InvalidTokenError:
        sio.emit("error", {"message": "Invalid authentication token"}, room=sid)
    except Exception as e:
        print(f"Error starting tracking: {str(e)}")
        sio.emit("error", {"message": "Failed to start tracking"}, room=sid)

@sio.event
def location_update(sid, data):
    """Handle real-time location updates."""
    session_id = data.get("sessionId")
    latitude = data.get("latitude")
    longitude = data.get("longitude")
    timestamp = data.get("timestamp")
    
    if not session_id:
        sio.emit("error", {"message": "Session ID is required"}, room=sid)
        return
    
    if session_id not in sessions:
        sio.emit("error", {"message": "Invalid session ID"}, room=sid)
        return
    
    if latitude is None or longitude is None:
        sio.emit("error", {"message": "Latitude and longitude are required"}, room=sid)
        return
    
    try:
        session = sessions[session_id]
        
        # Add location to route
        location_point = {
            "latitude": latitude,
            "longitude": longitude,
            "timestamp": datetime.fromtimestamp(timestamp / 1000) if timestamp else datetime.now()
        }
        
        session["route"].append(location_point)
        
        # Update total distance
        if len(session["route"]) > 1:
            prev_location = session["route"][-2]
            distance = haversine_distance(
                latitude, longitude,
                prev_location["latitude"], prev_location["longitude"]
            )
            session["total_distance"] += distance
            
            # Estimate steps based on distance (approximately 0.8m per step)
            session["steps"] += int(distance / 0.8)
            
            print(f"Location update for session {session_id}: {latitude}, {longitude}. Distance: +{distance:.2f}m, Total: {session['total_distance']:.2f}m")
        else:
            print(f"First location recorded for session {session_id}: {latitude}, {longitude}")
        
    except Exception as e:
        print(f"Error processing location update: {str(e)}")
        sio.emit("error", {"message": f"Failed to update location: {str(e)}"}, room=sid)

@sio.event
def finish_tracking(sid, data):
    """
    End a tracking session and save the collected data.
    Remove the session ID from the user document.
    """
    session_id = data.get("sessionId")
    
    if not session_id:
        sio.emit("error", {"message": "Session ID is required"}, room=sid)
        return
    
    if session_id not in sessions:
        sio.emit("error", {"message": "Invalid session ID"}, room=sid)
        return
    
    try:
        # Set end time
        sessions[session_id]["end_time"] = datetime.now()
        
        # Save session to database
        session_data = sessions[session_id].copy()
        
        # Convert datetime objects to strings for MongoDB
        if session_data["start_time"]:
            session_data["start_time"] = session_data["start_time"].isoformat()
        if session_data["end_time"]:
            session_data["end_time"] = session_data["end_time"].isoformat()
        
        # Convert route timestamps to strings
        for point in session_data["route"]:
            if "timestamp" in point and isinstance(point["timestamp"], datetime):
                point["timestamp"] = point["timestamp"].isoformat()
        
        # Save to MongoDB
        result = db['plogging_session'].insert_one(session_data)
        
        # Remove session ID from user document
        db.user.update_one({"_id": session_data["user_id"]}, {"$unset": {"session_id": ""}})
        
        # Calculate metrics
        duration_seconds = (sessions[session_id]["end_time"] - sessions[session_id]["start_time"]).total_seconds()
        distance_km = sessions[session_id]["total_distance"] / 1000
        steps = sessions[session_id]["steps"]
        
        # Clean up session
        del sessions[session_id]
        
        print(f"Session {session_id} completed and saved to database. ID: {result.inserted_id}")
        
        # Send completion response with metrics
        sio.emit("tracking_completed", {
            "message": "Tracking session completed successfully",
            "duration": duration_seconds,
            "distance": distance_km,
            "steps": steps,
            "session_id": str(result.inserted_id)
        }, room=sid)
        
    except Exception as e:
        print(f"Error finishing tracking: {str(e)}")
        sio.emit("error", {"message": "Failed to complete tracking session"}, room=sid)

# For backward compatibility with the current implementation
@sio.event
def authenticate(sid, data):
    """Legacy authentication method, redirects to start_tracking."""
    print("Received legacy authenticate event, redirecting to start_tracking")
    start_tracking(sid, data)

@sio.event
def start_time(sid, data):
    """Legacy start_time event, now just acknowledges."""
    session_id = data.get("sessionId")
    if session_id in sessions:
        print(f"Received legacy start_time event for session {session_id}")
        sio.emit("time_started", {"startTime": int(sessions[session_id]["start_time"].timestamp() * 1000)}, room=sid)
    else:
        sio.emit("error", {"message": "Session not found"}, room=sid)

@sio.event
def end_time(sid, data):
    """Legacy end_time event, redirects to finish_tracking."""
    print("Received legacy end_time event, redirecting to finish_tracking")
    finish_tracking(sid, data)

# Run WebSocket server
if __name__ == "__main__":
    port = int(os.getenv("WS_PORT", 5001))
    host = os.getenv("WS_HOST", "0.0.0.0")
    
    print(f"Starting Socket.IO server on {host}:{port}")
    eventlet.wsgi.server(eventlet.listen((host, port)), app)
