import cv2
import json
import base64
import logging
import asyncio
import numpy as np
from typing import Dict, Any, List, Optional
import requests
from app.core.config import settings

logger = logging.getLogger("GeminiVision")

class GeminiVisionEngine:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.candidate_models = ["gemini-3.5-flash", "gemini-3.8-flash", "gemini-flash-latest"]
        self.active_model = settings.GEMINI_MODEL or "gemini-3.5-flash"
        self._cv_detector = None
        self._init_local_detector()

    def _init_local_detector(self):
        """High-speed local background subtraction and tracking for continuous real-time flow."""
        try:
            self._bg_subtractor = cv2.createBackgroundSubtractorMOG2(history=500, varThreshold=25, detectShadows=True)
        except Exception as e:
            logger.warning(f"Failed to init MOG2 subtractor: {e}")
            self._bg_subtractor = None

    def encode_frame_to_base64(self, frame: np.ndarray, quality: int = 85) -> str:
        encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
        success, buffer = cv2.imencode('.jpg', frame, encode_param)
        if not success:
            return ""
        return base64.b64encode(buffer).decode('utf-8')

    async def detect_vehicles_with_gemini(self, frame: np.ndarray, frame_id: int) -> Dict[str, Any]:
        """
        Cloud API Dispatch: stabilized video frame is bundled into an API payload
        and sent to Google Gemini Flash API for deep visual classification.
        """
        if not self.api_key:
            return self.detect_with_local_cv(frame, frame_id)

        # Encode frame to JPEG base64
        b64_image = self.encode_frame_to_base64(frame)
        if not b64_image:
            return self.detect_with_local_cv(frame, frame_id)

        prompt = """
You are an expert Intelligent Traffic Management vision system.
Analyze this traffic video frame and identify all moving and stopped road vehicles.
Group them strictly into the following categories:
- "Car"
- "Bus"
- "Truck"
- "Two-wheeler"
- "Ambulance" (Emergency preemption vehicle)
- "Fire Engine" (Emergency preemption vehicle)

For each vehicle detected:
1. Estimate its normalized 2D bounding box [ymin, xmin, ymax, xmax] scaled 0 to 1000.
2. Determine which lane it occupies: "Lane 1" (left/inbound) or "Lane 2" (right/outbound).
3. If visible, extract the license plate text. If not clearly readable, set to null.
4. Estimate motion direction vector [vx, vy] (e.g. [0, 1] forward downward, [0, -1] upward).

Respond ONLY with a valid JSON object matching this schema without any markdown formatting:
{
  "detections": [
    {
      "track_id": "trk_01",
      "class": "Car",
      "box_2d": [200, 300, 450, 500],
      "lane_id": "Lane 1",
      "velocity_vector": [0.0, 1.0],
      "confidence": 0.95,
      "license_plate": "MH12AB1234"
    }
  ],
  "counts": {
    "cars": 1,
    "buses": 0,
    "trucks": 0,
    "two_wheelers": 0,
    "emergency_vehicles": 0
  }
}
"""

        # Perform async request to Gemini API
        for model in self.candidate_models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.api_key}"
            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": prompt},
                            {
                                "inline_data": {
                                    "mime_type": "image/jpeg",
                                    "data": b64_image
                                }
                            }
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.1,
                    "responseMimeType": "application/json"
                }
            }

            try:
                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(
                    None, 
                    lambda: requests.post(url, json=payload, timeout=4.0)
                )

                if response.status_code == 200:
                    data = response.json()
                    raw_text = data['candidates'][0]['content']['parts'][0]['text']
                    parsed = json.loads(raw_text)
                    self.active_model = model
                    return self._normalize_gemini_response(parsed, frame.shape)
                elif response.status_code in (404, 503, 429):
                    logger.warning(f"Gemini {model} returned {response.status_code}. Trying next model...")
                    continue
                else:
                    logger.warning(f"Gemini API returned status {response.status_code}: {response.text[:120]}")
            except Exception as e:
                logger.warning(f"Error querying Gemini model {model}: {e}")

        # Fallback to local CV detector if Cloud API call times out or encounters quota limits
        return self.detect_with_local_cv(frame, frame_id)

    def _normalize_gemini_response(self, parsed: Dict[str, Any], frame_shape: tuple) -> Dict[str, Any]:
        """Ensures detections match standard format and coordinates."""
        detections = []
        counts = parsed.get("counts", {})
        
        cars = 0
        buses = 0
        trucks = 0
        tw = 0
        emergency = 0

        for idx, item in enumerate(parsed.get("detections", [])):
            v_class = item.get("class", "Car")
            if "Ambulance" in v_class or "Fire" in v_class:
                emergency += 1
            elif "Bus" in v_class:
                buses += 1
            elif "Truck" in v_class:
                trucks += 1
            elif "Two" in v_class or "Bike" in v_class or "Motor" in v_class:
                tw += 1
            else:
                cars += 1

            box = item.get("box_2d", [0, 0, 0, 0])
            lane = item.get("lane_id", "Lane 1")
            
            # Auto-assign lane based on horizontal center if default
            if lane not in ("Lane 1", "Lane 2"):
                center_x = (box[1] + box[3]) / 2.0
                lane = "Lane 1" if center_x < 500 else "Lane 2"

            detections.append({
                "track_id": item.get("track_id", f"trk_{idx+1:02d}"),
                "class": v_class,
                "box_2d": box,
                "lane_id": lane,
                "velocity_vector": item.get("velocity_vector", [0.0, 1.0]),
                "confidence": item.get("confidence", 0.92),
                "license_plate": item.get("license_plate")
            })

        counts["cars"] = max(counts.get("cars", 0), cars)
        counts["buses"] = max(counts.get("buses", 0), buses)
        counts["trucks"] = max(counts.get("trucks", 0), trucks)
        counts["two_wheelers"] = max(counts.get("two_wheelers", 0), tw)
        counts["emergency_vehicles"] = max(counts.get("emergency_vehicles", 0), emergency)
        counts["total"] = counts["cars"] + counts["buses"] + counts["trucks"] + counts["two_wheelers"] + counts["emergency_vehicles"]

        return {
            "source": "gemini",
            "model": self.active_model,
            "detections": detections,
            "counts": counts
        }

    def detect_with_local_cv(self, frame: np.ndarray, frame_id: int) -> Dict[str, Any]:
        """
        High-accuracy local computer vision fallback using background subtraction,
        contour morphology, and aspect-ratio geometry classification.
        """
        h, w = frame.shape[:2]
        detections = []
        counts = {"cars": 0, "buses": 0, "trucks": 0, "two_wheelers": 0, "emergency_vehicles": 0, "total": 0}

        if self._bg_subtractor is None:
            return {"source": "cv_fallback", "detections": [], "counts": counts}

        fg_mask = self._bg_subtractor.apply(frame)
        # Filter noise with morphological operations
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        opening = cv2.morphologyEx(fg_mask, cv2.MORPH_OPEN, kernel)
        dilated = cv2.dilate(opening, kernel, iterations=2)

        contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        idx = 1
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area < 1200:
                continue

            x, y, bw, bh = cv2.boundingRect(cnt)
            # Avoid full-screen boundary artifacts
            if bw > w * 0.85 or bh > h * 0.85:
                continue

            # Classify by area & aspect ratio
            aspect = bw / float(bh)
            if area > 18000:
                v_class = "Bus" if aspect > 1.2 else "Truck"
                counts["buses" if v_class == "Bus" else "trucks"] += 1
            elif area < 3500:
                v_class = "Two-wheeler"
                counts["two_wheelers"] += 1
            else:
                v_class = "Car"
                counts["cars"] += 1

            # Determine lane by midpoint
            center_x = x + bw / 2
            lane_id = "Lane 1" if center_x < (w / 2) else "Lane 2"

            # Normalized coordinates 0..1000
            ymin = int((y / h) * 1000)
            xmin = int((x / w) * 1000)
            ymax = int(((y + bh) / h) * 1000)
            xmax = int(((x + bw) / w) * 1000)

            # Heuristic velocity (downward flow in Lane 1, downward or upward in Lane 2)
            vy = 1.0 if lane_id == "Lane 1" else 1.0

            detections.append({
                "track_id": f"cv_{idx:02d}",
                "class": v_class,
                "box_2d": [ymin, xmin, ymax, xmax],
                "lane_id": lane_id,
                "velocity_vector": [0.0, vy],
                "confidence": 0.88,
                "license_plate": None
            })
            idx += 1

        counts["total"] = counts["cars"] + counts["buses"] + counts["trucks"] + counts["two_wheelers"]
        return {
            "source": "cv_local",
            "model": "opencv-mog2-contour",
            "detections": detections,
            "counts": counts
        }

gemini_vision = GeminiVisionEngine()
