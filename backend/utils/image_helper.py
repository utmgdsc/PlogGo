import base64
import cv2
import numpy as np

# decode base64 image
def decode_base64(data):
    img = base64.b64decode(data)
    img = cv2.imdecode(np.fromstring(img, np.uint8), cv2.IMREAD_COLOR)
    img = cv2.resize(img, (640, 640))
    img = img.transpose((2,0,1))
    img = img.reshape(1, 3, 640, 640)
    return img
# preprocess image
def preprocess(img_data):
    mean_vec = np.array([0.485, 0.456, 0.406])
    stddev_vec = np.array([0.229, 0.224, 0.225])
    norm_img_data = np.zeros(img_data.shape).astype('float32')
    for i in range(img_data.shape[0]):
         # for each pixel and channel
         # divide the value by 255 to get value between [0, 1]
        norm_img_data[i,:,:] = (img_data[i,:,:]/255 - mean_vec[i]) / stddev_vec[i]
    return norm_img_data
