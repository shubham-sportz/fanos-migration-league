import React from 'react';
import { isNA } from '../lib/theme.js';
import { TODAY } from '../lib/derive.js';

function axisTicks(minMs, maxMs) {
  const ticks = [];
  const span = maxMs - minMs;
  const d = new Date(minMs);
  d.setDate(1);
  while (d.getTime() <= maxMs) {
    if (d.getTime() >= minMs) {
      ticks.push({
        label: d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase(),
        leftStr: (((d.getTime() - minMs) / span) * 100).toFixed(2) + '%',
      });
    }
    d.setMonth(d.getMonth() + 1);
  }
  return ticks;
}

export default function TimelinePage({ projects, onOpen }) {
  const withDates = projects.filter((p) => !isNA(p.startDate) && !isNA(p.endDate));
  const withoutDates = projects.filter((p) => isNA(p.startDate) || isNA(p.endDate));

  if (withDates.length === 0) {
    return (
      <div>
        <header style={{ marginBottom: 20 }}>
          <div className="page-eyebrow">SEASON SCHEDULE</div>
          <h1 className="page-title">Timeline</h1>
        </header>
        <div className="card na">NA — no project has both a start and an end date yet</div>
      </div>
    );
  }

  const minMs = Math.min(...withDates.map((p) => new Date(p.startDate + 'T00:00:00').getTime()));
  const maxMs = Math.max(...withDates.map((p) => new Date(p.endDate + 'T00:00:00').getTime()));
  const span = Math.max(1, maxMs - minMs);
  const posOf = (ms) => ((ms - minMs) / span) * 100;
  const ticks = axisTicks(minMs, maxMs);
  const todayStr = Math.max(0, Math.min(100, posOf(TODAY.getTime()))).toFixed(2) + '%';

  const dayDiff = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);

  const rows = withDates
    .slice()
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
    .map((p) => {
      const s = new Date(p.startDate + 'T00:00:00').getTime();
      const e = new Date(p.endDate + 'T00:00:00').getTime();
      const pct = isNA(p.progressPct) ? 0 : p.progressPct;

      // Expected progress today: how far through the planned schedule we
      // are (elapsed ÷ planned duration), to compare against actual % complete.
      const plannedDurationDays = !isNA(p.plannedDurationDays) ? p.plannedDurationDays : Math.max(1, Math.round((e - s) / 86400000) + 1);
      const elapsedDays = Math.max(0, Math.min(plannedDurationDays, dayDiff(p.startDate, '2026-08-24') + 1));
      const expectedPct = Math.round((elapsedDays / plannedDurationDays) * 100);
      const aheadBy = isNA(pct) ? null : pct - expectedPct;

      const leftPct = posOf(s);
      const widthPct = ((e - s) / span) * 100;
      const markerLeftStr = (leftPct + (expectedPct / 100) * widthPct).toFixed(2) + '%';

      return {
        ...p,
        leftStr: leftPct.toFixed(2) + '%',
        widthStr: widthPct.toFixed(2) + '%',
        pct,
        expectedPct,
        aheadBy,
        markerLeftStr,
      };
    });

  return (
    <div>
      <header style={{ marginBottom: 20 }}>
        <div className="page-eyebrow">SEASON SCHEDULE</div>
        <h1 className="page-title">Timeline</h1>
        <div className="page-sub">
          Official project windows · each row shows two bars — actual (real task-based progress %) on top, expected (linear schedule pace to today) below — so you can see who's ahead of or behind schedule at a glance
        </div>
      </header>

      <section className="section">
        <div className="section-head">
          <div>
            <div className="section-head-title">All Matches — Gantt</div>
            <div className="section-head-sub">Select a bar to open the match scorecard</div>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11.5, fontWeight: 600, color: '#6B7280' }}>
              <span style={{ width: 12, height: 8, borderRadius: 3, background: '#2A2AEA' }} />Completed
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11.5, fontWeight: 600, color: '#6B7280' }}>
              <span style={{ width: 2, height: 12, background: '#DC2626' }} />Today
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11.5, fontWeight: 600, color: '#6B7280' }}>
              <span style={{ width: 12, height: 8, borderRadius: 3, background: '#C7C8D9' }} />Expected (schedule)
            </span>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 980 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '12px 22px 8px', background: '#F6F7FF', borderBottom: '1px solid #E8E8F2' }}>
              <div style={{ width: 190, flex: '0 0 190px', fontSize: 10, letterSpacing: 1, fontWeight: 700, color: '#6B7280' }}>CLIENT / PROJECT</div>
              <div style={{ flex: 1, position: 'relative', height: 16 }}>
                {ticks.map((t, i) => (
                  <div key={i} style={{ position: 'absolute', top: 0, left: t.leftStr, fontSize: 10, fontWeight: 800, letterSpacing: 0.8, color: '#9CA3AF', whiteSpace: 'nowrap', transform: 'translateX(-50%)' }}>
                    {t.label}
                  </div>
                ))}
              </div>
              <div style={{ width: 200, flex: '0 0 200px', textAlign: 'right', fontSize: 10, letterSpacing: 1, fontWeight: 700, color: '#6B7280' }}>EXPECTED vs ACTUAL</div>
            </div>

            <div style={{ position: 'relative' }}>
              {rows.map((g) => (
                <div key={g.code} onClick={() => onOpen(g.code)} style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '10px 22px', borderTop: '1px solid #F0F1FA', cursor: 'pointer' }}>
                  <div style={{ width: 190, flex: '0 0 190px', display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: g.statusFg, flex: '0 0 7px' }} />
                    <span style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.client}</span>
                  </div>
                  <div style={{ flex: 1, position: 'relative', height: 38 }}>
                    {ticks.map((t, i) => (
                      <div key={i} style={{ position: 'absolute', top: 0, bottom: 0, width: 1, background: '#EDEEF9', left: t.leftStr }} />
                    ))}
                    <div style={{ position: 'absolute', top: 1, bottom: 1, width: 2, background: '#F0A9A9', left: todayStr }} />

                    <div style={{ position: 'absolute', top: 3, left: g.leftStr, width: g.widthStr, height: 12, borderRadius: 5, overflow: 'hidden', background: '#E8E8F2', boxShadow: '0 1px 3px rgba(42,42,234,0.16)' }}>
                      <div style={{ height: '100%', width: `${g.pct}%`, background: '#2A2AEA', borderRadius: 5 }} />
                    </div>

                    <div style={{ position: 'absolute', top: 22, left: g.leftStr, width: g.widthStr, height: 12, borderRadius: 5, overflow: 'hidden', background: '#F0F1FA' }}>
                      <div style={{ height: '100%', width: `${g.expectedPct}%`, background: '#C7C8D9', borderRadius: 5 }} />
                    </div>
                  </div>
                  <div style={{ width: 200, flex: '0 0 200px', textAlign: 'right', fontSize: 11.5, fontWeight: 600, color: '#6B7280', whiteSpace: 'nowrap' }}>
                    {isNA(g.progressPct) ? (
                      'NA'
                    ) : (
                      <>
                        Actual {g.progressPct}% · Expected {g.expectedPct}%{' '}
                        <span style={{ fontWeight: 700, color: g.aheadBy >= 0 ? '#15803D' : g.aheadBy >= -15 ? '#B45309' : '#DC2626' }}>
                          ({g.aheadBy >= 0 ? '+' : ''}{g.aheadBy})
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {withoutDates.length > 0 && (
        <div className="na" style={{ marginTop: 12 }}>
          NA — {withoutDates.map((p) => p.client).join(', ')} missing an official start/end date, excluded from the Gantt above
        </div>
      )}
    </div>
  );
}
