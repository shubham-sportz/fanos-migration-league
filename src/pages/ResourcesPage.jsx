import React from 'react';
import { NAValue } from '../components/Shared.jsx';
import { CAPACITY_HOURS_PER_DAY } from '../data/loadProjects.js';

export default function ResourcesPage({ projects }) {
  const byDev = {};
  projects.forEach((p) => {
    p.squad.forEach((m) => {
      if (!byDev[m.name]) byDev[m.name] = { name: m.name, role: m.role, projects: [], totalHours: 0, dates: [] };
      byDev[m.name].projects.push({ code: p.code, client: p.client, hours: m.loggedHours });
      byDev[m.name].totalHours += m.loggedHours;
      p.tasks.filter((t) => t.dev === m.name).forEach((t) => byDev[m.name].dates.push(t.date));
    });
  });

  const parseLabel = (label) => {
    const m = /^(\d{1,2})-([A-Za-z]{3})$/.exec(label);
    const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
    return m ? new Date(2026, months[m[2].toLowerCase()], parseInt(m[1], 10)).getTime() : null;
  };

  const resources = Object.values(byDev)
    .map((r) => {
      const times = r.dates.map(parseLabel).filter(Boolean);
      const activeDays = times.length ? Math.max(1, Math.round((Math.max(...times) - Math.min(...times)) / 86400000) + 1) : 1;
      const capacity = activeDays * CAPACITY_HOURS_PER_DAY;
      const loadPct = Math.round((r.totalHours / capacity) * 100);
      const loadColor = loadPct > 100 ? '#DC2626' : loadPct > 85 ? '#B45309' : '#15803D';
      const loadLabel = loadPct > 100 ? 'Over-allocated' : loadPct > 85 ? 'Near capacity' : 'Healthy';
      return { ...r, activeDays, loadPct, loadColor, loadLabel };
    })
    .sort((a, b) => b.loadPct - a.loadPct);

  const overAllocated = resources.filter((r) => r.loadPct > 100).length;

  return (
    <div>
      <header style={{ marginBottom: 22 }}>
        <div className="page-eyebrow">SQUAD POOL</div>
        <h1 className="page-title">Resources</h1>
        <div className="page-sub">Logged hours per developer, derived from the migration timesheet · load % assumes a {CAPACITY_HOURS_PER_DAY}h/day sustainable capacity</div>
      </header>

      <section className="grid-4">
        <div className="card">
          <div className="kpi-head"><span className="dot" style={{ background: '#2A2AEA' }} /><span className="kpi-label">SQUAD POOL</span></div>
          <div className="kpi-value">{resources.length}</div>
          <div className="kpi-sub">developers with logged hours</div>
        </div>
        <div className="card">
          <div className="kpi-head"><span className="dot" style={{ background: '#DC2626' }} /><span className="kpi-label">OVER-ALLOCATED</span></div>
          <div className="kpi-value">{overAllocated}</div>
          <div className="kpi-sub">above the assumed healthy load</div>
        </div>
        <div className="card">
          <div className="kpi-head"><span className="dot" style={{ background: '#9698F7' }} /><span className="kpi-label">AVG. MATCHES / PLAYER</span></div>
          <div className="kpi-value">{(resources.reduce((s, r) => s + r.projects.length, 0) / Math.max(1, resources.length)).toFixed(1)}</div>
          <div className="kpi-sub">concurrent project assignments</div>
        </div>
        <div className="card">
          <div className="kpi-head"><span className="dot" style={{ background: '#B45309' }} /><span className="kpi-label">HRS LOGGED / PLAYER</span></div>
          <div className="kpi-value">{Math.round(resources.reduce((s, r) => s + r.totalHours, 0) / Math.max(1, resources.length))}</div>
          <div className="kpi-sub">average across the squad pool</div>
        </div>
      </section>

      <section className="section" style={{ marginTop: 18 }}>
        <div className="section-head">
          <div>
            <div className="section-head-title">Player Allocation</div>
            <div className="section-head-sub">Load indexed against a {CAPACITY_HOURS_PER_DAY}h/day capacity assumption over each player's active days · role not yet supplied</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {resources.map((r) => (
            <div key={r.name} style={{ display: 'flex', alignItems: 'flex-start', gap: 18, padding: '15px 22px', borderTop: '1px solid #F0F1FA', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: 200, flex: '0 0 200px' }}>
                <div className="avatar avatar-round">{r.name[0]}</div>
                <div>
                  <div className="name-primary">{r.name}</div>
                </div>
              </div>
              <div style={{ flex: '1 1 300px', minWidth: 240 }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {r.projects.map((pr) => (
                    <span key={pr.code} className="chip" style={{ color: '#2A2AEA', border: '1px solid #E8E8F2' }}>
                      {pr.code} · {pr.hours}h
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ width: 190, flex: '0 0 190px', marginLeft: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
                  <span style={{ color: r.loadColor }}>{r.loadLabel}</span>
                  <span>{r.loadPct}%</span>
                </div>
                <div className="progress-track thick">
                  <div className="progress-fill" style={{ width: `${Math.min(100, r.loadPct)}%`, background: r.loadColor }} />
                </div>
              </div>
              <div style={{ width: 74, flex: '0 0 74px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#6B7280', whiteSpace: 'nowrap' }}>
                {r.projects.length} matches
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
