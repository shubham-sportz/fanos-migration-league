import React from 'react';
import { isNA } from '../lib/theme.js';

const NAV_ITEMS = [
  { view: 'dashboard', label: 'Dashboard', icon: '🏏' },
  { view: 'projects', label: 'Projects', icon: '▤' },
  { view: 'resources', label: 'Resources', icon: '◍' },
];

export default function Sidebar({ view, onNavigate, portfolio }) {
  const activeView = view === 'detail' ? 'projects' : view;
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">🏏</div>
        <div>
          <div className="brand-title">Fanos Migration League</div>
          <div className="brand-sub">FML · Season 2026</div>
        </div>
      </div>
      <nav className="nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.view}
            className="nav-item"
            onClick={() => onNavigate(item.view)}
            style={{
              color: item.view === activeView ? '#2A2AEA' : '#6B7280',
              background: item.view === activeView ? '#EFEFFF' : 'transparent',
            }}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-summary">
        <svg viewBox="0 0 120 120" style={{ position: 'absolute', right: -34, bottom: -38, width: 130, height: 130, pointerEvents: 'none' }} aria-hidden="true">
          <circle cx="60" cy="60" r="52" fill="#2A2AEA" fillOpacity="0.05" stroke="#2A2AEA" strokeOpacity="0.14" strokeWidth="1.2" />
          <path d="M22 30 Q60 60 22 90" fill="none" stroke="#2A2AEA" strokeOpacity="0.22" strokeWidth="1.4" strokeDasharray="3 5" />
          <path d="M34 26 Q72 60 34 94" fill="none" stroke="#2A2AEA" strokeOpacity="0.18" strokeWidth="1.2" strokeDasharray="3 5" />
        </svg>
        <div className="sidebar-summary-label">HOURS LOGGED TO DATE</div>
        <div className="sidebar-summary-value">
          {portfolio.completedHrs}
          <span style={{ fontSize: 15, color: '#6B7280' }}> hrs</span>
        </div>
        <div className="bar-track">
          {!isNA(portfolio.portfolioPct) && (
            <div className="bar-fill" style={{ width: `${portfolio.portfolioPct}%` }} />
          )}
        </div>
        <div className="sidebar-summary-sub">
          {isNA(portfolio.portfolioPct) ? 'Target hours not yet supplied — % chased unavailable' : `Portfolio ${portfolio.portfolioPct}% chased`}
        </div>
      </div>
    </aside>
  );
}
