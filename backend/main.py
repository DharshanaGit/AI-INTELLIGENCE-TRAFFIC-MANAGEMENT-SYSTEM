import os
import json
import asyncio
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel

from database.db import init_db, get_db
from database.models import Violation, TrafficLog, HourlyReport, SystemSetting, PoliceOfficer
from core.video_processor import VideoPipelineManager
from core.hourly_logger import HourlyLogger
from core.email_dispatcher import SMTPEmailDispatcher

# Storage paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STORAGE_DIR = os.path.join(BASE_DIR, "storage")
SNAPSHOTS_DIR = os.path.join(STORAGE_DIR, "snapshots")
CHALLANS_DIR = os.path.join(STORAGE_DIR, "challans")
REPORTS_DIR = os.path.join(STORAGE_DIR, "reports")
SAMPLE_DATA_DIR = os.path.join(BASE_DIR, "sample_data")
os.makedirs(SNAPSHOTS_DIR, exist_ok=True)
os.makedirs(CHALLANS_DIR, exist_ok=True)
os.makedirs(REPORTS_DIR, exist_ok=True)
os.makedirs(SAMPLE_DATA_DIR, exist_ok=True)

# Initialize database schema and migrations
init_db()

# Initialize FastAPI App
app = FastAPI(
    title="Intelligent Traffic Management System (ITMS) API",
    description="Enterprise AI traffic surveillance, real OCR predictive engine, statutory Indian MV Act enforcement, and automated email dispatch",
    version="3.0.0"
)

# CORS setup for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:3000",
        "*"
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    import traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers={
            "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
            "Access-Control-Allow-Credentials": "true"
        }
    )

# Mount static asset folders for incident evidence and hourly reports
app.mount("/api/snapshots", StaticFiles(directory=SNAPSHOTS_DIR), name="snapshots")
app.mount("/api/reports-files", StaticFiles(directory=REPORTS_DIR), name="reports_files")

# Initialize Pipeline Manager & Subsystems
pipeline = VideoPipelineManager(storage_dir=STORAGE_DIR)
hourly_logger = HourlyLogger(reports_dir=REPORTS_DIR)
smtp_dispatcher = SMTPEmailDispatcher()

# In-memory recent system audit logs
system_event_logs: List[Dict[str, Any]] = [
    {
        "id": 1,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "level": "INFO",
        "subsystem": "CORE_BOOT",
        "message": "ITMS Production Server booted on port 8005 with PyTorch and YOLOv8."
    },
    {
        "id": 2,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "level": "INFO",
        "subsystem": "DATABASE",
        "message": "SQLite database verified. Indian Police hierarchy seeded with 8 ranks."
    },
    {
        "id": 3,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "level": "INFO",
        "subsystem": "LIVE_STANDBY",
        "message": "Live Surveillance initialized in standby radar state. Waiting for manual stream connection."
    }
]

def log_event(level: str, subsystem: str, message: str):
    log_entry = {
        "id": len(system_event_logs) + 1,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "level": level,
        "subsystem": subsystem,
        "message": message
    }
    system_event_logs.insert(0, log_entry)
    if len(system_event_logs) > 200:
        system_event_logs.pop()

@app.get("/api/challans/{filename}")
def get_challan_pdf(filename: str, db: Session = Depends(get_db)):
    """Serves existing challan PDF or generates it on-demand without blocking real-time video"""
    import re
    filepath = os.path.join(CHALLANS_DIR, filename)
    if os.path.exists(filepath):
        return FileResponse(filepath, media_type="application/pdf")
    
    match = re.search(r"challan_(\d+)", filename)
    if match:
        v_id = int(match.group(1))
        v = db.query(Violation).filter(Violation.id == v_id).first()
        if v:
            snap_path = os.path.join(SNAPSHOTS_DIR, v.snapshot_path) if v.snapshot_path else None
            v_dict = {
                "id": v.id,
                "timestamp": v.timestamp.isoformat() if v.timestamp else "",
                "vehicle_type": v.vehicle_type,
                "violation_type": v.violation_type,
                "legal_act_section": v.legal_act_section or "Section 112 r/w Section 183 MV Act",
                "penalty_range": v.penalty_range or "Rs. 1,000 - Rs. 2,000",
                "license_plate": v.license_plate,
                "confidence": v.confidence,
                "speed": v.speed,
                "lane_id": v.lane_id,
                "fine_amount": v.fine_amount,
                "status": v.status,
                "verification_status": v.verification_status or "Pending Review"
            }
            pdf_out = pipeline.challan_gen.generate_pdf(v_dict, snap_path)
            return FileResponse(pdf_out, media_type="application/pdf")
    raise HTTPException(status_code=404, detail="Challan PDF not found")

@app.on_event("startup")
async def on_startup():
    db = next(get_db())
    try:
        auto_setting = db.query(SystemSetting).filter(SystemSetting.key == "automation_config").first()
        if auto_setting and auto_setting.value:
            cfg = json.loads(auto_setting.value)
            hourly_logger.set_config(cfg.get("enabled", True), cfg.get("interval_seconds", 3600))
    except Exception as e:
        print(f"[Startup] Setting load note: {e}")
    finally:
        db.close()
    asyncio.create_task(hourly_logger.periodic_task(pipeline))

# ==========================================
# Pydantic Request Models
# ==========================================
class SignalOverrideRequest(BaseModel):
    lane_id: int
    duration_seconds: Optional[int] = 20

