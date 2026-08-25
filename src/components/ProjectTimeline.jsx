import React from 'react';
import { isNA } from '../lib/theme.js';
import { fmtDate } from '../lib/derive.js';
import { clientColor } from '../lib/clientColors.js';

const dayMs = 86400000;

export default function ProjectTimeline({ projects }) {
  const scheduled = projects.filter((p) => !isNA(p.startDate) && !isNA(p.endDate));

  if (scheduled.length === 0) {
    return (
      <section style={{ marginTop: 16, background: '#FFFFFF', border: '1px solid #E8E8F2', borderRadius: 18, boxShadow: '0 1px 2px rgba(30,30,45,0.04)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid #E8E8F2' }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>🗓 Match Calendar — Planned Timeline</div>
          <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 500, marginTop: 3 }}>Start and end dates for each match</div>
        </div>
        <div className="na" style={{ padding: 22 }}>NA — no matches have both a start and end date set</div>
      </section>
    );
  }

  const rows = [...scheduled].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  const minMs = Math.min(...rows.map((p) => new Date(p.startDate + 'T00:00:00').getTime()));
  const maxMs = Math.max(...rows.map((p) => new Date(p.endDate + 'T00:00:00').getTime()));
  const spanMs = Math.max(dayMs, maxMs - minMs);

  // Pick a tick spacing (in days) that keeps roughly 15-25 labels across the
  // axis regardless of how long the overall planned window is.
  const spanDays = spanMs / dayMs;
  const STEP_OPTIONS = [1, 2, 3, 5, 7, 10, 14, 21, 30, 60, 90];
  const stepDays = STEP_OPTIONS.find((d) => spanDays / d <= 22) || 120;

  const dayTicks = [];
  {
    const cursor = new Date(minMs);
    while (cursor.getTime() <= maxMs) {
      const t = cursor.getTime();
      dayTicks.push({
        pct: ((t - minMs) / spanMs) * 100,
        label: cursor.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      });
      cursor.setDate(cursor.getDate() + stepDays);
    }
  }

  const chartWidth = Math.max(640, Math.round(spanDays / stepDays) * 90 + 160);

  return (
    <section style={{ marginTop: 16, background: '#FFFFFF', border: '1px solid #E8E8F2', borderRadius: 18, boxShadow: '0 1px 2px rgba(30,30,45,0.04)', overflow: 'hidden' }}>
      <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid #E8E8F2' }}>
        <div style={{ fontSize: 15, fontWeight: 800 }}>🗓 Match Calendar — Planned Timeline</div>
        <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 500, marginTop: 3 }}>Planned start and end date for every match</div>
      </div>

      <div style={{ padding: '18px 22px 22px', overflowX: 'auto' }}>
        <div style={{ minWidth: chartWidth }}>
          <div style={{ position: 'relative', height: 22, marginLeft: 160 }}>
            {dayTicks.map((t, i) => (
              <div
                key={i}
                style={{ position: 'absolute', left: `${t.pct}%`, top: 0, bottom: 0, borderLeft: '1px dashed #E8E8F2', paddingLeft: 6, fontSize: 10.5, color: '#9CA3AF', fontWeight: 700 }}
              >
                {t.label}
              </div>
            ))}
          </div>

          {rows.map((p) => {
            const startMs = new Date(p.startDate + 'T00:00:00').getTime();
            const endMs = new Date(p.endDate + 'T00:00:00').getTime();
            const left = ((startMs - minMs) / spanMs) * 100;
            const width = Math.max(1.2, ((endMs - startMs) / spanMs) * 100);
            const color = clientColor(p.code);

            return (
              <div key={p.code} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderTop: '1px solid #F0F1FA' }}>
                <div style={{ width: 148, flex: '0 0 148px', fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={p.client}>
                  {p.client}
                </div>
                <div style={{ position: 'relative', flex: 1, height: 22, background: '#F6F7FF', borderRadius: 6 }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: `${left}%`,
                      width: `${width}%`,
                      top: 3,
                      bottom: 3,
                      borderRadius: 6,
                      background: color,
                      minWidth: 6,
                    }}
                    title={`${fmtDate(p.startDate)} → ${fmtDate(p.endDate)}`}
                  />
                </div>
                <div style={{ width: 168, flex: '0 0 168px', fontSize: 11, color: '#6B7280', fontWeight: 600, whiteSpace: 'nowrap' }} className="num">
                  {fmtDate(p.startDate)} → {fmtDate(p.endDate)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
