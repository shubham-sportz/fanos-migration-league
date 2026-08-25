import React from 'react';
import { isNA } from '../lib/theme.js';
import { KpiCard } from '../components/Shared.jsx';
import ProjectCard from '../components/ProjectCard.jsx';
import InningsSplit from '../components/InningsSplit.jsx';
import stadium from '../assets/stadium-sketch.avif';

export default function DashboardPage({ projects, portfolio, onOpen }) {
  // Each developer's hours logged, summed across every project, so the
  // aggregate Home vs Away split reflects the whole portfolio
  // rather than just one match.
  const aggregatedSquad = Object.values(
    projects.reduce((byName, p) => {
      p.squad.forEach((m) => {
        if (!byName[m.name]) byName[m.name] = { name: m.name, team: m.team, loggedHours: 0 };
        byName[m.name].loggedHours += m.loggedHours;
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
          <div className="pill">Live data</div>
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
          unit={isNA(portfolio.targetHrs) ? 'hrs logged' : `/ ${portfolio.targetHrs.toLocaleString()} hrs`}
          sub={isNA(portfolio.remainingHrs) ? 'target hours pending for some matches' : `${portfolio.remainingHrs.toLocaleString()} hrs remaining to plan`}
          dot="#9698F7"
        />
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <div className="section-head-title">All Matches</div>
            <div className="section-head-sub">Select a card to open the match scorecard</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16, padding: '18px 22px' }}>
          {projects.map((p) => (
            <ProjectCard key={p.code} project={p} onOpen={onOpen} />
          ))}
        </div>
      </section>

      <InningsSplit
        squad={aggregatedSquad}
        title="🏏 Innings Split — Home vs Away"
        subtitle="Total hours logged across all matches, grouped by assigned team"
      />
    </div>
  );
}