class ModelSelectRequest(BaseModel):
    model_name: str

class LoopRequest(BaseModel):
    loop: bool

class ModeSwitchRequest(BaseModel):
    mode: str # "live" or "footage"

class LiveConnectRequest(BaseModel):
    url: str

class FootageStartRequest(BaseModel):
    filename: Optional[str] = None

class FeedSelectRequest(BaseModel):
    feed_id: str

class ViolationVerifyRequest(BaseModel):
    status: str # "Verified", "Dismissed", "Under Review"
    notes: Optional[str] = ""

class AutomationConfigRequest(BaseModel):
    enabled: bool
    interval_seconds: int

class SMTPConfigRequest(BaseModel):
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    sender_email: str
    app_password: str
    use_tls: bool = True
    control_center_email: Optional[str] = "control.center@itms.gov.in"
    division_inspector_email: Optional[str] = "inspector.div1@itms.gov.in"
    traffic_head_email: Optional[str] = "sp.traffic@itms.gov.in"

class SendReportEmailRequest(BaseModel):
    report_id: Optional[int] = None
    custom_message: Optional[str] = ""

class PoliceOfficerCreate(BaseModel):
    badge_id: str
    name: str
    rank: str
    role: str
    city: str
    zone: str
    sub_division: str
    station: str
    assigned_cameras: Optional[str] = "All Grid Nodes"
    status: Optional[str] = "Active / On-Duty"
    contact_number: Optional[str] = "+91 94454 00000"

class PoliceOfficerUpdate(BaseModel):
    assigned_cameras: Optional[str] = None
    zone: Optional[str] = None
    station: Optional[str] = None
    status: Optional[str] = None
    contact_number: Optional[str] = None

class AIConfigRequest(BaseModel):
    conf_threshold: float = 0.28
    iou_threshold: float = 0.45
    blur_threshold: float = 65.0
    speed_limit_car: float = 50.0
    speed_limit_truck: float = 40.0

# ==========================================
# Core Video Stream & Live Stats
# ==========================================
@app.get("/")
def root():
    return {
        "system": "TrafficSense AI - Intelligent Traffic Management System",
        "version": "3.0.0",
        "status": "Online",
        "cv_engine": "YOLOv8 + ByteTrack + Real OCR + Dynamic Signal Control",
        "docs_url": "/docs"
    }

async def frame_generator():
    """Generates continuous MJPEG video stream from the computer vision pipeline at smooth 25-30 FPS"""
    last_frame = None
    while True:
        frame_bytes, _ = pipeline.get_stream_frame()
        if frame_bytes and frame_bytes is not last_frame:
            last_frame = frame_bytes
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        await asyncio.sleep(0.015)

