# AI-Powered Intelligent Traffic Management System (ITMS)

An end-to-end computer vision and intelligent urban traffic control platform designed to monitor multi-lane intersections, track vehicles, enforce traffic violations, and dynamically optimize traffic light timings in real time.

---

## Key Highlights & Features

1. **Multi-Class Vehicle Detection (YOLOv8)**:
   - Detects and categorizes cars, motorcycles, buses, trucks, and emergency vehicles (ambulances).
   - Real-time CPU and GPU acceleration support.

2. **Multi-Object Tracking (MOT) & Trajectory Analysis**:
   - Tracks each vehicle with a persistent unique ID.
   - Computes real-time movement velocity vectors, path history, and calibrated ground-plane speed ($km/h$).

3. **Automated Traffic Violation Detection**:
   - **Signal Jumping**: Triggers when a vehicle crosses the virtual stop line while the lane signal is RED.
   - **Wrong-Way Driving**: Flags vehicles moving against the permitted lane direction vector.
   - **Overspeeding**: Measures calibrated vehicular speed against intersection speed limits.

4. **Automated Number Plate Recognition (ANPR)**:
   - Extracts license plate strings upon violation.
   - Crops and annotates photographic evidence snapshots.

5. **Dynamic Adaptive Traffic Signal Control**:
   - Adjusts green light durations dynamically based on real-time vehicle queue density.
   - **Emergency Vehicle Preemption**: Instantly forces a GREEN signal to clear path whenever an ambulance or emergency vehicle approaches.

6. **Automated Digital E-Challan PDF Generator**:
   - Generates official PDF tickets containing camera ID, timestamp, license plate, violation description, penalty amount, and photographic evidence.

7. **High-Tech Control Center Dashboard**:
   - Real-time MJPEG live camera stream with AI HUD bounding boxes and trajectory trails.
   - Interactive 4-lane signal visualizer with countdown timers and manual override buttons.
   - Live telemetry charts, congestion gauges, and filterable violation incident logs.

---

## System Architecture

```
[Camera Feed / Video / Synthetic Generator]
                  │
                  ▼
         [YOLOv8 Object Detector]
                  │
                  ▼
        [Multi-Object Tracker]
      (Persistent IDs & Trajectories)
        │                       │
        ▼                       ▼
 [Violation Engine]      [Adaptive Signal Controller]
 (Red Light, Wrong Way)  (Queue Density & Emergency Preemption)
        │                       │
        ▼                       ▼
 [ANPR & E-Challan Gen]  [WebSocket & REST API (FastAPI)]
        │                       │
        └───────────┬───────────┘
                    ▼
       [React Command Center UI]
```

---

## Quick Start Guide

### Option A: One-Click Launch (Windows)
Double-click:
```bat
start_all.bat
```
This automatically launches both the FastAPI backend and the React frontend in separate command windows.

### Option B: Manual Startup

#### 1. Backend:
```bash
cd backend
.venv\Scripts\activate
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```
* Backend API & Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
* Live Video Stream: [http://localhost:8000/api/video_feed](http://localhost:8000/api/video_feed)

#### 2. Frontend:
```bash
cd frontend
npm run dev
```
* Dashboard URL: [http://localhost:5173](http://localhost:5173)

---

## Tech Stack
* **Computer Vision & AI**: Python 3.11, Ultralytics YOLOv8, OpenCV, NumPy, ByteTrack / Centroid Tracking.
* **Backend**: FastAPI, Uvicorn, WebSockets, SQLAlchemy, SQLite, ReportLab (PDF Generation).
* **Frontend**: React 19, Vite, Tailwind CSS / Custom Glassmorphism, Lucide Icons.
