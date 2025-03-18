import onnxruntime as ort
import base64
import image_helper
import numpy as np

# function to run inference
def predict_from_base64(base64_string):
    # decode image
    img = image_helper.decode_base64(base64_string)

    # preprocess image
    img = image_helper.preprocess(img)

    # load (ONNX) model
    model_path = "best7.onnx"
    
    # run model
    outputs = run_model(model_path, img)

    # prediction
    pred = map_outputs(outputs)
    
    return pred

# run model
def run_model(model_path, img):
    ort_sess = ort.InferenceSession(model_path)
    print(img)
    outputs = ort_sess.run(None, {'images': img})
    return outputs

# load text file as list
def load_labels(path):
    labels = []
    with open(path, 'r') as f:
        for line in f:
            labels.append(line.strip())
    return labels

# map model outputs to classes
def map_outputs(outputs):
    labels = load_labels('litter_classes.txt')

    # prediction processing
    outputs = np.array(outputs)
    results = outputs[0]
    results = results.transpose()
    results = filter_detections(results)
    rescaled_results, confidences = rescale_back(results, 640, 640)
    class_id = int(rescaled_results[np.argmax(confidences)][-1])

    return labels[class_id]

def filter_detections(results, thresh = 0.5):
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

def NMS(boxes, conf_scores, iou_thresh = 0.55):
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

        # order = [2,0,1]  boleans = [True, False, True]
        # order = [2,1]

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
    print(np.array(keep).shape)
    return keep, keep_confidences

if __name__ == "__main__":
    # specify image path
    img_path = 'plastic-bottle.jpg'

    with open(img_path, 'rb') as image_file:
        encoded_string = base64.b64encode(image_file.read())
        img_base64 = encoded_string.decode('utf-8')

    detections = predict_from_base64(base64_string=img_base64)

    print(detections)
