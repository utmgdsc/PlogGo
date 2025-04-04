from ultralytics import YOLO

def main():
    # Load the best trained YOLO model
    model = YOLO("best.pt")  # Adjust path if needed

    # Perform validation (testing) using the test dataset
    metrics = model.val(data="D://projects/PlogGo/models/data.yaml", 
                        split="test",  # Use test split
                        imgsz=640, 
                        batch=8, 
                        device=0)  # Use GPU (set to 'cpu' if no GPU)

    # Retrieve the correct metric values
    precision, recall, mAP50, mAP5095 = metrics.box.mean_results()  # Unpack all four values

    # Print accuracy metrics
    print("\n🔹 Model Evaluation Metrics:")
    print(f"📌 Mean Average Precision (mAP@50): {mAP50:.3f}")
    print(f"📌 Mean Average Precision (mAP@50-95): {mAP5095:.3f}")
    print(f"📌 Precision: {precision:.3f}")
    print(f"📌 Recall: {recall:.3f}")

    # Save the results to a file
    with open("test_results.txt", "w") as f:
        f.write(f"Mean Average Precision (mAP@50): {mAP50:.3f}\n")
        f.write(f"Mean Average Precision (mAP@50-95): {mAP5095:.3f}\n")
        f.write(f"Precision: {precision:.3f}\n")
        f.write(f"Recall: {recall:.3f}\n")

    print("\n✅ Evaluation complete. Results saved to test_results.txt")

if __name__ == '__main__':
    main()
