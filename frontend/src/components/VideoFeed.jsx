import React, { useRef, useEffect } from 'react';
import { Video, ShieldAlert } from 'lucide-react';
import styles from '../styles/Dashboard.module.css';

const CLASS_COLORS = {
  "Car": "#3b82f6",
  "Bus": "#f59e0b",
  "Truck": "#8b5cf6",
  "Two-wheeler": "#10b981",
  "Ambulance": "#ef4444",
  "Fire Engine": "#dc2626"
};

export default function VideoFeed({ frameBase64, detections = [], stopLineY = 620, frameIdx = 0 }) {
  const canvasRef = useRef(null);
  const imageRef = useRef(new Image());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (frameBase64) {
      imageRef.current.onload = () => {
        // Draw the base video frame
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);

        // Draw Virtual Stop Line
        const stopLinePixelY = (stopLineY / 1000.0) * canvas.height;
        ctx.save();
        ctx.strokeStyle = "rgba(239, 68, 68, 0.85)";
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(0, stopLinePixelY);
        ctx.lineTo(canvas.width, stopLinePixelY);
        ctx.stroke();

        // Stop line badge
        ctx.fillStyle = "rgba(239, 68, 68, 0.9)";
        ctx.fillRect(canvas.width - 150, stopLinePixelY - 24, 140, 20);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 11px sans-serif";
        ctx.fillText("STOP-LINE (VIRTUAL)", canvas.width - 145, stopLinePixelY - 10);
        ctx.restore();

        // Draw Bounding Boxes and Labels
        detections.forEach((det) => {
          const [ymin, xmin, ymax, xmax] = det.box_2d || [0, 0, 0, 0];
          const x = (xmin / 1000.0) * canvas.width;
          const y = (ymin / 1000.0) * canvas.height;
          const w = ((xmax - xmin) / 1000.0) * canvas.width;
          const h = ((ymax - ymin) / 1000.0) * canvas.height;

          const vClass = det.class || "Car";
          const color = CLASS_COLORS[vClass] || "#3b82f6";

          // Box border
          ctx.strokeStyle = color;
          ctx.lineWidth = 2.5;
          ctx.strokeRect(x, y, w, h);

          // Box label
          const label = `${vClass} ${det.license_plate ? `[${det.license_plate}]` : ''}`;
          ctx.font = "bold 12px monospace";
          const textMetrics = ctx.measureText(label);
          const badgeWidth = textMetrics.width + 10;
          const badgeHeight = 18;

          ctx.fillStyle = color;
          ctx.fillRect(x, Math.max(0, y - badgeHeight), badgeWidth, badgeHeight);

          ctx.fillStyle = "#ffffff";
          ctx.fillText(label, x + 5, Math.max(12, y - 4));
        });
      };
      imageRef.current.src = `data:image/jpeg;base64,${frameBase64}`;
    } else {
      // Empty placeholder state
      ctx.fillStyle = "#090d16";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#64748b";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("No Active Traffic Video Feed • Select or Upload a Video Below", canvas.width / 2, canvas.height / 2);
    }
  }, [frameBase64, detections, stopLineY]);

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>
          <Video size={18} />
          <span>Stabilized OpenCV Vision Feed • 720p Normalized</span>
        </div>
        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontFamily: 'monospace' }}>
          Frame: #{frameIdx}
        </span>
      </div>

      <div className={styles.videoContainer}>
        <canvas
          ref={canvasRef}
          width={640}
          height={360}
          className={styles.videoFeedCanvas}
        />
        <div className={styles.videoOverlayTag}>
          <span>LIVE TRACKING • GEMINI 3.5 FLASH</span>
        </div>
      </div>
    </div>
  );
}
