import React from 'react';
import { isNA, NA } from '../lib/theme.js';
import { fmtDate } from '../lib/derive.js';
import { StatusBadge, NAValue } from '../components/Shared.jsx';
import InningsSplit from '../components/InningsSplit.jsx';

const EFFORT_LABELS = [
  ['buildDev', 'Build Dev', '#2A2AEA'],
  ['runConfig', 'Run Config', '#4E4EF0'],
  ['runDev', 'Run Dev', '#7273F4'],
  ['design', 'Design', '#9698F7'],
  ['qa', 'QA', '#BDBEFA'],
  ['delivery', 'Delivery', '#DCDDFD'],
];

const CHECKLIST_STATUS_STYLE = {
  done: { label: 'Done', fg: '#15803D', bg: '#E9F7EF' },
  inprogress: { label: 'In progress', fg: '#B45309', bg: '#FDF4E5' },
  pending: { label: 'Pending', fg: '#6B7280', bg: '#F3F4F6' },
};

function TaskChecklist({ taskProgress, taskList }) {
  if (!taskProgress.hasTasks) {
    return (
      <section className="section" style={{ marginTop: 16 }}>
        <div className="section-head"><div className="section-head-title">Task Checklist</div></div>
        <div className="na" style={{ padding: 22 }}>NA — add this project's tasks (with a pending/inprogress/done status) to the Tasks sheet in FML-Data.xlsx to drive completion %</div>
      </section>
    );
  }
  const order = { done: 0, inprogress: 1, pending: 2 };
  const sorted = [...taskList].sort((a, b) => order[a.status] - order[b.status]);
  return (
    <section className="section" style={{ marginTop: 16 }}>
      <div className="section-head">
        <div>
          <div className="section-head-title">Task Checklist</div>
          <div className="section-head-sub">
            {taskProgress.done} done · {taskProgress.inProgress} in progress · {taskProgress.pending} pending · {taskProgress.total} total — drives the {taskProgress.pct}% complete above
          </div>
        </div>
      </div>
      <div className="checklist-grid">
        {sorted.map((t, i) => {
          const s = CHECKLIST_STATUS_STYLE[t.status] || CHECKLIST_STATUS_STYLE.pending;
          return (
            <div
              key={t.id || `${t.name}-${i}`}
              title={t.id ? `${t.name} ${t.id}` : t.name}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 22px', background: '#FFFFFF' }}
            >
              <span className="badge" style={{ background: s.bg, color: s.fg, flex: '0 0 auto' }}>
                <span className="badge-dot" style={{ background: s.fg }} />
                {s.label}
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t.name} {t.id && <span style={{ color: '#9CA3AF', fontWeight: 600 }}>{t.id}</span>}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function EffortDonut({ effortSplit, actualEffortSplit, target }) {
  const hasSplit = !isNA(effortSplit);
  const hasAnyActual = EFFORT_LABELS.some(([k]) => !isNA(actualEffortSplit?.[k]));
  let gradient = 'conic-gradient(#E8E8F2 0% 100%)';
  if (hasSplit) {
    const total = Object.values(effortSplit).reduce((s, v) => s + v, 0) || 1;
    let acc = 0;
    const stops = EFFORT_LABELS.filter(([k]) => effortSplit[k] > 0).map(([k, , color]) => {
      const from = acc;
      acc += (effortSplit[k] / total) * 100;
      return `${color} ${from.toFixed(2)}% ${acc.toFixed(2)}%`;
    });
    gradient = `conic-gradient(${stops.join(', ')})`;
  }
  return (
    <div className="card" style={{ padding: '20px 22px' }}>
      <div style={{ fontSize: 13.5, fontWeight: 800 }}>Effort Breakdown</div>
      <div style={{ fontSize: 11.5, color: '#6B7280', fontWeight: 500, marginTop: 3 }}>
        {hasSplit ? 'Planned runs (ring) · logged runs where tracked' : 'NA — needs effort-category runs per project'}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginTop: 18 }}>
        <div style={{ position: 'relative', width: 124, height: 124, flex: '0 0 124px', borderRadius: '50%', background: gradient }}>
          <div style={{ position: 'absolute', inset: 19, background: '#FFFFFF', borderRadius: '50%', display: 'grid', placeContent: 'center', textAlign: 'center' }}>
            <div className="num" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{isNA(target) ? 'NA' : target}</div>
            <div style={{ fontSize: 9, letterSpacing: 1, color: '#6B7280', fontWeight: 700 }}>PLANNED RUNS</div>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9 }}>
          {EFFORT_LABELS.map(([k, label, color]) => {
            const actual = actualEffortSplit?.[k];
            const hasActual = !isNA(actual);
            const variance = hasActual && hasSplit ? actual - effortSplit[k] : null;
            return (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ width: 8, height: 8, borderRadius: 3, background: hasSplit ? color : '#E8E8F2' }} />
                <span style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#6B7280' }}>
                  {hasSplit ? `${effortSplit[k]}r planned` : 'NA'}
                  {hasActual && (
                    <>
                      {' · '}
                      <span style={{ color: '#1E1E2D' }}>{actual}r logged</span>
                      {variance !== null && (
                        <span style={{ color: variance > 0 ? '#B45309' : '#15803D' }}> ({variance > 0 ? '+' : ''}{variance}r)</span>
                      )}
                    </>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      {!hasAnyActual && <div className="na" style={{ marginTop: 14 }}>NA — no category has logged runs yet; add them to the Actual_* columns in the Projects sheet of FML-Data.xlsx</div>}
    </div>
  );
}

function Milestones({ milestones, hasTasks }) {
  return (
    <div className="card" style={{ padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13.5, fontWeight: 800 }}>Progress by Phase</div>
        <div style={{ fontSize: 11.5, color: '#6B7280', fontWeight: 600 }}>
          {hasTasks ? '🏏 from the task checklist, grouped by auto-tagged phase' : isNA(milestones[0].pct) ? 'NA — needs target runs' : '🏏 marks a milestone reached (template weighting)'}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 13, marginTop: 18 }}>
        {milestones.map((m) => (
          <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 20, textAlign: 'center', fontSize: 12 }}>{m.marker}</div>
            <div style={{ width: 108, fontSize: 11, fontWeight: 800, letterSpacing: 0.6, color: '#6B7280', textTransform: 'uppercase' }}>{m.label}</div>
            <div className="progress-track">
              {!isNA(m.pct) && <div className="progress-fill" style={{ width: `${m.pct}%`, background: m.color }} />}
            </div>
            <div style={{ width: 40, textAlign: 'right', fontSize: 12, fontWeight: 700 }}>{isNA(m.pct) ? <span className="na">NA</span> : `${m.pct}%`}</div>
            {hasTasks && <div style={{ width: 46, textAlign: 'right', fontSize: 10.5, color: '#9CA3AF', fontWeight: 600 }}>{isNA(m.pct) ? '' : `${m.done}/${m.total}`}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgressTrend({ trend }) {
  return (
    <div className="card" style={{ padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 800 }}>Progress Trend</div>
          <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 500, marginTop: 2 }}>% of tasks done, by the date each was last logged</div>
        </div>
        <div style={{ display: 'flex', gap: 14, fontSize: 11, fontWeight: 600, color: '#6B7280' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 14, height: 3, borderRadius: 2, background: '#2A2AEA' }} />Actual</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 14, height: 3, borderRadius: 2, background: '#C9CAE8' }} />Planned</span>
        </div>
      </div>
      <div style={{ position: 'relative' }}>
        <svg viewBox="0 0 560 190" style={{ width: '100%', height: 'auto', aspectRatio: '560 / 190', marginTop: 12, display: 'block' }}>
          <line x1="34" y1="20" x2="552" y2="20" stroke="#F0F1FA" strokeWidth="1" />
          <line x1="34" y1="55" x2="552" y2="55" stroke="#F0F1FA" strokeWidth="1" />
          <line x1="34" y1="90" x2="552" y2="90" stroke="#F0F1FA" strokeWidth="1" />
          <line x1="34" y1="125" x2="552" y2="125" stroke="#F0F1FA" strokeWidth="1" />
          <line x1="34" y1="160" x2="552" y2="160" stroke="#E8E8F2" strokeWidth="1" />
          <text x="0" y="24" fill="#9CA3AF" fontSize="10">100%</text>
          <text x="6" y="94" fill="#9CA3AF" fontSize="10">50%</text>
          <text x="14" y="164" fill="#9CA3AF" fontSize="10">0%</text>
          {trend.hasData && trend.hasPlanned && (
            <polyline points={trend.plannedPoints} fill="none" stroke="#C9CAE8" strokeWidth="2.5" strokeDasharray="5 5" strokeLinecap="round" />
          )}
          {trend.hasData && <polyline points={trend.actualPoints} fill="none" stroke="#2A2AEA" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
          {trend.hasData && trend.dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r="4.5" fill="#FFFFFF" stroke="#2A2AEA" strokeWidth="2.5" />)}
          {trend.hasData && trend.axisLabels.map((a, i) => <text key={i} x={a.x} y="182" fill="#9CA3AF" fontSize="10" textAnchor="middle">{a.label}</text>)}
        </svg>
        {!trend.hasData && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
            <span className="na">NA — needs at least one "done" task with a matching logged date in the timesheet</span>
          </div>
        )}
      </div>
    </div>
  );
}


export default function ProjectDetailPage({ project, onBack }) {
  const p = project;
  const maxRR = Math.max(isNA(p.observedRunRate) ? 0 : p.observedRunRate, isNA(p.requiredRR) ? 0 : p.requiredRR, 1);
  const gap = !isNA(p.observedRunRate) && !isNA(p.requiredRR) ? Math.round((p.observedRunRate - p.requiredRR) * 10) / 10 : null;
  const isDelivered = p.status === 'won' || p.status === 'late';

  return (
    <div>
      <button className="back-link" onClick={onBack}>← Back to Dashboard</button>

      <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>🏏</span>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: -0.9 }}>{p.client}</h1>
            <StatusBadge label={p.statusLabel} fg={p.statusFg} bg={p.statusBg} />
          </div>
          <div style={{ fontSize: 13.5, color: '#6B7280', fontWeight: 500, marginTop: 7 }}>
            {isNA(p.windowLabel) ? 'official dates NA' : p.windowLabel}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {!isNA(p.actualEndDate) && (
            <div className="card" style={{ padding: '10px 15px', borderColor: p.deliveryVarianceDays > 0 ? '#B45309' : '#15803D', background: p.deliveryVarianceDays > 0 ? '#FDF4E5' : '#E9F7EF' }}>
              <div style={{ fontSize: 9.5, letterSpacing: 1, color: p.deliveryVarianceDays > 0 ? '#B45309' : '#15803D', fontWeight: 700 }}>
                DEADLINE {fmtDate(p.endDate)} → COMPLETED {fmtDate(p.actualEndDate)}
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 3, color: p.deliveryVarianceDays > 0 ? '#B45309' : '#15803D' }}>
                {p.deliveryVarianceLabel}
              </div>
            </div>
          )}
        </div>
      </header>

      <section className="scorecard">
        <svg viewBox="0 0 360 300" style={{ position: 'absolute', right: 18, top: -26, width: 360, height: 340, opacity: 0.9, pointerEvents: 'none' }} aria-hidden="true">
          <ellipse cx="180" cy="150" rx="168" ry="132" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.20)" strokeWidth="1.5" />
          <ellipse cx="180" cy="150" rx="112" ry="88" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="1.2" strokeDasharray="5 7" />
          <rect x="164" y="86" width="32" height="128" rx="2" fill="rgba(255,255,255,0.12)" />
          <line x1="146" y1="100" x2="214" y2="100" stroke="rgba(255,255,255,0.42)" strokeWidth="1.5" />
          <line x1="146" y1="200" x2="214" y2="200" stroke="rgba(255,255,255,0.42)" strokeWidth="1.5" />
          <line x1="180" y1="78" x2="180" y2="100" stroke="rgba(255,255,255,0.42)" strokeWidth="1.5" />
          <line x1="180" y1="200" x2="180" y2="222" stroke="rgba(255,255,255,0.42)" strokeWidth="1.5" />
          <circle cx="180" cy="150" r="4" fill="rgba(255,255,255,0.55)" />
        </svg>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 40, flexWrap: 'wrap', position: 'relative' }}>
          <div>
            <div className="scorecard-eyebrow">MATCH SCORECARD</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 32, flexWrap: 'wrap' }}>
              <div>
                <div className="scorecard-score">
                  {p.completed} <span style={{ fontSize: 22, opacity: 0.7, letterSpacing: 1 }}>RUNS</span>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.6, letterSpacing: 0.6 }}>RUNS LOGGED</div>
              </div>
              <div>
                <div className="scorecard-score" style={{ opacity: 0.55 }}>
                  <NAValue value={p.targetHours} /> <span style={{ fontSize: 22, opacity: 0.7, letterSpacing: 1 }}>RUNS</span>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.6, letterSpacing: 0.6 }}>ORIGINAL ESTIMATE</div>
              </div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, opacity: 0.85, marginTop: 14 }}>
              {p.taskProgress?.hasTasks
                ? `${p.progressPct}% complete — ${p.taskProgress.done}/${p.taskProgress.total} tasks done`
                : isNA(p.progressPct)
                ? 'Add a task checklist or target runs to calculate % complete'
                : `${p.progressPct}% of target score chased (runs-based estimate)`}
            </div>
            <div style={{ height: 10, borderRadius: 6, background: 'rgba(255,255,255,0.22)', marginTop: 10, width: 420, maxWidth: '100%', overflow: 'hidden' }}>
              {!isNA(p.progressPct) && <div style={{ height: '100%', borderRadius: 6, background: '#FFFFFF', width: `${Math.min(100, p.progressPct)}%` }} />}
            </div>
          </div>
          <div className="scorecard-stats-grid">
            {isDelivered ? (
              <div>
                <div className="scorecard-stat-label">🏏 {isNA(p.marginHours) || p.marginHours >= 0 ? 'RUNS UNDER ESTIMATE' : 'RUNS OVER ESTIMATE'}</div>
                <div className="scorecard-stat-value"><NAValue value={isNA(p.marginHours) ? NA : Math.abs(p.marginHours)} suffix=" runs" /></div>
              </div>
            ) : (
              <div>
                <div className="scorecard-stat-label">🏏 RUNS REMAINING</div>
                <div className="scorecard-stat-value"><NAValue value={p.remaining} suffix=" runs" /></div>
              </div>
            )}
            <div>
              <div className="scorecard-stat-label">⏱ {isDelivered ? 'OVERS TAKEN' : 'OVERS REMAINING'}</div>
              <div className="scorecard-stat-value"><NAValue value={isDelivered ? p.actualDurationDays : p.daysLeft} /></div>
            </div>
            <div>
              <div className="scorecard-stat-label">{isDelivered ? 'BUDGETED RR' : 'REQUIRED RR'}</div>
              <div className="scorecard-stat-value">{isNA(p.requiredRR) ? <span className="na">NA</span> : Math.round(p.requiredRR)}<span style={{ fontSize: 15, opacity: 0.75 }}> {p.rrUnit}</span></div>
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <div className="scorecard-chip">{isDelivered ? 'Achieved' : 'Observed'} RR {isNA(p.observedRunRate) ? 'NA' : `${p.observedRunRate} ${p.rrUnit}`}</div>
              <div className="scorecard-chip">RR gap {gap === null ? 'NA' : `${gap >= 0 ? '+' : ''}${gap} ${p.rrUnit}`}</div>
              <div className="scorecard-chip">Squad {p.squadSize} players</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid-2">
        <div className="card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 800 }}>Run Rate</div>
              <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 500, marginTop: 2 }}>
                {isNA(p.rrTargetHours)
                  ? 'runs/over pace'
                  : `dev + QA runs only (${p.rrTargetHours}r), not the full ${p.targetHours}r budget`}
              </div>
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: gap === null ? '#6B7280' : gap >= 0 ? '#15803D' : gap > -6 ? '#B45309' : '#DC2626' }}>
              {gap === null ? 'NA' : `RR GAP ${gap >= 0 ? '+' : ''}${gap} ${p.rrUnit}`}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 7 }}>
                <span>{isDelivered ? 'Achieved RR' : 'Observed RR'}</span>
                <span className="num" style={{ fontSize: 17, fontWeight: 700 }}><NAValue value={p.observedRunRate} suffix={` ${p.rrUnit}`} /></span>
              </div>
              <div className="progress-track thick">
                {!isNA(p.observedRunRate) && <div className="progress-fill" style={{ width: `${Math.round((p.observedRunRate / maxRR) * 100)}%`, background: '#9FA0F5' }} />}
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 7 }}>
                <span>{isDelivered ? 'Budgeted RR' : 'Required RR'}</span>
                <span className="num" style={{ fontSize: 17, fontWeight: 700 }}>{isNA(p.requiredRR) ? <span className="na">NA</span> : `${Math.round(p.requiredRR)} ${p.rrUnit}`}</span>
              </div>
              <div className="progress-track thick">
                {!isNA(p.requiredRR) && <div className="progress-fill" style={{ width: `${Math.round((p.requiredRR / maxRR) * 100)}%`, background: '#2A2AEA' }} />}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid #E8E8F2', fontSize: 12.5, color: '#6B7280', fontWeight: 500 }}>
            {isDelivered && !isNA(p.marginHours)
              ? p.marginHours >= 0
                ? `${p.marginHours}r under budget — delivered using ${p.marginHours}r less than the ${p.targetHours}r budgeted, ${gap >= 0 ? 'at a pace above the budgeted rate.' : 'even though the average pace ran a little under the budgeted rate — the estimate simply had room in it.'}`
                : `${Math.abs(p.marginHours)}r over budget — delivered, but used more runs than the ${p.targetHours}r budgeted.`
              : isNA(p.targetHours) || isNA(p.endDate)
              ? 'Add target runs and an end date to compute the required pace and gap.'
              : gap >= 0
              ? 'Comfortably on pace to finish on time.'
              : `Squad needs ${Math.abs(gap)} more ${p.rrUnit} to finish on ${fmtDate(p.endDate)}.`}
          </div>
        </div>

        <ProgressTrend trend={p.progressTrend} />
      </section>

      <section className="grid-2-uneven">
        <EffortDonut effortSplit={p.effortSplit} actualEffortSplit={p.actualEffortSplit} target={p.targetHours} />
        <Milestones milestones={p.milestones} hasTasks={p.taskProgress?.hasTasks} />
      </section>

      <TaskChecklist taskProgress={p.taskProgress} taskList={p.taskList} />

      <InningsSplit squad={p.squad} />

      <section className="squad-wickets-grid">
        <div className="card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13.5, fontWeight: 800 }}>🏏 Project Squad</div>
            <div style={{ fontSize: 11.5, color: '#6B7280', fontWeight: 600 }}>{p.squadSize} players</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 14 }}>
            {p.squad.map((m) => (
              <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid #F0F1FA' }}>
                <div className="avatar avatar-round">{m.name[0]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700 }}>{m.name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{m.loggedHours}r logged</div>
                </div>
              </div>
            ))}
            {p.squad.length === 0 && <div className="na">NA — no logged runs found for this project</div>}
          </div>
        </div>

        <div className="card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13.5, fontWeight: 800 }}>🧱 Wickets (Blockers)</div>
            <div style={{ fontSize: 11.5, color: '#6B7280', fontWeight: 600 }}>{p.wickets.length} active</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
            {p.wickets.map((w, i) => (
              <div key={i} style={{ border: '1px solid #E8E8F2', borderRadius: 12, padding: '12px 14px', background: '#FCFCFF' }}>
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>{w.title}</div>
                <div style={{ fontSize: 11.5, color: '#6B7280', fontWeight: 500, marginTop: 6 }}>Owner: {w.owner} · Impact: {w.impact}</div>
              </div>
            ))}
            {p.wickets.length === 0 && <div className="na">NA — no blockers logged yet</div>}
          </div>
        </div>
      </section>
    </div>
  );
}
