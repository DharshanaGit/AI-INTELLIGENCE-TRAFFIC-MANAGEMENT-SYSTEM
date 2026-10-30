import os
import cv2
import torch
from ultralytics import YOLO

# Comprehensive Indian & Standard COCO vehicle and pedestrian class mappings
TARGET_CLASSES = {
    2: "car",
    3: "motorcycle",
    5: "bus",
    7: "truck",
    1: "bicycle",
    0: "pedestrian"
}

class VehicleDetector:
    def __init__(self, model_name: str = "yolov8n.pt", conf_thresh: float = 0.30):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.conf_thresh = conf_thresh
        self.conf_threshold = conf_thresh
        self.iou_threshold = 0.45
        self.current_model_name = model_name
        self._load_model(model_name)

    def _load_model(self, model_name: str):
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        candidate_paths = [
            model_name,
            os.path.join(base_dir, model_name),
            os.path.join(base_dir, "models", model_name)
        ]
        target_path = model_name
        for p in candidate_paths:
            if os.path.exists(p):
                target_path = p
                break

        print(f"[VehicleDetector] Loading high-speed model {target_path} on {self.device.upper()}...")
        self.model = YOLO(target_path)
        self.current_model_name = os.path.basename(target_path)

    def switch_model(self, model_name: str) -> str:
        """Hot-swaps the YOLO model weights on the fly"""
        self._load_model(model_name)
        return self.current_model_name

    def detect(self, frame):
        """
        Runs object detection on a downscaled frame copy for maximum FPS,
        then rescales detected coordinates back to original frame dimensions with
        Indian vehicle, pedestrian, and child heuristic categorization.
        Returns: list of dicts: {'bbox': [x1, y1, x2, y2], 'class_name': str, 'confidence': float, 'class_id': int}
        """
        if frame is None:
            return []

        orig_h, orig_w = frame.shape[:2]
        infer_w, infer_h = 640, 360

        small_frame = cv2.resize(frame, (infer_w, infer_h), interpolation=cv2.INTER_LINEAR)

        results = self.model.predict(
            source=small_frame,
            imgsz=480,
            conf=self.conf_thresh,
            device=self.device,
            verbose=False,
            classes=list(TARGET_CLASSES.keys())
        )
        
        detections = []
        if not results:
            return detections
            
        scale_x = orig_w / infer_w
        scale_y = orig_h / infer_h

        for r in results:
            boxes = r.boxes
            for box in boxes:
                cls_id = int(box.cls[0].item())
                conf = float(box.conf[0].item())
                s_coords = box.xyxy[0].cpu().numpy().astype(float).tolist()

                x1 = int(s_coords[0] * scale_x)
                y1 = int(s_coords[1] * scale_y)
                x2 = int(s_coords[2] * scale_x)
                y2 = int(s_coords[3] * scale_y)
                coords = [x1, y1, x2, y2]
                
                class_name = TARGET_CLASSES.get(cls_id, "vehicle")
                bw = x2 - x1
                bh = y2 - y1
                aspect_ratio = bw / max(1, bh)

                # Heuristics:
                if class_name == "car" and 0.8 <= aspect_ratio <= 1.35 and 2000 < (bw * bh) < 14000:
                    class_name = "auto_rickshaw"
                elif class_name == "motorcycle":
                    class_name = "two_wheeler"
                elif class_name == "pedestrian":
                    # Distinguish children / young students: height < 48px or smaller relative footprint
                    if bh < 48 or (aspect_ratio > 0.55 and bh < 62):
                        class_name = "child"

                detections.append({
                    "bbox": coords,
                    "class_name": class_name,
                    "confidence": round(conf, 3),
                    "class_id": cls_id
                })
                
        return detections
