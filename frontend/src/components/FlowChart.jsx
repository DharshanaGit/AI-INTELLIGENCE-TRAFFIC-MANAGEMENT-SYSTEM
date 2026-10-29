import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { TrendingUp } from 'lucide-react';
import styles from '../styles/Dashboard.module.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function FlowChart({ history = [] }) {
  const labels = history.map((h, i) => h.time || `${i * 2}s`);
  const lane1Data = history.map((h) => h.lane1);
  const lane2Data = history.map((h) => h.lane2);

  const data = {
    labels: labels.length > 0 ? labels : ["0s", "5s", "10s", "15s", "20s"],
    datasets: [
      {
        label: 'Lane 1 Density (%)',
        data: lane1Data.length > 0 ? lane1Data : [25, 45, 78, 65, 30],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.12)',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 5
      },
      {
        label: 'Lane 2 Density (%)',
        data: lane2Data.length > 0 ? lane2Data : [18, 22, 19, 15, 20],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 5
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#94a3b8',
          font: { size: 11, family: 'sans-serif' }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(11, 16, 27, 0.95)',
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { color: '#64748b', font: { size: 10 } }
      },
      y: {
        min: 0,
        max: 100,
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { color: '#64748b', font: { size: 10 } }
      }
    }
  };

  return (
    <div className={styles.card} style={{ gridColumn: 'span 2' }}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>
          <TrendingUp size={18} />
          <span>Real-Time Traffic Density & Bottleneck Progression (Chart.js)</span>
        </div>
        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
          Rolling Throughput Monitor
        </span>
      </div>

      <div style={{ height: '220px', width: '100%' }}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
