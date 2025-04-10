import base64
from classifier import classify_litter

def image_to_base64(image_path):
    """Converts an image to a Base64 string."""
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

# Path to the image
image_path = "../litter-detection/assets/trash.jpg"  # Change to your image file

# Convert image to Base64
base64_image_string = image_to_base64(image_path)

# Run classification
results = classify_litter(base64_image_string)

print(results)
