import cv2
import numpy as np
import base64
import onnxruntime as ort
from PIL import Image
from io import BytesIO

def base64_to_image(base64_string):
        """
        Convert base64 string to image.
        
        Args:
            base64_string (str): Base64 encoded image string
            
        Returns:
            numpy.ndarray: Image in BGR format for OpenCV processing
        """
        # If string comes with data URI scheme, remove it
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
            
        # Decode base64 string
        img_data = base64.b64decode(base64_string)
        
        # Convert to PIL Image
        img_pil = Image.open(BytesIO(img_data))
        
        # Convert to numpy array (RGB)
        img_np = np.array(img_pil)
        
        # Convert RGB to BGR 
        if len(img_np.shape) == 3 and img_np.shape[2] == 3:
            img_np = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
            
        return img_np

# convert base 64 to cv2 compatible image format
def base64_to_opencv(base64_string):
    # Make sure to handle potential padding issues in base64 strings
    base64_string = base64_string.strip()
    # Add padding if necessary
    padding = len(base64_string) % 4
    if padding:
        base64_string += '=' * (4 - padding)
        
    img_data = base64.b64decode(base64_string)
    np_arr = np.frombuffer(img_data, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    return img

# run inference with onnx runtime 
def run_model(model_path, img):
    # Create ONNX Runtime session
    session = ort.InferenceSession(model_path)
    
    # Get input name
    input_name = session.get_inputs()[0].name
    
    # Run inference
    results = session.run(None, {input_name: img.astype(np.float32)})
    
    return results[0] 

def NMS(boxes, conf_scores, iou_thresh = 0.50):
    #  boxes [[x1,y1, x2,y2], [x1,y1, x2,y2], ...]
    x1 = boxes[:,0]
    y1 = boxes[:,1]
    x2 = boxes[:,2]
    y2 = boxes[:,3]

    areas = (x2-x1)*(y2-y1)

    order = conf_scores.argsort()

    keep = []
    keep_confidences = []

    while len(order) > 0:
        idx = order[-1]
        A = boxes[idx]
        conf = conf_scores[idx]

        order = order[:-1]

        xx1 = np.take(x1, indices= order)
        yy1 = np.take(y1, indices= order)
        xx2 = np.take(x2, indices= order)
        yy2 = np.take(y2, indices= order)

        keep.append(A)
        keep_confidences.append(conf)

        # iou = inter/union

        xx1 = np.maximum(x1[idx], xx1)
        yy1 = np.maximum(y1[idx], yy1)
        xx2 = np.minimum(x2[idx], xx2)
        yy2 = np.minimum(y2[idx], yy2)

        w = np.maximum(xx2-xx1, 0)
        h = np.maximum(yy2-yy1, 0)

        intersection = w*h

        # union = areaA + other_areas - intesection
        other_areas = np.take(areas, indices= order)
        union = areas[idx] + other_areas - intersection

        iou = intersection/union

        boleans = iou < iou_thresh

        order = order[boleans]

    return keep, keep_confidences

def rescale_back(results,img_w,img_h):
    cx, cy, w, h, class_id, confidence = results[:,0], results[:,1], results[:,2], results[:,3], results[:,4], results[:,-1]
    cx = cx/640.0 * img_w
    cy = cy/640.0 * img_h
    w = w/640.0 * img_w
    h = h/640.0 * img_h
    x1 = cx - w/2
    y1 = cy - h/2
    x2 = cx + w/2
    y2 = cy + h/2

    boxes = np.column_stack((x1, y1, x2, y2, class_id))
    keep, keep_confidences = NMS(boxes,confidence)
    # print(np.array(keep).shape)
    return keep, keep_confidences

# load classes labels for pretrained model
def load_labels(path):
    with open(path) as file: # extract number of classes from text file
        content = file.read()
        classes = content.split('\n')
    return classes

def filter_Detections(results, thresh = 0.1):
    # if model is trained on 1 class only
    if len(results[0]) == 5:
        # filter out the detections with confidence > thresh
        considerable_detections = [detection for detection in results if detection[4] > thresh]
        considerable_detections = np.array(considerable_detections)
        return considerable_detections

    # if model is trained on multiple classes
    else:
        A = []
        for detection in results:

            class_id = detection[4:].argmax()
            confidence_score = detection[4:].max()

            new_detection = np.append(detection[:4],[class_id,confidence_score])

            A.append(new_detection)

        A = np.array(A)

        # filter out the detections with confidence > thresh
        considerable_detections = [detection for detection in A if detection[-1] > thresh]
        considerable_detections = np.array(considerable_detections)

        return considerable_detections

def detect_litter_from_base64(base64_string, model_path, labels_path):
    # convert base64 encoded images to cv2 compatible type
    image = base64_to_image(base64_string)

    # YOLO model need RGB image
    img = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    img_height, img_width = img.shape[:2]

    # resize image to desired sire for inference
    img = cv2.resize(img, (640, 640))

    # change the order of image dimension (640, 640, 3) to (3, 640, 640)
    img = img.transpose(2, 0, 1)

    # add an extra dimension at index 0
    img = img.reshape(1, 3, 640, 640)

    # scale to 0-1
    img = img/255.0

    # run model and get inferences
    output = run_model(model_path, img)
    
    # remove the first index
    results = output[0]

    # tranpose the image matrix
    results = results.transpose()

    # filter inaccurate detections
    results = filter_Detections(results)

    # rescale the images back to its original form
    # rescaled_results, confidences = rescale_back(results, img_width, img_height)
    
    # Load class labels
    classes = load_labels(labels_path) 

    predictions = [classes[int(result[-2])] for result in results]

    return predictions