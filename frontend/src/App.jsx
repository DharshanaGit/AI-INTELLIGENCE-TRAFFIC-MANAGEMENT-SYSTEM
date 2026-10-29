import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Header from './components/Header';
import MetricsCards from './components/MetricsCards';
import VideoFeed from './components/VideoFeed';
import SignalControllerWidget from './components/SignalControllerWidget';
import FlowChart from './components/FlowChart';
import ViolationsTable from './components/ViolationsTable';
import ControlPanel from './components/ControlPanel';
import styles from './styles/Dashboard.module.css';

const API_BASE = "http://localhost:8000/api/v1";
const WS_URL = "ws://localhost:8000/api/v1/ws/traffic";

export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [dbStatus, setDbStatus] = useState("Checking DB...");
  const [aiModel, setAiModel] = useState("Gemini 3.5 Flash");
  
  // Real-time telemetry state
  const [frameBase64, setFrameBase64] = useState("");
  const [frameIdx, setFrameIdx] = useState(0);
  const [detections, setDetections] = useState([]);
  const [counts, setCounts] = useState({
    cars: 0,
    buses: 0,
    trucks: 0,
    two_wheelers: 0,
    emergency_vehicles: 0,
    total: 0
  });
  const [densities, setDensities] = useState({ lane_1: 0, lane_2: 0 });
  const [signalState, setSignalState] = useState({
    lane_1: { color: "GREEN", timer: 60, is_extended: false, is_preempted: false },
    lane_2: { color: "RED", timer: 60, is_extended: false, is_preempted: false },
    override_reason: null
  });
  const [stopLineY, setStopLineY] = useState(620);
  const [violations, setViolations] = useState([]);
  const [densityHistory, setDensityHistory] = useState([]);

  const wsRef = useRef(null);

  // Health check on startup
  useEffect(() => {
    axios.get(`${API_BASE}/health`)
      .then((res) => {
        setDbStatus(res.data.database);
      })
      .catch(() => setDbStatus("Backend Offline"));

    // Fetch initial historical violations from MongoDB
    axios.get(`${API_BASE}/violations?limit=20`)
      .then((res) => {
        if (res.data.violations) {
          setViolations(res.data.violations);
        }
      })
      .catch((err) => console.error("Error fetching historical violations:", err));
  }, []);

  // WebSocket Connection & Listener (Module 5)
  useEffect(() => {
    let reconnectTimeout = null;

    const connectWebSocket = () => {
      const socket = new WebSocket(WS_URL);
      wsRef.current = socket;

      socket.onopen = () => {
        console.log("Connected to Traffic WebSocket stream.");
        setIsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "TELEMETRY_UPDATE") {
            if (data.frame_base64) setFrameBase64(data.frame_base64);
            if (data.frame_idx) setFrameIdx(data.frame_idx);
            if (data.detections) setDetections(data.detections);
            if (data.counts) setCounts(data.counts);
            if (data.densities) {
              setDensities(data.densities);
              // Append to chart history (limit last 25 points)
              const timeLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              setDensityHistory((prev) => {
                const next = [...prev, { time: timeLabel, lane1: data.densities.lane_1, lane2: data.densities.lane_2 }];
                return next.length > 25 ? next.slice(next.length - 25) : next;
              });
            }
            if (data.signal_state) setSignalState(data.signal_state);
            if (data.stop_line_y) setStopLineY(data.stop_line_y);

            // Append newly triggered violations
            if (data.new_violations && data.new_violations.length > 0) {
              setViolations((prev) => [...data.new_violations, ...prev]);
            }
          }
        } catch (e) {
          console.error("WebSocket message parse error:", e);
        }
      };

      socket.onclose = () => {
        console.log("WebSocket stream closed. Reconnecting in 3s...");
        setIsConnected(false);
        reconnectTimeout = setTimeout(connectWebSocket, 3000);
      };

      socket.onerror = (err) => {
        console.error("WebSocket error:", err);
        socket.close();
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  return (
    <div className={styles.dashboardContainer}>
      {/* Module 5: Header Navigation */}
      <Header
        isConnected={isConnected}
        dbStatus={dbStatus}
        aiModel={aiModel}
      />

      {/* Module 2: Vehicle Classification Badges */}
      <MetricsCards counts={counts} />

      {/* Main Grid: Video Stream + Traffic Signals */}
      <div className={styles.mainLayout}>
        {/* Module 1 & 2: Stabilized Feed Canvas */}
        <VideoFeed
          frameBase64={frameBase64}
          detections={detections}
          stopLineY={stopLineY}
          frameIdx={frameIdx}
        />

        {/* Module 4: Dynamic Signal Controller Matrix */}
        <SignalControllerWidget
          signalState={signalState}
          densities={densities}
        />
      </div>

      {/* Control Station & Ingestion */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <ControlPanel
          stopLineY={stopLineY}
          onStopLineChange={setStopLineY}
        />
      </div>

      {/* Analytics & Violation Audit Table */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        {/* Module 5: Chart.js Line Graph */}
        <FlowChart history={densityHistory} />

        {/* Module 3, 6, 7: Audit Table */}
        <ViolationsTable violations={violations} />
      </div>
    </div>
  );
}
