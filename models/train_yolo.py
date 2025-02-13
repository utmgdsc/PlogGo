from ultralytics import YOLO

# load pre-trained YOLOv11 model
model = YOLO("yolo11n.pt")

# train the model on TACO dataset
model.train(data="/Users/hwey/Desktop/projects/PlogGo/models/data.yaml", epochs=50, imgsz=640, batch=16)

# validate the trained model 
metrics = model.val()
print("Validation Metrics:", metrics)

# save best model
model.export(format="tflite")