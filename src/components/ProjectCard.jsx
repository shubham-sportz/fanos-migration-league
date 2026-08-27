import React from 'react';
import { isNA } from '../lib/theme.js';
import { initials, fmtDate } from '../lib/derive.js';
import { clientColor } from '../lib/clientColors.js';
import { StatusBadge, CircularProgress, Avatar, NAValue, TotalHoursDonut } from './Shared.jsx';

export default function ProjectCard({ project: p, onOpen }) {
  const isWon = p.status === 'won';
  const showReqRR = !isNA(p.daysLeft) && p.daysLeft > 0;

  return (
    <div className={`project-card${isWon ? ' project-card--won' : ''}`} onClick={() => onOpen(p.code)}>
      {isWon && <div className="project-card--won-badge" aria-hidden="true">🏆</div>}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <Avatar text={initials(p.client)} color={clientColor(p.code)} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: -0.2 }}>{p.client}</div>
        </div>
        <StatusBadge label={p.statusLabel} fg={p.statusFg} bg={p.statusBg} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16 }}>
        <div style={{ flex: '0 0 130px', display: 'flex', justifyContent: 'center' }}>
          <CircularProgress pct={p.progressPct} color={p.status === 'critical' ? '#DC2626' : p.status === 'atRisk' ? '#B45309' : '#2A2AEA'} />
        </div>
        <div className="project-card-stats" style={{ flex: '0 0 200px', width: 200, marginLeft: 'auto', gridTemplateColumns: '1fr', marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 9.5, letterSpacing: 0.8, color: '#6B7280', fontWeight: 700 }}>OVERS LEFT</span>
            <span style={{ fontSize: 12.5, fontWeight: 700 }}><NAValue value={p.daysLeft} /></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 9.5, letterSpacing: 0.8, color: '#6B7280', fontWeight: 700 }}>CURRENT RR</span>
            <span style={{ fontSize: 12.5, fontWeight: 700 }}>
              {isNA(p.observedRunRate) ? <span className="na">NA</span> : `${p.observedRunRate} ${p.rrUnit}`}
            </span>
          </div>
          {showReqRR && (
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 9.5, letterSpacing: 0.8, color: '#6B7280', fontWeight: 700 }}>REQ. RR</span>
              <span style={{ fontSize: 12.5, fontWeight: 700 }}>
                {isNA(p.requiredRR) ? <span className="na">NA</span> : `${Math.round(p.requiredRR)} ${p.rrUnit}`}
              </span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 9.5, letterSpacing: 0.8, color: '#6B7280', fontWeight: 700 }}>SQUAD</span>
            <span style={{ fontSize: 12.5, fontWeight: 700 }}>{p.squadSize} players</span>
          </div>
        </div>
      </div>
      <TotalHoursDonut squad={p.squad} actualEffortSplit={p.actualEffortSplit} compact />
      <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: '1px solid #F0F1FA', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span className="badge" style={{ background: '#F3F4F6', color: '#6B7280' }}>
          Deadline {fmtDate(p.endDate)}
        </span>
        {!isNA(p.actualEndDate) && (
          <span className="badge" style={{ marginLeft: 'auto', background: p.deliveryVarianceDays > 0 ? '#FDF4E5' : '#E9F7EF', color: p.deliveryVarianceDays > 0 ? '#B45309' : '#15803D' }}>
            ✓ Completed {fmtDate(p.actualEndDate)} · {p.deliveryVarianceLabel}
          </span>
        )}
      </div>
    </div>
  );
}
