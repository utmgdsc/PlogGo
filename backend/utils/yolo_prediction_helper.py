import cv2
import numpy as np

def preprocess_image_for_yolo(image_path, target_size=(640, 640)):
    """
    Preprocess an image for YOLO model prediction.
    
    Args:
        image_path (str): Path to the input image
        target_size (tuple): Desired output image size (default is 640x640)
    
    Returns:
        numpy.ndarray: Preprocessed image ready for YOLO prediction
    """
    # Read the image
    original_image = cv2.imread(image_path)
    
    # Check if image is loaded successfully
    if original_image is None:
        raise ValueError(f"Unable to load image from {image_path}")
    
    # Get original image dimensions
    height, width = original_image.shape[:2]
    
    # Calculate aspect ratio preserving resize
    aspect_ratio = min(target_size[0] / width, target_size[1] / height)
    new_width = int(width * aspect_ratio)
    new_height = int(height * aspect_ratio)
    
    # Resize image while maintaining aspect ratio
    resized_image = cv2.resize(original_image, (new_width, new_height), 
                                interpolation=cv2.INTER_AREA)
    
    # Create a blank canvas with target size
    canvas = np.full((target_size[1], target_size[0], 3), 114, dtype=np.uint8)
    
    # Calculate padding to center the image
    x_offset = (target_size[0] - new_width) // 2
    y_offset = (target_size[1] - new_height) // 2
    
    # Place resized image onto the canvas
    canvas[y_offset:y_offset+new_height, x_offset:x_offset+new_width] = resized_image
    
    # Normalize pixel values (optional, depends on specific YOLO model)
    # canvas = canvas.astype(np.float32) / 255.0
    
    return canvas

# Example usage
def main():
    image_path = '/Users/hwey/Desktop/projects/PlogGo/backend/models/test.jpg'
    preprocessed_image = preprocess_image_for_yolo(image_path)
    
    # Optional: display or save preprocessed image for verification
    cv2.imwrite('preprocessed_image.jpg', preprocessed_image)
    print(f"Preprocessed image shape: {preprocessed_image.shape}")

if __name__ == '__main__':
    main()