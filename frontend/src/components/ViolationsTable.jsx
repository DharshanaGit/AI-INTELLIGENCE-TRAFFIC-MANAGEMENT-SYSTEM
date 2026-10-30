import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, Eye, X } from 'lucide-react';
import styles from '../styles/Dashboard.module.css';

export default function ViolationsTable({ violations = [] }) {
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);

  return (
    <div className={styles.card} style={{ gridColumn: 'span 2' }}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>
          <AlertCircle size={18} style={{ color: '#ef4444' }} />
          <span>Automated Violation & Plate OCR Audit Log (MongoDB Atlas)</span>
        </div>
        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
          {violations.length} Total Infractions Flagged
        </span>
      </div>

      <div style={{ overflowX: 'auto', maxHeight: '300px' }}>
        <table className={styles.violationsTable}>
          <thead>
            <tr>
              <th>Fine ID</th>
              <th>Time</th>
              <th>Violation Type</th>
              <th>Vehicle Class</th>
              <th>License Plate (OCR)</th>
              <th>Lane</th>
              <th>Snapshot</th>
              <th>SMS / SMTP Relay</th>
            </tr>
          </thead>
          <tbody>
            {violations.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>
                  No active traffic violations detected yet. Watching live feed...
                </td>
              </tr>
            ) : (
              violations.map((v, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: 'monospace', color: '#94a3b8' }}>{v.violation_id}</td>
                  <td>{v.timestamp ? new Date(v.timestamp).toLocaleTimeString() : 'N/A'}</td>
                  <td>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: v.violation_type === "RED_LIGHT_CROSSING" ? "rgba(239, 68, 68, 0.2)" : "rgba(245, 158, 11, 0.2)",
                        color: v.violation_type === "RED_LIGHT_CROSSING" ? "#f87171" : "#fbbf24",
                        border: `1px solid ${v.violation_type === "RED_LIGHT_CROSSING" ? "rgba(239, 68, 68, 0.4)" : "rgba(245, 158, 11, 0.4)"}`
                      }}
                    >
                      {v.violation_type}
                    </span>
                  </td>
                  <td>{v.vehicle_type}</td>
                  <td>
                    <span className={styles.plateBadge}>
                      {v.license_plate}
                    </span>
                  </td>
                  <td>{v.lane_id}</td>
                  <td>
                    {v.image_snapshot ? (
                      <img
                        src={`http://localhost:8005${v.image_snapshot}`}
                        alt="Violation Proof"
                        className={styles.tableThumbnail}
                        onClick={() => setSelectedSnapshot(`http://localhost:8005${v.image_snapshot}`)}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <span style={{ color: '#64748b' }}>None</span>
                    )}
                  </td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#34d399', fontSize: '0.75rem' }}>
                      <CheckCircle2 size={13} />
                      <span>Transmitted</span>
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Snapshot Modal */}
      {selectedSnapshot && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setSelectedSnapshot(null)}
        >
          <div
            style={{
              position: 'relative',
              background: '#121826',
              padding: '1.5rem',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              maxWidth: '90%',
              maxHeight: '90%'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedSnapshot(null)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'transparent',
                border: 'none',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>
            <h3 style={{ margin: '0 0 1rem', color: '#fff', fontSize: '1rem' }}>Vehicle Bumper Evidence Snapshot</h3>
            <img
              src={selectedSnapshot}
              alt="Full Evidence"
              style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '8px' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
