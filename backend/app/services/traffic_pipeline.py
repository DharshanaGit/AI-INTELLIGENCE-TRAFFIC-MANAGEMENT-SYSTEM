import cv2
import asyncio
import logging
import time
from datetime import datetime
from typing import Optional, Dict, Any
from app.services.video_processor import video_processor
from app.services.gemini_vision import gemini_vision
from app.services.violation_detector import violation_detector
from app.services.signal_controller import signal_controller
from app.services.notification import notification_service
from app.services.websocket_manager import ws_manager
from app.core.database import db_manager
from app.core.config import settings

logger = logging.getLogger("TrafficPipeline")

class TrafficPipelineManager:
    def __init__(self):
        self.is_running: bool = False
        self.current_video_path: Optional[str] = None
        self._task: Optional[asyncio.Task] = None
        self.fps_playback_delay: float = 0.05  # ~20 FPS display pacing

    def start_pipeline(self, video_path: str):
        if self.is_running:
            self.stop_pipeline()
        self.current_video_path = video_path
        self.is_running = True
        self._task = asyncio.create_task(self._pipeline_loop())
        logger.info(f"Traffic pipeline started for video: {video_path}")

    def stop_pipeline(self):
        self.is_running = False
        if self._task and not self._task.done():
            self._task.cancel()
        logger.info("Traffic pipeline stopped.")

    async def _pipeline_loop(self):
        if not self.current_video_path:
            return

        last_gemini_call = 0.0
        gemini_pending_task = None
        cached_detections = []
        cached_counts = {"cars": 0, "buses": 0, "trucks": 0, "two_wheelers": 0, "emergency_vehicles": 0, "total": 0}

        try:
            generator = video_processor.process_video_stream(self.current_video_path, sample_rate=2)
            
            for item in generator:
                if not self.is_running:
                    break

                frame = item["frame"]
                frame_idx = item["frame_idx"]
                timestamp_sec = item["timestamp_sec"]
                now = time.time()

                # Check if background Gemini inference has completed
                if gemini_pending_task and gemini_pending_task.done():
                    try:
                        ai_result = gemini_pending_task.result()
                        if ai_result and ai_result.get("detections"):
                            cached_detections = ai_result["detections"]
                            cached_counts = ai_result.get("counts", cached_counts)
                    except Exception as e:
                        logger.warning(f"Background Gemini task exception: {e}")
                    gemini_pending_task = None

                # Launch new Gemini inference periodically without stalling the video frame rate
                if (now - last_gemini_call) >= 2.0 and gemini_pending_task is None:
                    last_gemini_call = now
                    frame_copy = frame.copy()
                    gemini_pending_task = asyncio.create_task(
                        gemini_vision.detect_vehicles_with_gemini(frame_copy, frame_idx)
                    )

                # High-speed local tracking always runs on every frame
                local_res = gemini_vision.detect_with_local_cv(frame, frame_idx)
                if not cached_detections or (local_res["detections"] and len(local_res["detections"]) > len(cached_detections)):
                    cached_detections = local_res["detections"]
                    cached_counts = local_res["counts"]

                # Module 4: Dynamic Signal Control System
                lane_1_density = signal_controller.calculate_lane_density(cached_detections, "Lane 1")
                lane_2_density = signal_controller.calculate_lane_density(cached_detections, "Lane 2")

                emergency_detected = any(
                    d.get("class") in ("Ambulance", "Fire Engine") for d in cached_detections
                )
                emergency_lane = None
                if emergency_detected:
                    for d in cached_detections:
                        if d.get("class") in ("Ambulance", "Fire Engine"):
                            emergency_lane = d.get("lane_id")
                            break

                signal_state = signal_controller.update_signals(
                    lane_1_density=lane_1_density,
                    lane_2_density=lane_2_density,
                    emergency_detected=emergency_detected,
                    emergency_lane=emergency_lane,
                    elapsed_delta=0.1
                )

                # Module 3: Traffic Violation Detection
                violations = await violation_detector.evaluate_frame_violations(
                    frame=frame,
                    detections=cached_detections,
                    signal_state=signal_state
                )

                # Handle new violations
                for vio in violations:
                    # Module 7: Save to MongoDB Atlas
                    try:
                        await db_manager.violations.insert_one(vio)
                    except Exception as e:
                        logger.error(f"Error persisting violation to MongoDB: {e}")

                    # Module 6: Fire SMS & Email alert
                    asyncio.create_task(notification_service.send_violation_alert(vio))

                # Periodically log telemetry snapshot to MongoDB
                if frame_idx % 30 == 0:
                    telemetry_doc = {
                        "timestamp": datetime.utcnow().isoformat(),
                        "lane_1_density": lane_1_density,
                        "lane_2_density": lane_2_density,
                        "signal_state": signal_state,
                        "counts": cached_counts
                    }
                    try:
                        await db_manager.telemetry_logs.insert_one(telemetry_doc)
                    except Exception as e:
                        logger.error(f"Error logging telemetry to MongoDB: {e}")

                # Prepare lightweight preview frame for dashboard overlay
                # Downsample preview to 640x360 JPEG base64 to ensure ultra-smooth WebSocket streaming
                preview_frame = cv2.resize(frame, (640, 360), interpolation=cv2.INTER_AREA)
                b64_preview = gemini_vision.encode_frame_to_base64(preview_frame, quality=65)

                # Module 5: Real-Time Data Streaming to WebSocket Clients
                payload = {
                    "type": "TELEMETRY_UPDATE",
                    "frame_idx": frame_idx,
                    "timestamp_sec": timestamp_sec,
                    "frame_base64": b64_preview,
                    "detections": cached_detections,
                    "counts": cached_counts,
                    "densities": {
                        "lane_1": lane_1_density,
                        "lane_2": lane_2_density
                    },
                    "signal_state": signal_state,
                    "new_violations": violations,
                    "stop_line_y": violation_detector.stop_line_y
                }

                await ws_manager.broadcast_json(payload)
                await asyncio.sleep(self.fps_playback_delay)

        except asyncio.CancelledError:
            logger.info("Pipeline task cancelled gracefully.")
        except Exception as e:
            logger.error(f"Pipeline loop exception: {e}", exc_info=True)
        finally:
            self.is_running = False

traffic_pipeline = TrafficPipelineManager()
