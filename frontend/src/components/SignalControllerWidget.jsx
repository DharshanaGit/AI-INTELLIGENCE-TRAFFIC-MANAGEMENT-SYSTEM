import React from 'react';
import { TrafficCone, AlertTriangle, Zap, ShieldAlert } from 'lucide-react';
import styles from '../styles/Dashboard.module.css';

export default function SignalControllerWidget({ signalState = {}, densities = {} }) {
  const lane1 = signalState.lane_1 || { color: "GREEN", timer: 60, is_extended: false, is_preempted: false };
  const lane2 = signalState.lane_2 || { color: "RED", timer: 60, is_extended: false, is_preempted: false };
  const overrideReason = signalState.override_reason;
  const isPreempted = lane1.is_preempted || lane2.is_preempted;

  const d1 = densities.lane_1 ?? 0;
  const d2 = densities.lane_2 ?? 0;

  const getDensityColor = (density) => {
    if (density >= 75) return "#ef4444";
    if (density >= 45) return "#f59e0b";
    return "#10b981";
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>
          <TrafficCone size={18} />
          <span>Dynamic Signal Control Matrix</span>
        </div>
        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
          Rule-Based Adaptive Engine
        </span>
      </div>

      <div className={styles.signalsContainer}>
        {/* Lane 1 Signal */}
        <div className={styles.signalLaneCard}>
          <div className={styles.laneHeader}>
            <span className={styles.laneTitle}>Lane 1 (Inbound Flow)</span>
            <div className={styles.signalHousing}>
              <div className={`${styles.lightLamp} ${styles.lampRed} ${lane1.color === "RED" ? styles.active : ""}`}></div>
              <div className={`${styles.lightLamp} ${styles.lampYellow} ${lane1.color === "YELLOW" ? styles.active : ""}`}></div>
              <div className={`${styles.lightLamp} ${styles.lampGreen} ${lane1.color === "GREEN" ? styles.active : ""}`}></div>
              <span className={styles.signalTimerBadge} style={{ color: lane1.color === "GREEN" ? "#10b981" : "#ef4444" }}>
                {lane1.timer}s
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#94a3b8' }}>
            <span>Spatial Density:</span>
            <span style={{ fontWeight: 700, color: getDensityColor(d1) }}>{d1}%</span>
          </div>
          <div className={styles.densityProgressBar}>
            <div
              className={styles.densityProgressFill}
              style={{ width: `${d1}%`, background: getDensityColor(d1) }}
            />
          </div>
        </div>

        {/* Lane 2 Signal */}
        <div className={styles.signalLaneCard}>
          <div className={styles.laneHeader}>
            <span className={styles.laneTitle}>Lane 2 (Outbound Flow)</span>
            <div className={styles.signalHousing}>
              <div className={`${styles.lightLamp} ${styles.lampRed} ${lane2.color === "RED" ? styles.active : ""}`}></div>
              <div className={`${styles.lightLamp} ${styles.lampYellow} ${lane2.color === "YELLOW" ? styles.active : ""}`}></div>
              <div className={`${styles.lightLamp} ${styles.lampGreen} ${lane2.color === "GREEN" ? styles.active : ""}`}></div>
              <span className={styles.signalTimerBadge} style={{ color: lane2.color === "GREEN" ? "#10b981" : "#ef4444" }}>
                {lane2.timer}s
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#94a3b8' }}>
            <span>Spatial Density:</span>
            <span style={{ fontWeight: 700, color: getDensityColor(d2) }}>{d2}%</span>
          </div>
          <div className={styles.densityProgressBar}>
            <div
              className={styles.densityProgressFill}
              style={{ width: `${d2}%`, background: getDensityColor(d2) }}
            />
          </div>
        </div>

        {/* Adaptive Overrides & Emergency Corridor Indicator */}
        {isPreempted && (
          <div className={styles.emergencyBanner}>
            <ShieldAlert size={18} />
            <span>EMERGENCY PREEMPTION ACTIVE: Green Wall Corridor engaged!</span>
          </div>
        )}

        {overrideReason && !isPreempted && (
          <div className={styles.overrideBanner}>
            <Zap size={18} />
            <span>{overrideReason}</span>
          </div>
        )}
      </div>
    </div>
  );
}
