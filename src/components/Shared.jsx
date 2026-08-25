import React from 'react';
import { isNA } from '../lib/theme.js';

export function NAValue({ value, suffix = '' }) {
  if (isNA(value)) return <span className="na">NA</span>;
  return <>{value}{suffix}</>;
}

export function StatusBadge({ label, fg, bg }) {
  return (
    <span className="badge" style={{ background: bg, color: fg }}>
      <span className="badge-dot" style={{ background: fg }} />
      {label}
    </span>
  );
}

export function KpiCard({ label, value, unit, sub, dot }) {
  return (
    <div className="card">
      <div className="kpi-head">
        <span className="dot" style={{ background: dot }} />
        <span className="kpi-label">{label}</span>
      </div>
      <div className="kpi-value">
        {value}
        {unit ? <span className="kpi-unit"> {unit}</span> : null}
      </div>
      <div className="kpi-sub">{sub}</div>
    </div>
  );
}

export function ProgressBar({ pct, color, thick = false }) {
  if (isNA(pct)) {
    return <div className={`progress-track${thick ? ' thick' : ''}`} />;
  }
  return (
    <div className={`progress-track${thick ? ' thick' : ''}`}>
      <div className="progress-fill" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
    </div>
  );
}

export function Avatar({ text, round = false, color }) {
  const style = color ? { background: `${color}22`, color } : undefined;
  return (
    <div className={`avatar${round ? ' avatar-round' : ''}`} style={style}>
      {text}
    </div>
  );
}
