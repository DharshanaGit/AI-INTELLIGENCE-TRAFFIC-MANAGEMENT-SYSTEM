import shutil
import uuid
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query, WebSocket, WebSocketDisconnect
from typing import Optional, List, Dict, Any
from app.core.config import settings
from app.core.database import db_manager
from app.services.traffic_pipeline import traffic_pipeline
from app.services.violation_detector import violation_detector
from app.services.notification import notification_service
from app.services.websocket_manager import ws_manager

router = APIRouter()

@router.get("/health")
async def health_check():
    return {
        "status": "online",
        "database": "MongoDB Atlas" if db_manager.is_atlas_connected else "Local Async Engine",
        "pipeline_active": traffic_pipeline.is_running
    }

@router.post("/video/upload")
async def upload_video(file: UploadFile = File(...)):
    """Module 1: Ingestion of raw traffic video (.mp4 or .avi)"""
    ext = Path(file.filename).suffix.lower()
    if ext not in [".mp4", ".avi", ".mov", ".mkv"]:
        raise HTTPException(status_code=400, detail="Invalid file type. Supported: .mp4, .avi, .mov")

    file_id = f"video_{uuid.uuid4().hex[:8]}{ext}"
    dest_path = settings.UPLOAD_DIR / file_id

    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Immediately start processing in the background pipeline
    traffic_pipeline.start_pipeline(str(dest_path))

    return {
        "status": "success",
        "message": "Video uploaded successfully and processing initialized.",
        "video_id": file_id,
        "video_path": str(dest_path)
    }

@router.get("/video/samples")
async def list_sample_videos():
    """List pre-existing videos from the Traffic Videos workspace folder."""
    samples_dir = settings.BASE_DIR / "Traffic Videos"
    if not samples_dir.exists():
        return {"samples": []}
    files = [f.name for f in samples_dir.iterdir() if f.suffix.lower() in [".mp4", ".avi", ".jpeg", ".jpg"]]
    return {"samples": files}

@router.post("/video/select-sample")
async def select_sample_video(filename: str = Form(...)):
    """Select a sample video from Traffic Videos directory to start analysis."""
    sample_path = settings.BASE_DIR / "Traffic Videos" / filename
    if not sample_path.exists():
        raise HTTPException(status_code=404, detail="Sample video not found.")

    traffic_pipeline.start_pipeline(str(sample_path))
    return {
        "status": "success",
        "message": f"Processing started for sample: {filename}"
    }

@router.post("/pipeline/control")
async def control_pipeline(action: str = Form(...)):
    """Start, stop or pause the pipeline"""
    if action == "stop":
        traffic_pipeline.stop_pipeline()
        return {"status": "stopped"}
    elif action == "start":
        if traffic_pipeline.current_video_path:
            traffic_pipeline.start_pipeline(traffic_pipeline.current_video_path)
            return {"status": "started"}
        raise HTTPException(status_code=400, detail="No active video to start.")
    raise HTTPException(status_code=400, detail="Invalid action. Use 'start' or 'stop'.")

@router.get("/violations")
async def get_violations(
    limit: int = Query(50, ge=1, le=200),
    violation_type: Optional[str] = None,
    license_plate: Optional[str] = None
):
    """Module 7: High-speed indexed querying for traffic operators"""
    query = {}
    if violation_type:
        query["violation_type"] = violation_type
    if license_plate:
        query["license_plate"] = license_plate

    cursor = db_manager.violations.find(query).sort("timestamp", -1).limit(limit)
    violations = await cursor.to_list(length=limit)
    # Serialize ObjectId if present
    for v in violations:
        if "_id" in v:
            v["_id"] = str(v["_id"])
    return {"violations": violations, "count": len(violations)}

@router.get("/telemetry/recent")
async def get_recent_telemetry(limit: int = Query(30, ge=5, le=100)):
    """Retrieve recent traffic density snapshots for historical chart rendering."""
    cursor = db_manager.telemetry_logs.find().sort("timestamp", -1).limit(limit)
    items = await cursor.to_list(length=limit)
    for item in items:
        if "_id" in item:
            item["_id"] = str(item["_id"])
    return {"telemetry": list(reversed(items))}

@router.post("/config/stopline")
async def update_stop_line(y_coordinate: int = Form(...)):
    """Configure virtual coordinates representing intersection stop-line."""
    if not (100 <= y_coordinate <= 950):
        raise HTTPException(status_code=400, detail="Coordinate must be between 100 and 950.")
    violation_detector.set_stop_line(y_coordinate)
    return {"status": "success", "stop_line_y": y_coordinate}

@router.post("/test-alert")
async def test_alert():
    """Module 6: Manually test SMS email gateway and SMTP delivery."""
    sample_vio = {
        "violation_id": f"TEST-VIO-{uuid.uuid4().hex[:6].upper()}",
        "violation_type": "RED_LIGHT_CROSSING",
        "vehicle_type": "Car",
        "license_plate": "TEST-PLATE-01",
        "lane_id": "Lane 1",
        "timestamp": "2026-10-29T22:30:00",
        "details": "Manual diagnostic verification of Google SMTP & carrier gateway route."
    }
    sent = await notification_service.send_violation_alert(sample_vio)
    return {
        "status": "success" if sent else "simulated",
        "delivered": sent,
        "message": "Test alert dispatched to carrier gateway and email." if sent else "Credentials not fully configured. Notification logged locally."
    }

@router.websocket("/ws/traffic")
async def websocket_traffic_endpoint(websocket: WebSocket):
    """Module 5: Real-Time Data Streaming channel for Dashboard"""
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection open & handle incoming client control messages
            data = await websocket.receive_text()
            # Heartbeat or client ping
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)
    except Exception:
        await ws_manager.disconnect(websocket)
