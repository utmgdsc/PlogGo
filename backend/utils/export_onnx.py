from ultralytics import YOLO

def export(filename):
    # load trained YOLO model
    model = YOLO(filename)

    # export to ONNX format
    model.export(format="onnx")

if __name__=="__main__":
    export("best7.pt")
