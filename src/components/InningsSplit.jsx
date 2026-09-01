import React from 'react';
import { isNA, round1 } from '../lib/theme.js';

const TEAM_STYLE = {
  'Home': { accent: '#2A2AEA', track: '#EFEFFF' },
  'Away': { accent: '#F97316', track: '#FFF1E7' },
  'Support Staff': { accent: '#7C3AED', track: '#F3EEFF' },
};
const GROUP_ORDER = { Home: 0, Away: 1, 'Support Staff': 2 };

// Designers, testers, and delivery folks are grouped as Support Staff
// regardless of their Home/Away team — that split is Run Team vs Build
// Team, a separate axis from discipline (see TotalHoursDonut for the same
// role-first rule applied to the hours-by-discipline donut).
const SUPPORT_ROLES = new Set(['qa', 'design', 'delivery']);
function resolveGroup(m) {
  if (!isNA(m.role) && SUPPORT_ROLES.has(m.role.toLowerCase())) return 'Support Staff';
  if (!isNA(m.team)) return m.team;
  return null;
}

/**
 * Groups a squad (array of { name, team, role, loggedHours }) into Home /
 * Away / Support Staff. Works for a single project's squad or a
 * pre-merged, cross-project aggregate (see DashboardPage, which sums each
 * developer's hours across every project before passing the list in here).
 */
function groupByTeam(squad) {
  const byGroup = {};
  squad.forEach((m) => {
    const group = resolveGroup(m);
    if (!group) return;
    (byGroup[group] = byGroup[group] || []).push(m);
  });
  return Object.entries(byGroup)
    .sort(([a], [b]) => (GROUP_ORDER[a] ?? 99) - (GROUP_ORDER[b] ?? 99))
    .map(([group, members]) => {
      const sorted = [...members].sort((a, b) => b.loggedHours - a.loggedHours);
      const logged = round1(sorted.reduce((s, m) => s + m.loggedHours, 0));
      const style = TEAM_STYLE[group] || { accent: '#6B7280', track: '#F3F4F6' };
      return { team: group, members: sorted, logged, ...style };
    });
}

export default function InningsSplit({ squad, title = '🏏 Innings Split', subtitle = 'Runs logged by each developer, grouped by assigned team' }) {
  const hasTeams = squad.length > 0 && squad.every((m) => resolveGroup(m) !== null);
  const totalLogged = round1(squad.reduce((s, m) => s + m.loggedHours, 0)) || 1;

  return (
    <section style={{ marginTop: 16, position: 'relative', background: '#FFFFFF', border: '1px solid #E8E8F2', borderRadius: 18, boxShadow: '0 1px 2px rgba(30,30,45,0.04)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, padding: '18px 22px 14px', borderBottom: '1px solid #E8E8F2', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800 }}>{title}</div>
          <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 500, marginTop: 3 }}>
            {hasTeams ? subtitle : 'NA — needs a team assignment per developer'}
          </div>
        </div>
        <div className="num" style={{ fontSize: 26, fontWeight: 700 }}>
          {totalLogged}<span style={{ fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, color: '#6B7280' }}> runs logged</span>
        </div>
      </div>
      {!hasTeams ? (
        <div className="na" style={{ padding: 22 }}>NA — assign each developer to a team (Home / Away) to enable this split</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px, 100%), 1fr))', gap: 16, padding: '18px 22px' }}>
          {groupByTeam(squad).map((t) => {
            const maxLog = 300;
            return (
              <div key={t.team} style={{ border: '1px solid #E8E8F2', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 16px', background: t.track }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: t.accent }}>{t.team}</div>
                  <div className="num" style={{ fontSize: 22, fontWeight: 700 }}>{t.logged}r</div>
                </div>
                {t.members.map((m) => (
                  <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderTop: '1px solid #F0F1FA' }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: t.track, color: t.accent, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 800, flex: '0 0 30px' }}>{m.name[0]}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700 }}>{m.name}</div>
                      <div style={{ height: 7, borderRadius: 5, background: '#F0F1FA', overflow: 'hidden', marginTop: 7 }}>
                        <div style={{ height: '100%', borderRadius: 5, width: `${Math.min(100, Math.round((m.loggedHours / maxLog) * 100))}%`, background: t.accent }} />
                      </div>
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap' }}>{m.loggedHours}r</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
