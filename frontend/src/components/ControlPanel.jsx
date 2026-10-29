import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, Play, Square, Sliders, BellRing, Video } from 'lucide-react';
import styles from '../styles/Dashboard.module.css';

const API_BASE = "http://localhost:8000/api/v1";

export default function ControlPanel({
  isProcessing,
  stopLineY,
  onStopLineChange,
  onAlertStatus
}) {
  const [samples, setSamples] = useState([]);
  const [selectedSample, setSelectedSample] = useState("");
  const [uploading, setUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    // Fetch available sample videos
    axios.get(`${API_BASE}/video/samples`)
      .then((res) => {
        const list = res.data.samples || [];
        setSamples(list);
        if (list.length > 0) setSelectedSample(list[0]);
      })
      .catch((err) => console.error("Error loading sample videos:", err));
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);
      setStatusMsg("Uploading & initiating OpenCV stabilization loop...");
      await axios.post(`${API_BASE}/video/upload`, formData);
      setStatusMsg(`Loaded ${file.name} successfully!`);
    } catch (err) {
      setStatusMsg("Upload failed: " + (err.response?.data?.detail || err.message));
    } finally {
      setUploading(false);
    }
  };

  const handleSelectSample = async () => {
    if (!selectedSample) return;
    try {
      setStatusMsg(`Streaming ${selectedSample}...`);
      const formData = new FormData();
      formData.append("filename", selectedSample);
      await axios.post(`${API_BASE}/video/select-sample`, formData);
      setStatusMsg(`Processing ${selectedSample}`);
    } catch (err) {
      setStatusMsg("Error selecting sample: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleStop = async () => {
    try {
      const formData = new FormData();
      formData.append("action", "stop");
      await axios.post(`${API_BASE}/pipeline/control`, formData);
      setStatusMsg("Pipeline halted.");
    } catch (err) {
      console.error(err);
    }
  };

  const handleTestAlert = async () => {
    try {
      setStatusMsg("Dispatching test alert via Google SMTP...");
      const res = await axios.post(`${API_BASE}/test-alert`);
      setStatusMsg(res.data.message);
      if (onAlertStatus) onAlertStatus(res.data);
    } catch (err) {
      setStatusMsg("Alert error: " + err.message);
    }
  };

  const handleSliderChange = async (e) => {
    const val = parseInt(e.target.value);
    onStopLineChange(val);
    try {
      const formData = new FormData();
      formData.append("y_coordinate", val);
      await axios.post(`${API_BASE}/config/stopline`, formData);
    } catch (err) {
      console.error("Failed to update stopline:", err);
    }
  };

  return (
    <div className={styles.card} style={{ gridColumn: 'span 2' }}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>
          <Sliders size={18} />
          <span>Traffic Control & Video Ingestion Station</span>
        </div>
        {statusMsg && (
          <span style={{ fontSize: '0.8rem', color: '#38bdf8', fontFamily: 'monospace' }}>
            {statusMsg}
          </span>
        )}
      </div>

      <div className={styles.controlsGrid}>
        {/* File Upload */}
        <label className={`${styles.btn} ${styles.btnPrimary}`} style={{ cursor: 'pointer' }}>
          <Upload size={16} />
          <span>{uploading ? "Uploading..." : "Upload Video (.mp4 / .avi)"}</span>
          <input
            type="file"
            accept=".mp4,.avi,.mov"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
            disabled={uploading}
          />
        </label>

        {/* Sample Video Selector */}
        {samples.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select
              className={styles.selectInput}
              value={selectedSample}
              onChange={(e) => setSelectedSample(e.target.value)}
            >
              {samples.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleSelectSample}>
              <Play size={15} />
              <span>Analyze Sample</span>
            </button>
          </div>
        )}

        {/* Halt Button */}
        <button className={`${styles.btn} ${styles.btnDanger}`} onClick={handleStop}>
          <Square size={15} />
          <span>Halt Pipeline</span>
        </button>

        {/* Test Alert Button */}
        <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleTestAlert}>
          <BellRing size={15} />
          <span>Test SMS Alert</span>
        </button>

        {/* Stop Line Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: 'auto' }}>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Stop-Line Y:</span>
          <input
            type="range"
            min="200"
            max="900"
            step="10"
            value={stopLineY}
            onChange={handleSliderChange}
            style={{ width: '130px', accentColor: '#ef4444' }}
          />
          <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: '#ef4444', fontWeight: 700 }}>
            {stopLineY}
          </span>
        </div>
      </div>
    </div>
  );
}
