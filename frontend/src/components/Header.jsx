import React from 'react';
import { Activity, ShieldCheck, Database, Radio } from 'lucide-react';
import styles from '../styles/Dashboard.module.css';

export default function Header({ isConnected, isProcessing, dbStatus, aiModel }) {
  return (
    <header className={styles.header}>
      <div className={styles.headerTitle}>
        <Activity size={28} className={styles.logoIcon} />
        <div className={styles.titleText}>
          <h1>AI Intelligent Traffic Management System</h1>
          <p>Autonomous OpenCV Stabilization • Gemini Vision Inference • Adaptive Signal Matrix</p>
        </div>
      </div>

      <div className={styles.headerBadges}>
        {/* Stream Status */}
        <div className={`${styles.badge} ${isConnected ? styles.badgeSuccess : styles.badgeDanger}`}>
          <span className={styles.badgePulse}></span>
          <Radio size={14} />
          <span>{isConnected ? "WS Live Stream" : "Disconnected"}</span>
        </div>

        {/* AI Model Badge */}
        <div className={`${styles.badge} ${styles.badgeWarning}`}>
          <ShieldCheck size={14} />
          <span>Model: {aiModel || "Gemini 3.5 Flash"}</span>
        </div>

        {/* Database Badge */}
        <div className={`${styles.badge} ${dbStatus === "MongoDB Atlas" ? styles.badgeSuccess : styles.badgeWarning}`}>
          <Database size={14} />
          <span>{dbStatus || "Storage Online"}</span>
        </div>
      </div>
    </header>
  );
}
