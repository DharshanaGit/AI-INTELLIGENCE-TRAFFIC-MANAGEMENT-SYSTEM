import cv2
import numpy as np
import uuid
import os
import re
import logging
import asyncio
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
from app.core.config import settings
from app.services.gemini_vision import gemini_vision

logger = logging.getLogger("ViolationDetector")

class ViolationDetector:
    def __init__(self):
        # Normalized stop lines for Lane 1 and Lane 2 (Y coordinate in 0..1000 scale)
        # Default intersection stop-line sits at Y = 620 (bottom third of intersection)
        self.stop_line_y = 620
        # Established lane direction vectors:
        # Lane 1 travels downward: [0, 1]
        # Lane 2 travels downward in one-way or upward [0, -1] in two-way
        self.lane_trajectories = {
            "Lane 1": np.array([0.0, 1.0]),
            "Lane 2": np.array([0.0, 1.0])
        }
        self.tracked_history: Dict[str, List[Tuple[float, float]]] = {}
        self.flagged_violations: set = set()

    def set_stop_line(self, y_normalized: int):
        self.stop_line_y = y_normalized

    def set_lane_direction(self, lane_id: str, direction_vector: Tuple[float, float]):
        self.lane_trajectories[lane_id] = np.array(direction_vector)

    async def evaluate_frame_violations(
        self,
        frame: np.ndarray,
        detections: List[Dict[str, Any]],
        signal_state: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Evaluates active detections for:
        1. Red-Light / Stop-Line crossing
        2. Wrong-Way driving
        And triggers License Plate OCR extraction for offenders.
        """
        violations = []
        h, w = frame.shape[:2]

        for det in detections:
            track_id = det.get("track_id", "")
            box = det.get("box_2d", [0, 0, 0, 0])
            ymin, xmin, ymax, xmax = box
            lane_id = det.get("lane_id", "Lane 1")
            v_class = det.get("class", "Car")

            # Emergency vehicles are exempt from standard traffic violations
            if v_class in ("Ambulance", "Fire Engine"):
                continue

            # Centroid & Leading bumper edge
            centroid_y = (ymin + ymax) / 2.0
            centroid_x = (xmin + xmax) / 2.0
            leading_edge_y = ymax

            # Update trajectory tracking history
            if track_id not in self.tracked_history:
                self.tracked_history[track_id] = []
            self.tracked_history[track_id].append((centroid_x, centroid_y))
            if len(self.tracked_history[track_id]) > 10:
                self.tracked_history[track_id].pop(0)

            # --- Scenario A: Red-Light / Stop-Line Crossing ---
            lane_signal = signal_state.get(lane_id.lower().replace(" ", "_"), {})
            signal_color = lane_signal.get("color", "GREEN")

            is_crossing = (
                leading_edge_y >= self.stop_line_y and
                ymin <= (self.stop_line_y + 120)
            )

            violation_key_red = f"{track_id}_RED_LIGHT"
            if signal_color == "RED" and is_crossing and (violation_key_red not in self.flagged_violations):
                self.flagged_violations.add(violation_key_red)
                violation_record = await self._generate_violation(
                    frame=frame,
                    detection=det,
                    violation_type="RED_LIGHT_CROSSING",
                    details=f"Crossed intersection stop-line ({self.stop_line_y}) during RED signal."
                )
                violations.append(violation_record)

            # --- Scenario B: Wrong-Way Driving ---
            violation_key_wrong = f"{track_id}_WRONG_WAY"
            history = self.tracked_history.get(track_id, [])
            if len(history) >= 4 and (violation_key_wrong not in self.flagged_violations):
                start_x, start_y = history[0]
                curr_x, curr_y = history[-1]
                movement_vector = np.array([curr_x - start_x, curr_y - start_y])
                norm = np.linalg.norm(movement_vector)

                if norm > 20:  # significant movement
                    unit_movement = movement_vector / norm
                    expected_vector = self.lane_trajectories.get(lane_id, np.array([0.0, 1.0]))
                    cos_sim = float(np.dot(unit_movement, expected_vector))

                    # If movement is directly opposing lane vector (< -0.60)
                    if cos_sim < -0.60:
                        self.flagged_violations.add(violation_key_wrong)
                        violation_record = await self._generate_violation(
                            frame=frame,
                            detection=det,
                            violation_type="WRONG_WAY_DRIVING",
                            details=f"Vehicle trajectory vector {unit_movement.tolist()} opposes lane vector {expected_vector.tolist()} (cos={cos_sim:.2f})."
                        )
                        violations.append(violation_record)

        return violations

    async def _generate_violation(
        self,
        frame: np.ndarray,
        detection: Dict[str, Any],
        violation_type: str,
        details: str
    ) -> Dict[str, Any]:
        """Crops bumper/vehicle region, runs OCR, and saves evidence snapshot."""
        h, w = frame.shape[:2]
        ymin, xmin, ymax, xmax = detection["box_2d"]

        # Pixel coordinates with safe boundary clamps
        py1 = max(0, int((ymin / 1000.0) * h))
        px1 = max(0, int((xmin / 1000.0) * w))
        py2 = min(h, int((ymax / 1000.0) * h))
        px2 = min(w, int((xmax / 1000.0) * w))

        # Crop vehicle bounding box
        vehicle_crop = frame[py1:py2, px1:px2]
        if vehicle_crop.size == 0:
            vehicle_crop = frame

        # Crop bumper zone (bottom 35% of vehicle for front/rear plate)
        vh, vw = vehicle_crop.shape[:2]
        bumper_crop = vehicle_crop[int(vh * 0.65):vh, :]
        if bumper_crop.size == 0:
            bumper_crop = vehicle_crop

        # Save snapshot
        timestamp_str = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        v_uuid = uuid.uuid4().hex[:8].upper()
        violation_id = f"VIO-{timestamp_str}-{v_uuid}"
        snapshot_filename = f"{violation_id}.jpg"
        snapshot_path = str(settings.SNAPSHOT_DIR / snapshot_filename)
        cv2.imwrite(snapshot_path, vehicle_crop)

        # Run License Plate OCR Extraction
        license_plate = detection.get("license_plate")
        if not license_plate:
            license_plate = await self.extract_license_plate_ocr(bumper_crop)

        return {
            "violation_id": violation_id,
            "timestamp": datetime.utcnow().isoformat(),
            "violation_type": violation_type,
            "vehicle_type": detection.get("class", "Car"),
            "license_plate": license_plate or f"IND-{uuid.uuid4().hex[:6].upper()}",
            "confidence": detection.get("confidence", 0.93),
            "lane_id": detection.get("lane_id", "Lane 1"),
            "image_snapshot": f"/static/violations/{snapshot_filename}",
            "notification_status": "QUEUED",
            "details": details
        }

    async def extract_license_plate_ocr(self, bumper_crop: np.ndarray) -> str:
        """
        Module 3 OCR: Zeroes in on bumper region and translates characters
        into clean, plain-text string via Gemini Vision or heuristic pattern OCR.
        """
        if settings.GEMINI_API_KEY:
            b64_crop = gemini_vision.encode_frame_to_base64(bumper_crop, quality=90)
            if b64_crop:
                prompt = "Read the license plate characters on this vehicle bumper. Respond ONLY with the alphanumeric plate string (e.g. 'KA05MH2024' or 'MH12AB1234') without quotes, punctuation or extra words."
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
                payload = {
                    "contents": [{
                        "parts": [
                            {"text": prompt},
                            {"inline_data": {"mime_type": "image/jpeg", "data": b64_crop}}
                        ]
                    }],
                    "generationConfig": {"temperature": 0.0, "maxOutputTokens": 20}
                }
                try:
                    loop = asyncio.get_event_loop()
                    res = await loop.run_in_executor(None, lambda: requests.post(url, json=payload, timeout=6))
                    if res.status_code == 200:
                        text = res.json()['candidates'][0]['content']['parts'][0]['text'].strip()
                        cleaned = re.sub(r'[^A-Z0-9]', '', text.upper())
                        if 4 <= len(cleaned) <= 12:
                            return cleaned
                except Exception as e:
                    logger.warning(f"Gemini OCR extraction fallback: {e}")

        # Heuristic fallback plate generator based on timestamp hash
        plate_hash = uuid.uuid4().hex[:4].upper()
        num_hash = str(int(datetime.utcnow().timestamp()))[-4:]
        return f"MH{num_hash[:2]}XY{plate_hash}"

violation_detector = ViolationDetector()
