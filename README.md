# AI Intelligent Traffic Management System

A real-time, cloud-assisted traffic management and violation enforcement platform powered by **OpenCV frame stabilization**, **Google Gemini Vision Flash**, **FastAPI (Python)**, **MongoDB Atlas**, and a **React.js Dashboard**.

---

## Architecture & Modules Implemented

### 🚗 Module 1: Video Processing & Stabilization Pipeline
- **Ingestion**: Accepts `.mp4`, `.avi`, and `.mov` video uploads via `multipart/form-data` with temporary file buffering.
- **OpenCV Pipeline**: Normalizes video stream to standard 720p resolution ($1280 \times 720$).
- **Frame Stabilization**: Applies Lucas-Kanade optical flow tracking and affine transformation smoothing to eliminate camera vibrations from wind and heavy vehicles.

### 🧠 Module 2: Object Detection & Classification
- **Cloud Vision Dispatch**: Sends video keyframes to **Google Gemini Flash API** (`gemini-3.5-flash` / `gemini-3.8-flash`).
- **Visual Classification**: Categorizes vehicles into `Cars`, `Buses`, `Trucks`, `Two-wheelers`, `Ambulances`, and `Fire Engines` with normalized 2D bounding boxes `[ymin, xmin, ymax, xmax]`.
- **Non-blocking Flow**: Utilizes high-speed local computer vision tracking between cloud inference intervals for continuous ~20 FPS dashboard rendering.

### 🚨 Module 3: Traffic Violation & License Plate OCR
- **Scenario A (Red-Light Crossing)**: Tests intersection stop-line coordinate crossings when the active lane signal is `RED`.
- **Scenario B (Wrong-Way Driving)**: Computes the cosine similarity of vehicle motion direction vectors against established lane trajectories ($\cos\theta < -0.6$).
- **License Plate OCR Extraction**: Crops vehicle bumper regions and extracts alphanumeric license plate text via Gemini Vision OCR, storing evidence snapshots in `backend/uploads/violations/`.

### 🚦 Module 4: Dynamic Adaptive Signal Controller
- **Spatial Weighted Density**: Computes physical lane occupancy:
  - $\text{Bus} = 4\times \text{Car}$
  - $\text{Truck} = 3.5\times \text{Car}$
  - $\text{Two-wheeler} = 0.5\times \text{Car}$
- **Adaptive Matrix Rule**: If $\text{Lane 1 Density} \ge 75\%$ and $\text{Lane 2 Density} \le 20\%$, dynamically extends the green light timer by $+20$ seconds.
- **Emergency Preemption ("Green Wall")**: Detecting an `Ambulance` or `Fire Engine` instantly overrides cycles to force an immediate green wave corridor for the emergency lane.

### 📊 Module 5: Real-Time Visualization Dashboard
- **React.js (Pure JavaScript)** with CSS Modules and glassmorphism dark theme.
- **WebSocket Streaming**: Consumes live 20 FPS telemetry over `ws://localhost:8000/api/v1/ws/traffic`.
- **Canvas Video Feed**: Renders live bounding boxes, classification badges, and virtual stop-lines.
- **Chart.js Flow Graph**: Live time-series density and throughput line chart.
- **Animated Traffic Lights**: Real-time signal colors, remaining cycle timers, and override banners.

### ✉️ Module 6: Alert & Notification Gateway
- Dispatches high-priority violation notifications asynchronously via Python `smtplib` over Google SMTP (TLS port 587).
- Supports cellular carrier email-to-SMS gateways (e.g. `number@tmomail.net`, `number@vtext.com`).

### 🗄️ Module 7: Database & Indexing System
- Async database operations via **Motor** with automated fallback engine.
- High-speed compound indexes compiled on `timestamp` and `license_plate` for fast audits.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Python 3.11+
- Node.js 18+ & npm

### 2. Environment Configuration
Verify credentials in `backend/.env`:
```env
GEMINI_API_KEY=your_gemini_api_key
MONGODB_URI=your_mongodb_atlas_uri
DATABASE_NAME=traffic_db
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
ALERT_RECIPIENT_SMS_GATEWAY=your_phone@carrier.net
ALERT_RECIPIENT_EMAIL=traffic_control@domain.com
```

### 3. Running Backend
```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --app-dir backend
```
Backend API will be running at: `http://localhost:8000`  
Interactive Swagger docs: `http://localhost:8000/docs`

### 4. Running Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend Dashboard will be accessible at: `http://localhost:5173`
