from ultralytics import YOLO

# load trained model
model = YOLO("best.pt")

# run detection on an image
results = model("sample.jpg", save=True)

# display results
for r in results:
    for box in r.boxes:
        print(f"Class: {int(box.cls)}, Confidence: {float(box.conf)}, BBox: {box.xyxy.tolist()}")