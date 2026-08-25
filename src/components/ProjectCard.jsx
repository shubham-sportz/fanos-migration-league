import React from 'react';
import { isNA } from '../lib/theme.js';
import { initials, fmtDate } from '../lib/derive.js';
import { clientColor } from '../lib/clientColors.js';
import { StatusBadge, ProgressBar, Avatar, NAValue } from './Shared.jsx';
import { InningsSplitCompact } from './InningsSplit.jsx';

export default function ProjectCard({ project: p, onOpen }) {
  const isWon = p.status === 'won';
  const showReqRR = !isNA(p.daysLeft) && p.daysLeft > 0;
  const statCount = 3 + (showReqRR ? 1 : 0);

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
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 16 }}>
        <div className="num" style={{ fontSize: 26, fontWeight: 700 }}>
          {p.completed} hrs
        </div>
        <div style={{ fontSize: 13, fontWeight: 700 }}><NAValue value={p.progressPct} suffix="%" /></div>
      </div>
      <ProgressBar pct={p.progressPct} color={p.status === 'critical' ? '#DC2626' : p.status === 'atRisk' ? '#B45309' : '#2A2AEA'} thick />
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${statCount}, 1fr)`, gap: 10, marginTop: 16, paddingTop: 14, borderTop: '1px solid #F0F1FA' }}>
        <div>
          <div style={{ fontSize: 9.5, letterSpacing: 0.8, color: '#6B7280', fontWeight: 700 }}>DAYS LEFT</div>
          <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 3 }}><NAValue value={p.daysLeft} /></div>
        </div>
        <div>
          <div style={{ fontSize: 9.5, letterSpacing: 0.8, color: '#6B7280', fontWeight: 700 }}>CURRENT RR</div>
          <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 3 }}>
            {isNA(p.observedRunRate) ? <span className="na">NA</span> : `${p.observedRunRate} ${p.rrUnit}`}
          </div>
        </div>
        {showReqRR && (
          <div>
            <div style={{ fontSize: 9.5, letterSpacing: 0.8, color: '#6B7280', fontWeight: 700 }}>REQ. RR</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 3 }}>
              {isNA(p.requiredRR) ? <span className="na">NA</span> : `${Math.round(p.requiredRR)} ${p.rrUnit}`}
            </div>
          </div>
        )}
        <div>
          <div style={{ fontSize: 9.5, letterSpacing: 0.8, color: '#6B7280', fontWeight: 700 }}>SQUAD</div>
          <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 3 }}>{p.squadSize} players</div>
        </div>
      </div>
      <InningsSplitCompact squad={p.squad} />
      {!isNA(p.endDate) && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #F0F1FA', fontSize: 11.5, fontWeight: 600 }}>
          <span style={{ color: '#6B7280' }}>Deadline {fmtDate(p.endDate)}</span>
          {!isNA(p.actualEndDate) && (
            <span style={{ marginLeft: 8, color: p.deliveryVarianceDays > 0 ? '#B45309' : '#15803D', fontWeight: 700 }}>
              ✓ Completed {fmtDate(p.actualEndDate)} · {p.deliveryVarianceLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
