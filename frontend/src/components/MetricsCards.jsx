import React from 'react';
import { Car, Bus, Truck, Bike, Siren, Gauge } from 'lucide-react';
import styles from '../styles/Dashboard.module.css';

export default function MetricsCards({ counts = {} }) {
  const cards = [
    {
      title: "Cars",
      value: counts.cars ?? 0,
      icon: <Car size={22} />,
      color: "rgba(59, 130, 246, 0.15)",
      textColor: "#60a5fa"
    },
    {
      title: "Buses",
      value: counts.buses ?? 0,
      icon: <Bus size={22} />,
      color: "rgba(245, 158, 11, 0.15)",
      textColor: "#fbbf24"
    },
    {
      title: "Trucks",
      value: counts.trucks ?? 0,
      icon: <Truck size={22} />,
      color: "rgba(139, 92, 246, 0.15)",
      textColor: "#a78bfa"
    },
    {
      title: "Two-Wheelers",
      value: counts.two_wheelers ?? 0,
      icon: <Bike size={22} />,
      color: "rgba(16, 185, 129, 0.15)",
      textColor: "#34d399"
    },
    {
      title: "Emergency",
      value: counts.emergency_vehicles ?? 0,
      icon: <Siren size={22} />,
      color: "rgba(239, 68, 68, 0.15)",
      textColor: "#f87171"
    },
    {
      title: "Total Tracked",
      value: counts.total ?? 0,
      icon: <Gauge size={22} />,
      color: "rgba(6, 182, 212, 0.15)",
      textColor: "#38bdf8"
    }
  ];

  return (
    <div className={styles.metricsGrid}>
      {cards.map((c, i) => (
        <div key={i} className={styles.metricCard}>
          <div className={styles.metricIcon} style={{ background: c.color, color: c.textColor }}>
            {c.icon}
          </div>
          <div className={styles.metricContent}>
            <h3>{c.title}</h3>
            <p>{c.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
