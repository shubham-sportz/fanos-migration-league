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

export function CircularProgress({ pct, color, size = 88, thickness = 10 }) {
  const hasPct = !isNA(pct);
  const clamped = hasPct ? Math.min(100, Math.max(0, pct)) : 0;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (clamped / 100) * circumference;
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: `0 0 ${size}px` }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#F0F1FA" strokeWidth={thickness} />
        {hasPct && clamped > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
          />
        )}
      </svg>
      <div style={{ position: 'absolute', inset: thickness, background: '#FFFFFF', borderRadius: '50%', display: 'grid', placeContent: 'center', textAlign: 'center' }}>
        {hasPct ? (
          <div className="num" style={{ fontSize: size * 0.24, fontWeight: 700, lineHeight: 1 }}>{clamped}%</div>
        ) : (
          <span className="na" style={{ fontSize: size * 0.14 }}>NA</span>
        )}
      </div>
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

// Total logged hours broken down by where they went — Home/Away squad hours
// (from the project's per-developer timesheet split) plus Design/QA/Delivery
// specialist hours (Actual_* columns in the Projects sheet). Rendered as a
// donut (mirrors the Effort Breakdown ring on the detail page) rather than
// bars, since this is a part-of-whole breakdown, not a planned-vs-actual pace.
const TOTAL_HOURS_SEGMENTS = [
  ['home', 'Home', '#2A2AEA'],
  ['away', 'Away', '#F97316'],
  ['design', 'Design', '#7C3AED'],
  ['qa', 'QA', '#14B8A6'],
  ['delivery', 'Delivery', '#15803D'],
];

export function TotalHoursDonut({ squad, actualEffortSplit, compact = false, size, hole, bordered = true }) {
  const values = (squad || []).reduce(
    (acc, m) => {
      if (m.team === 'Home') acc.home += m.loggedHours;
      else if (m.team === 'Away') acc.away += m.loggedHours;
      return acc;
    },
    {
      home: 0,
      away: 0,
      design: isNA(actualEffortSplit?.design) ? 0 : actualEffortSplit.design,
      qa: isNA(actualEffortSplit?.qa) ? 0 : actualEffortSplit.qa,
      delivery: isNA(actualEffortSplit?.delivery) ? 0 : actualEffortSplit.delivery,
    }
  );
  const total = Object.values(values).reduce((s, v) => s + v, 0);
  if (total <= 0) {
    return (
      <div className="na" style={bordered ? { marginTop: 10, paddingTop: 10, borderTop: '1px solid #F0F1FA' } : undefined}>
        NA — no runs logged yet
      </div>
    );
  }

  let acc = 0;
  const stops = TOTAL_HOURS_SEGMENTS.filter(([k]) => values[k] > 0).map(([k, , color]) => {
    const from = acc;
    acc += (values[k] / total) * 100;
    return `${color} ${from.toFixed(2)}% ${acc.toFixed(2)}%`;
  });
  const gradient = `conic-gradient(${stops.join(', ')})`;

  const ringSize = size ?? (compact ? 130 : 180);
  const ringHole = hole ?? (compact ? 19 : 27);

  return (
    <div style={{ ...(bordered ? { marginTop: 10, paddingTop: 10, borderTop: '1px solid #F0F1FA' } : {}), display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: compact ? 14 : 22 }}>
      <div style={{ position: 'relative', width: ringSize, height: ringSize, flex: `0 0 ${ringSize}px`, borderRadius: '50%', background: gradient }}>
        <div style={{ position: 'absolute', inset: ringHole, background: '#FFFFFF', borderRadius: '50%', display: 'grid', placeContent: 'center', textAlign: 'center' }}>
          <div className="num" style={{ fontSize: ringSize * 0.226, fontWeight: 700, lineHeight: 1 }}>{Math.round(total * 100) / 100}</div>
          <div style={{ fontSize: ringSize * 0.073, letterSpacing: 0.8, color: '#6B7280', fontWeight: 700 }}>RUNS LOGGED</div>
        </div>
      </div>
      <div style={{ width: 200, display: 'flex', flexDirection: 'column', gap: compact ? 4 : 7 }}>
        {TOTAL_HOURS_SEGMENTS.filter(([k]) => values[k] > 0).map(([k, label, color]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9.5, letterSpacing: 0.8, color: '#6B7280', fontWeight: 700 }}>
              <span style={{ width: 7, height: 7, borderRadius: 2, background: color, flex: '0 0 auto' }} />
              {label.toUpperCase()}
            </span>
            <span style={{ fontSize: 12.5, fontWeight: 700 }}>{Math.round(values[k] * 100) / 100}r</span>
          </div>
        ))}
      </div>
    </div>
  );
}
