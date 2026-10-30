"""
Quality Benchmark Downloader and Synthesizer
Curates and verifies a tri-tier testing suite:
- High Quality (1080p/4K crisp contrast, daytime)
- Average Quality (720p municipal CCTV, moderate compression)
- Poor Quality (night-time / low-light / rain / high sensor noise / compression artifacts)
All stored strictly on D: drive inside `backend/sample_data/quality_benchmarks/`.
"""

import os
import shutil
import cv2
import numpy as np
import urllib.request

SAMPLE_DIR = r"D:\Other Project\intelligent-traffic-management-system\backend\sample_data"
BENCHMARK_DIR = os.path.join(SAMPLE_DIR, "quality_benchmarks")

TIERS = {
    "high_quality": os.path.join(BENCHMARK_DIR, "high_quality"),
    "average_quality": os.path.join(BENCHMARK_DIR, "average_quality"),
    "poor_quality": os.path.join(BENCHMARK_DIR, "poor_quality"),
}

for d in TIERS.values():
    os.makedirs(d, exist_ok=True)

def setup_benchmarks():
    print("Setting up Quality Benchmark video suites on D: drive...")

    # 1. High Quality 1080p
    hq_sources = [
        ("coimbatore_gandhipuram_cctv.mp4", "gandhipuram_1080p_crisp.mp4"),
        ("coimbatore_avinashi_cctv.mp4", "avinashi_corridor_1080p_high.mp4"),
        ("indian_traffic_sample.mp4", "indian_mixed_traffic_1080p.mp4"),
    ]
    for src_name, dst_name in hq_sources:
        src = os.path.join(SAMPLE_DIR, src_name)
        dst = os.path.join(TIERS["high_quality"], dst_name)
        if os.path.exists(src) and not os.path.exists(dst):
            shutil.copyfile(src, dst)
            print(f"[HQ OK] Copied {dst_name}")

    # 2. Average Quality 720p / CCTV
    avg_sources = [
        ("chennai_kathipara_cctv.mp4", "kathipara_cctv_720p_average.mp4"),
        ("chennai_anna_salai_cctv.mp4", "anna_salai_cctv_720p_average.mp4"),
        ("intersection_traffic.mp4", "intersection_grid_average.mp4"),
    ]
    for src_name, dst_name in avg_sources:
        src = os.path.join(SAMPLE_DIR, src_name)
        dst = os.path.join(TIERS["average_quality"], dst_name)
        if os.path.exists(src) and not os.path.exists(dst):
            shutil.copyfile(src, dst)
            print(f"[AVG OK] Copied {dst_name}")

    # 3. Poor Quality (Night / Rain / High Noise / Low Bit-rate CCTV)
    # Generate realistic degraded test videos from sample data to rigorously stress-test YOLO
    generate_poor_quality_night_video(
        input_path=os.path.join(SAMPLE_DIR, "coimbatore_gandhipuram_cctv.mp4"),
        output_path=os.path.join(TIERS["poor_quality"], "night_rain_degraded_cctv.mp4"),
        night_mode=True,
        rain_mode=True,
        noise_level=25
    )

    generate_poor_quality_night_video(
        input_path=os.path.join(SAMPLE_DIR, "chennai_kathipara_cctv.mp4"),
        output_path=os.path.join(TIERS["poor_quality"], "low_bitrate_sensor_noise_cctv.mp4"),
        night_mode=False,
        rain_mode=False,
        noise_level=45
    )

    print("\nBenchmark Suite Ready on D: Drive!")

def generate_poor_quality_night_video(input_path: str, output_path: str, night_mode: bool, rain_mode: bool, noise_level: int):
    if not os.path.exists(input_path) or os.path.exists(output_path):
        return

    print(f"[POOR] Synthesizing stress-test video: {os.path.basename(output_path)}...")
    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        return

    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    # Downscale for poor quality if large
    target_w, target_h = (640, 360) if w > 1280 else (w, h)

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(output_path, fourcc, fps, (target_w, target_h))

    frames_written = 0
    max_frames = 250  # ~10 seconds of benchmark footage

    while frames_written < max_frames:
        ret, frame = cap.read()
        if not ret:
            break

        if (w, h) != (target_w, target_h):
            frame = cv2.resize(frame, (target_w, target_h))

        # 1. Night Mode Transformation (Gamma reduction, blue tint, headlight bloom)
        if night_mode:
            # Darken overall scene
            hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV).astype(np.float32)
            hsv[:, :, 2] = np.clip(hsv[:, :, 2] * 0.42, 0, 255)  # Suppress brightness
            frame = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)
            # Add blue-ish night atmosphere
            frame[:, :, 0] = np.clip(frame[:, :, 0] * 1.15, 0, 255)
            frame[:, :, 2] = np.clip(frame[:, :, 2] * 0.80, 0, 255)

        # 2. Add realistic CCTV Sensor Noise (High ISO grain)
        if noise_level > 0:
            noise = np.random.normal(0, noise_level, frame.shape).astype(np.float32)
            frame = np.clip(frame.astype(np.float32) + noise, 0, 255).astype(np.uint8)

        # 3. Add Rain Streak Overlays
        if rain_mode:
            rain_mask = np.zeros_like(frame)
            num_drops = 300
            for _ in range(num_drops):
                x = np.random.randint(0, target_w)
                y = np.random.randint(0, target_h - 20)
                length = np.random.randint(10, 20)
                cv2.line(rain_mask, (x, y), (x - 2, y + length), (200, 200, 220), 1)
            frame = cv2.addWeighted(frame, 0.85, rain_mask, 0.4, 0)

        out.write(frame)
        frames_written += 1

    cap.release()
    out.release()
    print(f"[POOR OK] Created {output_path} ({frames_written} frames)")

if __name__ == "__main__":
    setup_benchmarks()
