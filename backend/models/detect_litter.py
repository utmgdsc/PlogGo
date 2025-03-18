from ultralytics import YOLO

# load trained model
onnx_model = YOLO('best7.onnx')

# run detection on an image
results = onnx_model("plastic-bottle.jpg", save=True)

# display results
print(results)