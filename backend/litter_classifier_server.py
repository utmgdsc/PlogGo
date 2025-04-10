from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from utils.classifier import classify_litter
from utils.ps_helper import load_litter_points
import json

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Load the point system for litter types
POINT_SYSTEM = {
    "Aluminium foil": 2,
    "Bottle cap": 3,
    "Bottle": 5,
    "Broken glass": 4,
    "Can": 4,
    "Carton": 3,
    "Cigarette": 6,
    "Cup": 3,
    "Lid": 2,
    "Other litter": 1,
    "Other plastic": 4,
    "Paper": 2,
    "Plastic bag - wrapper": 5,
    "Plastic container": 5,
    "Pop tab": 2,
    "Straw": 4,
    "Styrofoam piece": 5,
    "Unlabeled litter": 1
}

# Alternately, if there's a points file, we could load it like this:
# try:
#     POINT_SYSTEM = load_litter_points("path/to/points/file.txt")
# except Exception as e:
#     print(f"Error loading points system: {e}")

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

@app.route('/classify', methods=['POST'])
def classify_image():
    try:
        data = request.json
        if not data or 'image' not in data:
            return jsonify({'error': 'Missing image data'}), 400

        base64_string = data['image']
        user_id = data.get('user_id', None)  # Optional user ID for logging/tracking

        # Classify the litter in the image
        detection_results = classify_litter(base64_string)
        
        # Calculate points based on the point system
        total_points = sum(POINT_SYSTEM.get(litter_type, 1) * count 
                          for litter_type, count in detection_results.items())
        
        # Prepare the response
        result = {
            "points": total_points,
            "litters": detection_results
        }
        
        return jsonify(result)
    
    except Exception as e:
        print(f"Error in litter classification: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('LITTER_CLASSIFIER_PORT', 5002))
    print(f"Port: {port}")
    debug = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    
    print(f"Starting litter classification server on port {port}")
    print(f"Debug mode: {debug}")
    
    app.run(host='0.0.0.0', port=port, debug=debug) 