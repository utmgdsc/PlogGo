import torch
import cv2
import numpy as np
from ultralytics import YOLO

class YOLODetector:
    def __init__(self, weights_path, confidence_threshold=0.5, nms_threshold=0.4):
        """
        Initialize YOLO detector using Ultralytics YOLO
        
        Args:
            weights_path (str): Path to YOLO model weights
            confidence_threshold (float): Minimum confidence to keep detection
            nms_threshold (float): Non-maximum suppression threshold
        """
        # Load the model using Ultralytics
        try:
            self.model = YOLO(weights_path)
        except Exception as e:
            print(f"Error loading model: {e}")
            raise
        
        # Detection parameters
        self.confidence_threshold = confidence_threshold
        self.nms_threshold = nms_threshold
        
        # Get class names from the model
        self.classes = self.model.names

    def detect(self, frame):
        """
        Perform object detection on a frame
        
        Args:
            frame (numpy.ndarray): Input image frame
        
        Returns:
            list: Detected objects with their details
        """
        # Perform detection using Ultralytics YOLO
        results = self.model(frame, conf=self.confidence_threshold, iou=self.nms_threshold)
        
        # Process detections
        detections = []
        for result in results:
            boxes = result.boxes
            for box in boxes:
                # Get bounding box coordinates
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                
                # Get class and confidence
                cls = int(box.cls[0])
                conf = float(box.conf[0])
                
                detections.append({
                    'class': self.classes[cls],
                    'confidence': conf,
                    'bbox': [x1, y1, x2, y2]
                })
        
        return detections

    def visualize_detections(self, frame, detections):
        """
        Draw bounding boxes and labels on the frame
        
        Args:
            frame (numpy.ndarray): Input frame
            detections (list): List of detected objects
        
        Returns:
            numpy.ndarray: Frame with visualizations
        """
        # Generate a color palette
        np.random.seed(42)
        colors = np.random.randint(0, 255, size=(len(self.classes), 3))

        for det in detections:
            x1, y1, x2, y2 = map(int, det['bbox'])
            class_name = det['class']
            confidence = det['confidence']
            
            # Get color for this class
            class_index = list(self.classes.keys())[list(self.classes.values()).index(class_name)]
            color = tuple(map(int, colors[class_index]))
            
            # Draw bounding box
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            
            # Draw label
            label = f"{class_name}: {confidence:.2f}"
            cv2.putText(frame, label, (x1, y1 - 10), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2)
        
        return frame

def main():
    # Initialize video capture (0 for webcam, or provide video file path)
    cap = cv2.VideoCapture(0)  # Use 0 for webcam, or provide video file path
    
    # Initialize YOLO detector (using Ultralytics)
    try:
        detector = YOLODetector(weights_path='/Users/hwey/Desktop/projects/PlogGo/backend/models/best.pt')
    except Exception as e:
        print(f"Failed to initialize detector: {e}")
        return
    
    while True:
        # Read frame from video
        ret, frame = cap.read()
        if not ret:
            break
        
        try:
            # Perform detection
            detections = detector.detect(frame)
            
            # Visualize detections
            frame_with_detections = detector.visualize_detections(frame, detections)
            
            # Display the frame
            cv2.imshow('YOLO Real-Time Detection', frame_with_detections)
        except Exception as e:
            print(f"Detection error: {e}")
        
        # Break loop on 'q' key press
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    
    # Cleanup
    cap.release()
    cv2.destroyAllWindows()

if __name__ == '__main__':
    main()