@app.get("/api/video_feed")
async def video_feed():
    """Live MJPEG video stream with bounding boxes, signal overlays, and speed tags"""
    return StreamingResponse(
        frame_generator(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@app.get("/api/stats")
def get_live_stats():
    """Returns latest telemetry, vehicle queue counts, signal statuses, and census breakdown"""
    if pipeline.last_stats:
        stats = pipeline.last_stats.copy()
    else:
        stats = {
            "total_vehicles": 0,
            "congestion_index": 0,
            "lane_counts": {1: 0, 2: 0, 3: 0, 4: 0},
            "signal_state": pipeline.signal_controller.get_states(),
            "vehicle_census": pipeline.vehicle_class_counts.copy(),
            "new_violations": []
        }
    stats["vehicle_census"] = pipeline._normalize_census(stats.get("vehicle_census", pipeline.vehicle_class_counts))
    return stats

# ==========================================
# Mode 1: Live Surveillance Controls
# ==========================================
@app.get("/api/live/status")
def get_live_status():
    """Returns live connection status, active URL, FPS, and latency"""
    return pipeline.get_live_status()

@app.post("/api/live/connect")
def connect_live_stream(req: LiveConnectRequest):
    """Manually connects to a verified public RTSP, HLS, or MJPEG stream"""
    res = pipeline.connect_live_stream(req.url)
    if not res.get("success"):
        log_event("WARNING", "LIVE_STREAM", f"Live connect failed for: {req.url} - {res.get('error')}")
        raise HTTPException(status_code=400, detail=res.get("error", "Failed to connect to stream"))
    log_event("SUCCESS", "LIVE_STREAM", f"Connected to live surveillance stream: {req.url}")
    return res

@app.post("/api/live/disconnect")
def disconnect_live_stream():
    """Disconnects live stream and returns pipeline to Live Standby Radar mode"""
    res = pipeline.disconnect_live_stream()
    log_event("INFO", "LIVE_STREAM", "Live stream disconnected. Reverted to Standby Radar Monitor.")
    return res

# ==========================================
# Mode 2: Recorded Footage 1-Time Analysis
# ==========================================
@app.get("/api/footage/status")
def get_footage_status():
    """Returns footage playback progress (0-100%), pause state, and single-pass completion flag"""
    return pipeline.get_footage_status()

@app.post("/api/footage/start")
def start_footage(req: FootageStartRequest):
    """Starts single-pass 1-time run of specified or loaded footage"""
    res = pipeline.start_footage_analysis(req.filename)
    if isinstance(res, tuple):
        success, msg = res
    elif isinstance(res, dict):
        success = res.get("success", True)
        msg = res.get("message", "")
    else:
        success = bool(res)
        msg = str(res)

    if not success:
        raise HTTPException(status_code=400, detail=msg or "Failed to start footage analysis")
    log_event("INFO", "FOOTAGE_ANALYSIS", f"Started forensic analysis on: {req.filename}")
    return {"success": True, "message": msg, "filename": req.filename}

@app.post("/api/footage/pause")
def pause_footage():
    pipeline.pause()
    return {"message": "Footage analysis paused", "status": pipeline.get_footage_status()}

@app.post("/api/footage/resume")
def resume_footage():
    pipeline.resume()
    return {"message": "Footage analysis resumed", "status": pipeline.get_footage_status()}

@app.post("/api/footage/restart")
def restart_footage():
    """Restarts footage analysis from frame 0 for a fresh 1-time run"""
    pipeline.restart_footage()
    log_event("INFO", "FOOTAGE_ANALYSIS", "Footage analysis restarted from frame 0.")
    return {"message": "Footage restarted from frame 0", "status": pipeline.get_footage_status()}

@app.post("/api/footage/loop")
def toggle_footage_loop(req: LoopRequest):
    pipeline.set_loop(req.loop)
    return {"message": f"Footage loop set to {req.loop}", "loop": req.loop, "status": pipeline.get_footage_status()}

# ==========================================
# Violations & Statutory Proof Ledger
# ==========================================
@app.get("/api/violations")
def get_violations(limit: int = 50, db: Session = Depends(get_db)):
    """Fetches list of registered traffic violations mapped to Indian Motor Vehicles Act sections"""
    records = db.query(Violation).order_by(Violation.id.desc()).limit(limit).all()
    results = []
    for r in records:
        candidates = []
        if r.candidates_json:
            try:
                candidates = json.loads(r.candidates_json)
            except Exception:
                candidates = []
        results.append({
            "id": r.id,
            "timestamp": r.timestamp.isoformat(),
            "vehicle_id": r.vehicle_id,
            "vehicle_type": r.vehicle_type,
            "violation_type": r.violation_type,
            "legal_act_section": r.legal_act_section or "Section 112 r/w Section 183 MV Act",
            "legal_act_rule": r.legal_act_rule or "CMVR Rule 118",
            "penalty_range": r.penalty_range or "Rs. 1,000 - Rs. 2,000",
            "license_plate": r.license_plate,
            "confidence": r.confidence,
            "is_blurry": bool(r.is_blurry),
            "blur_score": r.blur_score,
            "candidates": candidates,
            "speed": r.speed,
            "lane_id": r.lane_id,
            "snapshot_url": f"/api/snapshots/{r.snapshot_path}" if r.snapshot_path else None,
            "challan_url": f"/api/challans/{r.challan_pdf_path}" if r.challan_pdf_path else None,
            "status": r.status,
            "verification_status": r.verification_status or "Pending Review",
            "fine_amount": r.fine_amount
        })
    return results

@app.post("/api/violations/{violation_id}/verify")
def verify_violation(violation_id: int, req: ViolationVerifyRequest, db: Session = Depends(get_db)):
    """Manual verification action by authorized officer: 'Verified', 'Dismissed', or 'Under Review'"""
    v = db.query(Violation).filter(Violation.id == violation_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Violation record not found")
    
    v.verification_status = req.status
    if req.status == "Verified":
        v.status = "Issued"
    elif req.status == "Dismissed":
        v.status = "Dismissed"
    
    db.commit()
    log_event("INFO", "VIOLATION_AUDIT", f"Violation #{violation_id} verified as '{req.status}' by Officer.")
    return {
        "message": f"Violation #{violation_id} successfully marked as {req.status}",
        "violation_id": violation_id,
        "verification_status": v.verification_status,
        "status": v.status
    }

@app.post("/api/violations/{violation_id}/pay")
def pay_challan(violation_id: int, db: Session = Depends(get_db)):
    """Simulates online payment of a traffic violation fine"""
    v = db.query(Violation).filter(Violation.id == violation_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Violation record not found")
    v.status = "Paid"
    db.commit()
    log_event("INFO", "PAYMENT", f"Violation #{violation_id} fine of Rs. {v.fine_amount} recorded as Paid.")
    return {"message": f"Violation #{violation_id} successfully marked as Paid.", "status": "Paid"}

@app.post("/api/signal/override")
def override_signal(req: SignalOverrideRequest):
    """Manually forces a green light for an emergency or traffic clearance"""
    if req.lane_id not in [1, 2, 3, 4]:
        raise HTTPException(status_code=400, detail="Invalid lane ID. Must be 1, 2, 3, or 4.")
    
    pipeline.signal_controller.emergency_override = True
    pipeline.signal_controller.emergency_lane = req.lane_id
    pipeline.signal_controller.active_green_lane = req.lane_id
    pipeline.signal_controller.phase_state = "GREEN"
    pipeline.signal_controller.time_in_phase = 0.0
    pipeline.signal_controller.current_phase_duration = float(req.duration_seconds)
    
    log_event("WARNING", "SIGNAL_CONTROL", f"Emergency Signal Override activated for Lane {req.lane_id} ({req.duration_seconds}s).")
    return {
        "message": f"Manual signal override activated for Lane {req.lane_id}",
        "lane_id": req.lane_id,
        "duration": req.duration_seconds
    }

# ==========================================
# Video Feed & Upload Management
# ==========================================
@app.get("/api/feed/list")
def list_available_feeds():
    """Returns CCTV footage archive and live surveillance stream nodes"""
    sample_dir = os.path.join(BASE_DIR, "sample_data")
    files = [
        {
            "id": "https://stream.aqi.in/live/03880002000614d3dbef.m3u8",
            "name": "Tamil Nadu: Tiruppur (Kuppuchipalayam) Live CCTV (1080p)",
            "type": "live_stream",
            "quality": "high",
            "size_mb": 0.0,
            "filename": "tiruppur_kuppuchipalayam_live"
        },
        {
            "id": "https://view.custardlev.uk/video_feed",
            "name": "Live Street Surveillance CCTV (view.custardlev.uk)",
            "type": "live_stream",
            "quality": "average",
            "size_mb": 0.0,
            "filename": "custardlev_live_stream"
        }
    ]

    CCTV_LABELS = {
        "indian_traffic_signal_violation.mp4": "Indian CCTV: Red Light Signal Violation & Intersection (746 frames)",
        "indian_cctv_junction_flow.mp4": "Indian CCTV: City Junction Mixed Traffic & Violations",
        "indian_expressway_violations.mp4": "Indian Highway: Expressway Speeding & Lane Violation CCTV",
        "madurai_highway.mp4": "Madurai - NH44 Southern Highway (Tamil Nadu CCTV)",
        "indian_arterial_traffic.mp4": "Indian Urban Arterial Corridor (High-Density Flow)",
        "indian_city_junction.mkv": "Indian Multi-Modal City Junction (Bikes, Autos & Cars)",
        "madurai_highway.mp4": "Madurai - NH44 Southern Highway (Tamil Nadu CCTV)",
        "indian_arterial_traffic.mp4": "Indian Urban Arterial Corridor (High-Density Flow)",
        "indian_city_junction.mkv": "Indian Multi-Modal City Junction (Bikes, Autos & Cars)",
        "traffic.mp4": "Uploaded Traffic Clip (Forensic CCTV)",
        "v1.mp4": "Indian Highway - Corridor Alpha (4K CCTV)",
        "v2.mp4": "Urban Arterial Road - Sector Beta (4K CCTV)",
        "v3.mp4": "City Junction - Mixed Traffic Flow (4K CCTV)",
        "v4.mp4": "National Highway - Heavy Vehicle Corridor (4K CCTV)",
        "v5.mp4": "Suburban Intersection - Peak Hour (4K CCTV)",
        "v6.mp4": "Two-Lane Road - Rural-Urban Transition (4K CCTV)",
        "v7.mp4": "Signal Junction - Multi-Modal Traffic (4K CCTV)",
        "v8.mp4": "Flyover Approach - Merge Zone (4K CCTV)",
        "v9.mp4": "Ring Road - High Speed Corridor (4K CCTV)",
        "v10.mp4": "Market Area - Congested Zone (4K CCTV)",
        "v11.mp4": "Industrial Belt - Truck Route (4K CCTV)",
        "v12.mp4": "Residential Colony - Low Speed Zone (4K CCTV)",
        "v13.mp4": "Bus Stand Approach - Public Transit (4K CCTV)",
        "v14.mp4": "Bridge Corridor - Elevated Section (4K CCTV)",
        "v15.mp4": "School Zone - Pedestrian Heavy (4K CCTV)",
        "v16.mp4": "Hospital Road - Emergency Route (4K CCTV)",
        "v17.mp4": "IT Park Access - Tech Corridor (4K CCTV)",
        "v18.mp4": "Railway Crossing - Level Crossing (4K CCTV)",
        "v19.mp4": "Temple Road - Festival Traffic (4K CCTV)",
        "v20.mp4": "Service Road - Parallel Flow (4K CCTV)",
        "v21.mp4": "Roundabout - Rotary Traffic (4K CCTV)",
        "v22.mp4": "State Highway - Inter-District (4K CCTV)",
        "v23.mp4": "College Zone - Two-Wheeler Dense (4K CCTV)",
        "v24.mp4": "Commercial Hub - Delivery Vehicle Zone (4K CCTV)",
        "v25.mp4": "Bypass Road - Express Corridor (4K CCTV)",
        "v26.mp4": "Old City - Narrow Lane Traffic (4K CCTV)",
        "v27.mp4": "Toll Plaza Approach - Queue Zone (4K CCTV)",
    }

    if os.path.exists(sample_dir):
        import re
        def _sort_key(fn):
            m = re.search(r'v(\d+)', fn)
            return int(m.group(1)) if m else 999

        for f in sorted(os.listdir(sample_dir), key=_sort_key):
            if f.endswith((".mp4", ".avi", ".mkv")):
                p = os.path.join(sample_dir, f)
                label = CCTV_LABELS.get(f, f.replace("_", " ").replace(".mp4", "").title())
                files.append({
                    "id": f,
                    "name": label,
                    "type": "custom_upload" if f not in CCTV_LABELS else "footage_recording",
                    "quality": "high",
                    "resolution": "3840x2160",
                    "size_mb": round(os.path.getsize(p) / (1024 * 1024), 2),
                    "filename": f,
                    "is_custom": f not in CCTV_LABELS
                })

    return {
        "active_source": pipeline.custom_video_source or ("Live Stream" if "Live" in pipeline.mode_source else "None Loaded"),
        "active_mode": pipeline.mode_source,
        "available_feeds": files
    }

@app.post("/api/feed/select")
def select_feed(req: FeedSelectRequest):
    """Selects a feed respecting Live vs Footage mode constraints"""
    feed = req.feed_id
    if feed.startswith("http://") or feed.startswith("https://") or feed.startswith("rtsp://"):
        res = pipeline.connect_live_stream(feed)
        return {"message": f"Connected to live web surveillance stream: {feed}", "source": feed, "result": res}

    if "Live" in pipeline.mode_source:
        raise HTTPException(
            status_code=400,
            detail="Cannot open recorded CCTV footage in Live Surveillance mode. Switch to Footage Mode to analyze recorded video files."
        )

    res = pipeline.start_footage_analysis(feed)
    return {"message": f"Loaded recorded footage: {feed} (Single-Pass 1-Time Run)", "source": feed, "result": res}

@app.delete("/api/feed/{filename}")
@app.post("/api/feed/{filename}/remove")
def remove_feed_video(filename: str):
    """Deletes a video file from sample_data and unloads it if currently active"""
    sample_dir = os.path.join(BASE_DIR, "sample_data")
    file_path = os.path.join(sample_dir, filename)
    
    # Unload from pipeline if currently playing
    if pipeline.custom_video_source and (os.path.basename(pipeline.custom_video_source) == filename or filename in pipeline.custom_video_source):
        with pipeline.cap_lock:
            if pipeline.cap:
                pipeline.cap.release()
                pipeline.cap = None
            pipeline.footage_loaded = False
            pipeline.analysis_in_progress = False
            pipeline.analysis_complete = False
            pipeline.custom_video_source = None
            pipeline.frame_idx = 0
            pipeline.total_frames = 1
            pipeline.last_real_frame = None
            pipeline.last_annotated_frame = None
        log_event("INFO", "VIDEO_UNLOAD", f"Unloaded active video {filename}")

    if os.path.exists(file_path):
        try:
            os.remove(file_path)
            log_event("INFO", "VIDEO_DELETE", f"Removed video file {filename}")
            return {"success": True, "message": f"Successfully deleted video {filename}"}
        except Exception as e:
            log_event("ERROR", "VIDEO_DELETE", f"Failed to delete {filename}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to delete video file: {str(e)}")
    else:
        return {"success": True, "message": f"Video {filename} unloaded from active state."}

@app.post("/api/feed/upload")
async def upload_video(file: UploadFile = File(...)):
    """Uploads custom traffic MP4 video clip to process in Footage Mode"""
    try:
        sample_dir = os.path.join(BASE_DIR, "sample_data")
        os.makedirs(sample_dir, exist_ok=True)
        save_path = os.path.join(sample_dir, file.filename)
        with open(save_path, "wb") as buffer:
            while chunk := await file.read(1024 * 1024):
                buffer.write(chunk)
        res = pipeline.start_footage_analysis(save_path)
        log_event("INFO", "UPLOAD", f"Uploaded user footage: {file.filename}")
        return {"message": f"Custom traffic video loaded: {file.filename} for forensic examination", "path": save_path, "result": res}
    except Exception as e:
        log_event("ERROR", "UPLOAD", f"Failed to process uploaded video {file.filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process uploaded video: {str(e)}")

# ==========================================
# Dual-Mode Switching
# ==========================================
@app.get("/api/mode/current")
def get_current_mode():
    return {
        "active_mode": "live" if "Live" in pipeline.mode_source else "footage",
        "mode_source": pipeline.mode_source,
        "current_source": pipeline.custom_video_source or ("Standby Radar" if "Live" in pipeline.mode_source else "No Video Selected")
    }

@app.post("/api/mode/switch")
def switch_system_mode(req: ModeSwitchRequest):
    """Switches the operating mode between Live Surveillance and Footage Upload"""
    if req.mode == "live":
        pipeline.disconnect_live_stream()
        log_event("INFO", "MODE_SWITCH", "Switched to Mode 1: Live Surveillance (Standby Radar).")
    else:
        pipeline.mode_source = "Footage Upload Analysis"
        pipeline.is_live_stream = False
        log_event("INFO", "MODE_SWITCH", "Switched to Mode 2: Recorded Footage Repository & Analysis.")
    return {
        "status": "Mode Switched",
        "active_mode": req.mode,
        "mode_source": pipeline.mode_source
    }

# ==========================================
# Forensic Inspection & ANPR Plate Ledger
# ==========================================
@app.get("/api/reports/footage-audit")
def get_footage_audit_report():
    return pipeline.get_session_audit_report()

@app.get("/api/anpr/captured-plates")
def get_captured_plates(limit: int = 60):
    """Returns the live ledger of license plates captured by the OCR & Predictive Engine"""
    return {
        "total_captured": len(pipeline.captured_plates),
        "plates": pipeline.captured_plates[:limit]
    }

# ==========================================
# Automated Logger Timing & History
# ==========================================
@app.get("/api/automation/config")
def get_automation_config():
    """Returns current automation logging interval, enabled status, and next scheduled run"""
    return hourly_logger.get_config()

@app.post("/api/automation/config")
def update_automation_config(req: AutomationConfigRequest, db: Session = Depends(get_db)):
    """Updates automation logging interval (e.g. 15m, 30m, 1h, 2h) and ON/OFF switch"""
    hourly_logger.set_config(req.enabled, req.interval_seconds)
    
    setting = db.query(SystemSetting).filter(SystemSetting.key == "automation_config").first()
    cfg_json = json.dumps({"enabled": req.enabled, "interval_seconds": req.interval_seconds})
    if setting:
        setting.value = cfg_json
    else:
        db.add(SystemSetting(key="automation_config", value=cfg_json))
    db.commit()

    log_event("INFO", "AUTOMATION", f"Automated logger updated: Enabled={req.enabled}, Interval={req.interval_seconds}s.")
    return {
        "message": "Automation logger configuration updated successfully",
        "config": hourly_logger.get_config()
    }

@app.get("/api/reports/hourly")
def get_hourly_reports(limit: int = 24, db: Session = Depends(get_db)):
    """Returns historical auto-saved hourly audit reports"""
    reports = db.query(HourlyReport).order_by(HourlyReport.id.desc()).limit(limit).all()
    results = []
    for r in reports:
        results.append({
            "id": r.id,
            "timestamp": r.timestamp.isoformat(),
            "start_time": r.start_time.isoformat() if r.start_time else None,
            "end_time": r.end_time.isoformat() if r.end_time else None,
            "hour_label": r.hour_label,
            "total_vehicles": r.total_vehicles,
            "cars_count": r.cars_count,
            "two_wheelers_count": r.two_wheelers_count,
            "auto_rickshaws_count": r.auto_rickshaws_count,
            "buses_count": r.buses_count,
            "trucks_count": r.trucks_count,
            "pedestrians_count": r.pedestrians_count or 0,
            "children_count": r.children_count or 0,
            "total_violations": r.total_violations,
            "fines_issued": r.fines_issued,
            "avg_congestion": r.avg_congestion,
            "mode_source": r.mode_source,
            "report_filename": r.report_filename,
            "download_url": f"/api/reports-files/{r.report_filename}" if r.report_filename else None
        })
    return results

@app.post("/api/reports/hourly/generate-now")
def trigger_hourly_report_now():
    """Forces immediate generation and archiving of a traffic audit report"""
    res = hourly_logger.generate_hourly_report(pipeline, mode_source=pipeline.mode_source)
    log_event("SUCCESS", "REPORT_GEN", f"Forensic Hourly Report generated: {res.get('report_filename')}")
    return {"message": "Traffic audit report successfully archived", "report": res}

# ==========================================
# Indian Police Administration Hierarchy & Mapping
# ==========================================
@app.get("/api/police/officers")
def get_police_officers(db: Session = Depends(get_db)):
    """Returns list of all registered police officers across Indian Police Administration ranks"""
    officers = db.query(PoliceOfficer).all()
    rank_order = {
        "Director General of Police (DGP)": 1,
        "Additional Director General of Police (ADGP)": 2,
        "Commissioner of Police (CoP)": 3,
        "Deputy Commissioner of Police (DCP - Traffic)": 4,
        "Assistant Commissioner of Police (ACP)": 5,
        "Traffic Inspector (TI)": 6,
        "Sub-Inspector of Police (SI)": 7,
        "Head Constable (HC - Traffic)": 8,
        "Constable (PC - Traffic)": 9
    }
    officers_sorted = sorted(officers, key=lambda o: rank_order.get(o.rank, 99))
    return [
        {
            "id": o.id,
            "badge_id": o.badge_id,
            "name": o.name,
            "rank": o.rank,
            "role": o.role,
            "city": o.city,
            "zone": o.zone,
            "sub_division": o.sub_division,
            "station": o.station,
            "assigned_cameras": o.assigned_cameras,
            "status": o.status,
            "contact_number": o.contact_number,
            "created_at": o.created_at.isoformat() if o.created_at else None
        }
        for o in officers_sorted
    ]

@app.post("/api/police/officers")
def create_police_officer(req: PoliceOfficerCreate, db: Session = Depends(get_db)):
    """Registers a new officer into the jurisdictional roster"""
    existing = db.query(PoliceOfficer).filter(PoliceOfficer.badge_id == req.badge_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Officer with this Badge ID already exists.")
    
    officer = PoliceOfficer(
        badge_id=req.badge_id,
        name=req.name,
        rank=req.rank,
        role=req.role,
        city=req.city,
        zone=req.zone,
        sub_division=req.sub_division,
        station=req.station,
        assigned_cameras=req.assigned_cameras or "All Grid Nodes",
        status=req.status or "Active / On-Duty",
        contact_number=req.contact_number or "+91 94454 00000"
    )
    db.add(officer)
    db.commit()
    log_event("INFO", "POLICE_ROSTER", f"New officer registered: {officer.name} ({officer.rank}) - Badge: {officer.badge_id}")
    return {"message": "Officer registered successfully", "badge_id": officer.badge_id}

@app.put("/api/police/officers/{badge_id}")
def update_police_officer(badge_id: str, req: PoliceOfficerUpdate, db: Session = Depends(get_db)):
    """Updates an officer's assigned camera nodes, jurisdictional zone, or duty status"""
    officer = db.query(PoliceOfficer).filter(PoliceOfficer.badge_id == badge_id).first()
    if not officer:
        raise HTTPException(status_code=404, detail="Officer not found")
    
    if req.assigned_cameras is not None:
        officer.assigned_cameras = req.assigned_cameras
    if req.zone is not None:
        officer.zone = req.zone
    if req.station is not None:
        officer.station = req.station
    if req.status is not None:
        officer.status = req.status
    if req.contact_number is not None:
        officer.contact_number = req.contact_number
    
    db.commit()
    log_event("INFO", "POLICE_MAPPING", f"Officer {officer.name} ({badge_id}) jurisdictional mapping updated: Cameras={officer.assigned_cameras}")
    return {"message": "Officer mapping updated successfully", "badge_id": badge_id}

@app.delete("/api/police/officers/{badge_id}")
def delete_police_officer(badge_id: str, db: Session = Depends(get_db)):
    """Removes an officer from active ITMS assignment"""
    officer = db.query(PoliceOfficer).filter(PoliceOfficer.badge_id == badge_id).first()
    if not officer:
        raise HTTPException(status_code=404, detail="Officer not found")
    
    db.delete(officer)
    db.commit()
    log_event("WARNING", "POLICE_ROSTER", f"Officer removed: {officer.name} ({badge_id})")
    return {"message": f"Officer {badge_id} removed from roster"}

# ==========================================
# Comprehensive Settings Endpoints
# ==========================================
@app.get("/api/settings/overview")
def get_settings_overview(db: Session = Depends(get_db)):
    """Returns system-wide diagnostics, storage metrics, DB sizes, and active model state"""
    db_path = os.path.join(BASE_DIR, "traffic_system.db")
    db_size_mb = round(os.path.getsize(db_path) / (1024 * 1024), 2) if os.path.exists(db_path) else 0.0

    violations_count = db.query(Violation).count()
    hourly_count = db.query(HourlyReport).count()
    officers_count = db.query(PoliceOfficer).count()
    
    snapshots_count = len(os.listdir(SNAPSHOTS_DIR)) if os.path.exists(SNAPSHOTS_DIR) else 0
    challans_count = len(os.listdir(CHALLANS_DIR)) if os.path.exists(CHALLANS_DIR) else 0

    return {
        "status": "Operational",
        "database": {
            "engine": "SQLite 3",
            "db_path": db_path,
            "size_mb": db_size_mb,
            "violations_records": violations_count,
            "hourly_reports": hourly_count,
            "police_officers": officers_count
        },
        "storage": {
            "snapshots_stored": snapshots_count,
            "challans_stored": challans_count,
            "reports_directory": REPORTS_DIR
        },
        "ai_engine": {
            "active_model": pipeline.detector.current_model_name,
            "device": pipeline.detector.device.upper(),
            "conf_threshold": pipeline.detector.conf_threshold,
            "iou_threshold": pipeline.detector.iou_threshold
        },
        "jurisdiction": {
            "state": "Tamil Nadu",
            "city": "Coimbatore / Chennai",
            "lead_officer": "Dharshana B, Sub-Inspector (SI)"
        }
    }

@app.get("/api/settings/ai-config")
def get_ai_config(db: Session = Depends(get_db)):
    setting = db.query(SystemSetting).filter(SystemSetting.key == "ai_config").first()
    if setting and setting.value:
        return json.loads(setting.value)
    return {
        "conf_threshold": pipeline.detector.conf_threshold,
        "iou_threshold": pipeline.detector.iou_threshold,
        "blur_threshold": 65.0,
        "speed_limit_car": 50.0,
        "speed_limit_truck": 40.0
    }

@app.post("/api/settings/ai-config")
def update_ai_config(req: AIConfigRequest, db: Session = Depends(get_db)):
    pipeline.detector.conf_threshold = req.conf_threshold
    pipeline.detector.iou_threshold = req.iou_threshold

    setting = db.query(SystemSetting).filter(SystemSetting.key == "ai_config").first()
    val = json.dumps(req.dict())
    if setting:
        setting.value = val
    else:
        db.add(SystemSetting(key="ai_config", value=val))
    db.commit()

    log_event("INFO", "AI_CONFIG", f"AI detection thresholds updated: Conf={req.conf_threshold}, IoU={req.iou_threshold}")
    return {"message": "AI detection configuration updated successfully", "config": req.dict()}

@app.post("/api/settings/database/vacuum")
def vacuum_database(db: Session = Depends(get_db)):
    """Executes SQLite VACUUM to reclaim deleted disk space and optimize indices"""
    db_path = os.path.join(BASE_DIR, "traffic_system.db")
    before_size = os.path.getsize(db_path) if os.path.exists(db_path) else 0

    db.execute(text("VACUUM;"))
    db.commit()

    after_size = os.path.getsize(db_path) if os.path.exists(db_path) else 0
    reclaimed_kb = round((before_size - after_size) / 1024, 2)

    log_event("INFO", "DATABASE", f"Database optimized and vacuumed. Reclaimed: {reclaimed_kb} KB.")
    return {
        "status": "Success",
        "message": f"Database optimized. Reclaimed {reclaimed_kb} KB of disk space.",
        "size_before_bytes": before_size,
        "size_after_bytes": after_size
    }

@app.get("/api/system/logs")
def get_system_logs(limit: int = 50):
    """Returns live backend system events and audit trail"""
    return system_event_logs[:limit]

# ==========================================
# SMTP Settings & Email Dispatcher
# ==========================================
@app.get("/api/settings/smtp")
def get_smtp_settings(db: Session = Depends(get_db)):
    """Retrieves saved SMTP settings (masking password)"""
    setting = db.query(SystemSetting).filter(SystemSetting.key == "smtp_config").first()
    if not setting or not setting.value:
        return {
            "smtp_host": "smtp.gmail.com",
            "smtp_port": 587,
            "sender_email": "",
            "app_password": "",
            "has_password": False,
            "use_tls": True,
            "control_center_email": "control.center@itms.gov.in",
            "division_inspector_email": "inspector.div1@itms.gov.in",
            "traffic_head_email": "sp.traffic@itms.gov.in"
        }
    data = json.loads(setting.value)
    data["has_password"] = bool(data.get("app_password"))
    data["app_password"] = "••••••••••••••••" if data["has_password"] else ""
    return data

@app.post("/api/settings/smtp")
def save_smtp_settings(req: SMTPConfigRequest, db: Session = Depends(get_db)):
    """Stores SMTP Gmail credentials and distribution list"""
    setting = db.query(SystemSetting).filter(SystemSetting.key == "smtp_config").first()
    
    payload = req.dict()
    if payload.get("app_password") == "••••••••••••••••" and setting and setting.value:
        existing = json.loads(setting.value)
        payload["app_password"] = existing.get("app_password", "")

    val_json = json.dumps(payload)
    if setting:
        setting.value = val_json
    else:
        db.add(SystemSetting(key="smtp_config", value=val_json))
    db.commit()

    log_event("INFO", "SMTP", f"SMTP credentials updated for: {req.sender_email}")
    return {"message": "SMTP configuration saved successfully!", "sender_email": req.sender_email}

@app.post("/api/settings/smtp/test")
def test_smtp_connection(req: SMTPConfigRequest, db: Session = Depends(get_db)):
    """Tests connection to SMTP server using Google App Password"""
    payload = req.dict()
    if payload.get("app_password") == "••••••••••••••••":
        setting = db.query(SystemSetting).filter(SystemSetting.key == "smtp_config").first()
        if setting and setting.value:
            existing = json.loads(setting.value)
            payload["app_password"] = existing.get("app_password", "")

    ok, msg = smtp_dispatcher.test_connection(payload)
    if not ok:
        log_event("WARNING", "SMTP", f"SMTP test failed: {msg}")
        raise HTTPException(status_code=400, detail=msg)
    log_event("SUCCESS", "SMTP", "SMTP connection test succeeded.")
    return {"status": "Success", "message": msg}

@app.post("/api/reports/send-email")
def send_report_email(req: SendReportEmailRequest, db: Session = Depends(get_db)):
    """Manually dispatches report to Control Center, Inspector, and Traffic Head"""
    setting = db.query(SystemSetting).filter(SystemSetting.key == "smtp_config").first()
    if not setting or not setting.value:
        raise HTTPException(status_code=400, detail="SMTP is not configured. Go to Settings to configure Gmail SMTP credentials.")

    smtp_conf = json.loads(setting.value)
    report_data = pipeline.get_session_audit_report()
    
    ok, msg = smtp_dispatcher.send_report_email(smtp_conf, report_data)
    if not ok:
        log_event("WARNING", "EMAIL_DISPATCH", f"Report email dispatch failed: {msg}")
        raise HTTPException(status_code=400, detail=msg)
    log_event("SUCCESS", "EMAIL_DISPATCH", f"Report successfully dispatched via SMTP to command center: {msg}")
    return {"status": "Success", "message": msg}

# ==========================================
# High-Capacity Model Selection
# ==========================================
@app.get("/api/model/available")
def get_available_models():
    models = [
        {
            "name": "yolov8m.pt",
            "tier": "High-Capacity Balanced",
            "params": "25.9M",
            "size_mb": 52.1,
            "description": "Enterprise-balanced model detecting Indian auto-rickshaws, bikes, buses, pedestrians, and occluded vehicles",
            "recommended": True
        },
        {
            "name": "yolov8x.pt",
            "tier": "Extra-Large Enterprise",
            "params": "68.2M",
            "size_mb": 136.9,
            "description": "Maximum accuracy model for sub-pixel boundary detection and heavy intersection density",
            "recommended": False
        },
        {
            "name": "yolov8n.pt",
            "tier": "Lightweight Baseline",
            "params": "3.2M",
            "size_mb": 6.5,
            "description": "Nano model for ultra-fast edge processing",
            "recommended": False
        }
    ]
    return {
        "active_model": pipeline.detector.current_model_name,
        "device": pipeline.detector.device.upper(),
        "models": models
    }

@app.post("/api/model/select")
def select_model(req: ModelSelectRequest):
    try:
        new_model = pipeline.switch_model(req.model_name)
        log_event("INFO", "MODEL_SWITCH", f"AI model switched to {new_model}.")
        return {"message": f"Successfully activated {new_model}", "active_model": new_model}
    except Exception as e:
        log_event("ERROR", "MODEL_SWITCH", f"Failed to switch model to {req.model_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to switch model: {str(e)}")

# ==========================================
# Telemetry WebSocket
# ==========================================
@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            stats = pipeline.last_stats.copy() if pipeline.last_stats else {}
            if stats:
                stats["vehicle_census"] = pipeline._normalize_census(stats.get("vehicle_census", pipeline.vehicle_class_counts))
                await websocket.send_json(stats)
            await asyncio.sleep(0.2)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8005, reload=True)
