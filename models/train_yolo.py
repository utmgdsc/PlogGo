from ultralytics import YOLO
import torch

def main():
    # check if cuda cores are available for training
    print("GPU is compatible to be used", torch.cuda.is_available())

    # load pre-trained YOLOv11 model
    model = YOLO("yolo11n.pt")

    # train the model on TACO dataset
    model.train(data="D://projects/PlogGo/models/data.yaml", epochs=50, imgsz=416, batch=8, device=0)

    # validate the trained model 
    metrics = model.val()
    print("Validation Metrics:", metrics)

    # save best model
    model.export(format="tflite")

if __name__=='__main__':
    main()