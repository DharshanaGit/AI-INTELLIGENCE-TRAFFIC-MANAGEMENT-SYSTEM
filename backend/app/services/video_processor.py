import cv2
import numpy as np
import os
import logging
from typing import Generator, Tuple, Optional, Dict, Any
from pathlib import Path

logger = logging.getLogger("VideoProcessor")

class VideoStabilizer:
    """Frame stabilization using Lucas-Kanade optical flow and affine transform smoothing."""
    def __init__(self, smoothing_radius: int = 15):
        self.smoothing_radius = smoothing_radius
        self.prev_gray = None
        self.transforms = []
        self.trajectory = []
        self.smoothed_trajectory = []

    def reset(self):
        self.prev_gray = None
        self.transforms = []
        self.trajectory = []
        self.smoothed_trajectory = []

    def stabilize_frame(self, frame: np.ndarray) -> np.ndarray:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        h, w = frame.shape[:2]

        if self.prev_gray is None:
            self.prev_gray = gray
            return frame

        # Detect feature points in previous frame
        prev_pts = cv2.goodFeaturesToTrack(
            self.prev_gray, maxCorners=200, qualityLevel=0.01, minDistance=30, blockSize=3
        )

        if prev_pts is None or len(prev_pts) < 10:
            self.prev_gray = gray
            return frame

        # Calculate optical flow
        curr_pts, status, err = cv2.calcOpticalFlowPyrLK(self.prev_gray, gray, prev_pts, None)

        # Filter valid points
        valid_prev = prev_pts[status == 1]
        valid_curr = curr_pts[status == 1]

        if len(valid_prev) < 10:
            self.prev_gray = gray
            return frame

        # Find rigid transformation (translation + rotation)
        matrix, inliers = cv2.estimateAffinePartial2D(valid_prev, valid_curr)
        if matrix is None:
            self.prev_gray = gray
            return frame

        dx = matrix[0, 2]
        dy = matrix[1, 2]
        da = np.arctan2(matrix[1, 0], matrix[0, 0])

        # Invert jitter offset with dampening factor for subtle smooth vibration removal
        damp = 0.65
        inv_dx = -dx * damp
        inv_dy = -dy * damp
        inv_da = -da * damp

        # Reconstruct stabilization matrix
        smooth_mat = np.zeros((2, 3), dtype=np.float32)
        smooth_mat[0, 0] = np.cos(inv_da)
        smooth_mat[0, 1] = -np.sin(inv_da)
        smooth_mat[1, 0] = np.sin(inv_da)
        smooth_mat[1, 1] = np.cos(inv_da)
        smooth_mat[0, 2] = inv_dx
        smooth_mat[1, 2] = inv_dy

        stabilized = cv2.warpAffine(frame, smooth_mat, (w, h), borderMode=cv2.BORDER_REFLECT)
        self.prev_gray = gray
        return stabilized

class VideoProcessor:
    def __init__(self, target_width: int = 1280, target_height: int = 720):
        self.target_width = target_width
        self.target_height = target_height
        self.stabilizer = VideoStabilizer()

    def process_video_stream(
        self, video_path: str, sample_rate: int = 2
    ) -> Generator[Dict[str, Any], None, None]:
        """
        Reads video, normalizes to 720p, applies frame stabilization,
        and yields frames at target sample rate with metadata.
        sample_rate: process 1 frame every `sample_rate` frames.
        """
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            logger.error(f"Failed to open video file: {video_path}")
            return

        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        self.stabilizer.reset()

        frame_idx = 0
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                frame_idx += 1
                if frame_idx % sample_rate != 0:
                    continue

                # 1. Normalize frame dimension to 720p
                h, w = frame.shape[:2]
                if w != self.target_width or h != self.target_height:
                    frame = cv2.resize(frame, (self.target_width, self.target_height), interpolation=cv2.INTER_AREA)

                # 2. Frame stabilization
                stabilized = self.stabilizer.stabilize_frame(frame)

                timestamp_sec = frame_idx / fps
                yield {
                    "frame_idx": frame_idx,
                    "total_frames": total_frames,
                    "timestamp_sec": round(timestamp_sec, 2),
                    "fps": fps,
                    "frame": stabilized,
                    "width": self.target_width,
                    "height": self.target_height
                }
        finally:
            cap.release()

video_processor = VideoProcessor()
