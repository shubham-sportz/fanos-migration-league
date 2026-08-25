import React, { useState } from 'react';
import ProjectCard from '../components/ProjectCard.jsx';

const FILTERS = ['All matches', 'Won', 'Late', 'In progress', 'Critical', 'At risk', 'Blocked', 'On track', 'Upcoming', 'Data pending'];
const FILTER_KEY = {
  'All matches': null,
  Won: 'won',
  Late: 'late',
  'In progress': 'inprogress',
  Critical: 'critical',
  'At risk': 'atRisk',
  Blocked: 'blocked',
  'On track': 'onTrack',
  Upcoming: 'upcoming',
  'Data pending': 'pending',
};

export default function ProjectsPage({ projects, onOpen }) {
  const [filter, setFilter] = useState('All matches');
  const key = FILTER_KEY[filter];
  const visible = key ? projects.filter((p) => p.status === key) : projects;

  return (
    <div>
      <header style={{ marginBottom: 22 }}>
        <div className="page-eyebrow">ALL MATCHES</div>
        <h1 className="page-title">Projects</h1>
        <div className="page-sub">Sorted by urgency — critical and blocked innings first</div>
      </header>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        {FILTERS.map((f) => {
          const k = FILTER_KEY[f];
          const count = k ? projects.filter((p) => p.status === k).length : projects.length;
          return (
            <div key={f} className={`filter-pill${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
              <span>{f}</span>
              <span className="filter-count">{count}</span>
            </div>
          );
        })}
      </div>
      <div className="cards-grid">
        {visible.map((p) => (
          <ProjectCard key={p.code} project={p} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}
