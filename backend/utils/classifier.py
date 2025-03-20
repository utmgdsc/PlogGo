
import base64
import cv2
import numpy as np
from ultralytics import YOLO
model = YOLO("../models/best.pt")
def classify_litter(base64_string):
    # Decode Base64 to bytes
    image_bytes = base64.b64decode(base64_string)
    
    # Convert bytes to a NumPy array
    nparr = np.frombuffer(image_bytes, np.uint8)

    # Decode the NumPy array into an image using OpenCV
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if image is None:
        raise ValueError("Invalid Base64 string: Unable to decode image.")

    # Run YOLOv8 prediction
    results = model.predict(image)
    classifications = {}
    class_names = model.names  # Get class name mappings
    for result in results:
        for box in result.boxes:
            class_id = int(box.cls[0])  # Get class ID
            class_name = class_names[class_id]  # Convert ID to name
            confidence = float(box.conf[0])  # Get confidence score
            if class_name in classifications:
                classifications[class_name] += 1
            else:
                classifications[class_name] = 1
    return classifications