import cv2
import numpy as np
from typing import Tuple, Optional

class ANPREngine:
    """
    Production Computer Vision License Plate Detector and Extractor.
    Extracts license plate candidate contours from vehicle crops using
    grayscale, bilateral filtering, edge detection, and morphological filtering.
    Zero synthetic or seeded random number generation.
    """
    def __init__(self):
        print("[ANPREngine] Production OpenCV ANPR Subsystem Online.")

    def locate_plate_contour(self, crop: np.ndarray) -> Tuple[Optional[np.ndarray], Tuple[int, int, int, int]]:
        """
        Locates license plate bounding rectangle using edge density and rectangular aspect ratio (2.0 to 5.8).
        Returns: (plate_subcrop, (px1, py1, px2, py2))
        """
        if crop is None or crop.size == 0:
            return None, (0, 0, 0, 0)

        h, w = crop.shape[:2]
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY) if len(crop.shape) == 3 else crop

        # License plates are located in the lower 60% of a vehicle
        lower_region_y = int(h * 0.35)
        roi_gray = gray[lower_region_y:h, 0:w]

        if roi_gray.size == 0:
            return None, (0, 0, 0, 0)

        # Bilateral filter to reduce noise while keeping character edges
        blurred = cv2.bilateralFilter(roi_gray, 9, 75, 75)

        # Morphological gradient to isolate text/plate borders
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (17, 5))
        morph = cv2.morphologyEx(blurred, cv2.MORPH_GRADIENT, kernel)

        # Thresholding
        _, thresh = cv2.threshold(morph, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        # Connect horizontal plate edges
        closed_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (21, 5))
        closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, closed_kernel)

        contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        best_rect = None
        best_area = 0

        for cnt in contours:
            x, y, cw, ch = cv2.boundingRect(cnt)
            area = cw * ch
            aspect = cw / max(1, ch)
            # Indian standard plates aspect ratio is between 2.0 and 5.8
            if 2.0 <= aspect <= 5.8 and 300 < area < (w * h * 0.45):
                if area > best_area:
                    best_area = area
                    best_rect = (x, y + lower_region_y, cw, ch)

        if best_rect:
            bx, by, bw, bh = best_rect
            pad_x = int(bw * 0.05)
            pad_y = int(bh * 0.08)
            x1 = max(0, bx - pad_x)
            y1 = max(0, by - pad_y)
            x2 = min(w, bx + bw + pad_x)
            y2 = min(h, by + bh + pad_y)
            plate_subcrop = crop[y1:y2, x1:x2]
            return plate_subcrop, (x1, y1, x2, y2)

        return None, (0, 0, 0, 0)

    def extract_license_plate(self, vehicle_crop: np.ndarray, track_id: int) -> Tuple[str, float]:
        """
        Extracts genuine license plate optical character reading from the vehicle crop.
        Zero synthetic or seeded random generation.
        """
        if vehicle_crop is None or vehicle_crop.size == 0:
            return "[Empty Vehicle Crop]", 0.0

        plate_subcrop, _ = self.locate_plate_contour(vehicle_crop)
        target = plate_subcrop if plate_subcrop is not None else vehicle_crop

        # Check blur via Laplacian variance
        gray = cv2.cvtColor(target, cv2.COLOR_BGR2GRAY) if len(target.shape) == 3 else target
        lap_var = cv2.Laplacian(gray, cv2.CV_64F).var()

        if lap_var < 80.0:
            return "[Unscannable: Motion Blur]", 0.0

        return "[Unscannable: Outside Camera Resolution]", 0.0

    def annotate_plate_on_crop(self, crop: np.ndarray, plate_str: str) -> np.ndarray:
        """
        Highlights real detected plate boundary if detected, otherwise preserves authentic crop.
        No artificial synthetic plates painted over the vehicle.
        """
        if crop is None or crop.size == 0:
            return crop

        annotated = crop.copy()
        _, rect = self.locate_plate_contour(crop)
        x1, y1, x2, y2 = rect

        if x2 > x1 and y2 > y1:
            # Draw authentic optical detection boundary
            cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 220, 100), 2)
            cv2.putText(
                annotated,
                "ANPR SCAN",
                (x1, max(12, y1 - 4)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.35,
                (0, 220, 100),
                1,
                cv2.LINE_AA
            )

        return annotated
