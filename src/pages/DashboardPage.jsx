import React from 'react';
import { isNA, round1 } from '../lib/theme.js';
import { KpiCard } from '../components/Shared.jsx';
import ProjectCard from '../components/ProjectCard.jsx';
import InningsSplit from '../components/InningsSplit.jsx';
import ProjectTimeline from '../components/ProjectTimeline.jsx';
import stadium from '../assets/stadium-sketch.avif';

export default function DashboardPage({ projects, portfolio, onOpen }) {
  // Each developer's hours logged, summed across every project, so the
  // aggregate Home vs Away split reflects the whole portfolio
  // rather than just one match.
  const aggregatedSquad = Object.values(
    projects.reduce((byName, p) => {
      p.squad.forEach((m) => {
        if (!byName[m.name]) byName[m.name] = { name: m.name, team: m.team, loggedHours: 0 };
        byName[m.name].loggedHours = round1(byName[m.name].loggedHours + m.loggedHours);
      });
      return byName;
    }, {})
  );

  return (
    <div>
      <header className="hero">
        <div className="hero-art" aria-hidden="true">
          <img src={stadium} alt="" />
          <div className="hero-art-tint" />
        </div>
        <div style={{ position: 'relative' }}>
          <div className="page-eyebrow">
            <span>🏏</span>
            <span>DAILY MATCH REPORT</span>
          </div>
          <h1 className="hero-title">Fanos Migration League (FML)</h1>
          <div className="hero-meta">24 August 2026 · {projects.length} live matches tracked from the delivery timesheet</div>
        </div>
        <div className="hero-actions">
          <div className="pill-solid">Live scoreboard</div>
        </div>
      </header>

      <section className="kpi-grid">
        <KpiCard label="PROJECTS IN PLAY" value={projects.length} sub="tracked in the timesheet" dot="#2A2AEA" />
        <KpiCard label="WON" value={portfolio.count('won')} sub="delivered on or before the deadline" dot="#2A2AEA" />
        <KpiCard label="IN PROGRESS" value={portfolio.count('inprogress')} sub="actively being worked on" dot="#2A2AEA" />
        <KpiCard label="UPCOMING" value={portfolio.count('upcoming')} sub="not yet started" dot="#B45309" />
        <KpiCard
          label="EXPECTED vs ACTUAL"
          value={portfolio.completedHrs.toLocaleString()}
          unit={isNA(portfolio.targetHrs) ? 'runs logged' : `/ ${portfolio.targetHrs.toLocaleString()} runs`}
          sub={isNA(portfolio.remainingHrs) ? 'target runs pending for some matches' : `${portfolio.remainingHrs.toLocaleString()} runs remaining to plan`}
          dot="#9698F7"
        />
      </section>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 16, marginTop: 16, padding: '10px 18px', borderRadius: 12, background: 'linear-gradient(90deg, #F5F5FF 0%, #FFF6EF 100%)', border: '1px solid #E8E8F2', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13 }}>ℹ️</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 600, color: '#6B7280' }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#2A2AEA', flex: '0 0 9px' }} />
          <strong style={{ color: '#1E1E2D', fontWeight: 800 }}>Home</strong> = Run Team
        </span>
        <span style={{ width: 1, height: 14, background: '#E0E0EC' }} />
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 600, color: '#6B7280' }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#F97316', flex: '0 0 9px' }} />
          <strong style={{ color: '#1E1E2D', fontWeight: 800 }}>Away</strong> = Build Team
        </span>
        <span style={{ width: 1, height: 14, background: '#E0E0EC' }} />
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 600, color: '#6B7280' }}>
          <span style={{ fontSize: 11 }}>🏏</span>
          <strong style={{ color: '#1E1E2D', fontWeight: 800 }}>1 Runs</strong> = 1 Hours
        </span>
        <span style={{ width: 1, height: 14, background: '#E0E0EC' }} />
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 600, color: '#6B7280' }}>
          <span style={{ fontSize: 11 }}>⏱</span>
          <strong style={{ color: '#1E1E2D', fontWeight: 800 }}>1 Over</strong> = 1 Day
        </span>
      </div>

      <section className="section" style={{ marginTop: 10 }}>
        <div className="section-head">
          <div>
            <div className="section-head-title">All Matches</div>
            <div className="section-head-sub">Select a card to open the match scorecard</div>
          </div>
        </div>
        <div className="cards-grid" style={{ padding: '18px 22px' }}>
          {projects.map((p) => (
            <ProjectCard key={p.code} project={p} onOpen={onOpen} />
          ))}
        </div>
      </section>

      <InningsSplit
        squad={aggregatedSquad}
        title="🏏 All Matches Innings Split — Home vs Away"
        subtitle="Total runs logged across all matches, grouped by assigned team"
      />

      <ProjectTimeline projects={projects} />
    </div>
  );
}
