import React, { useMemo, useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ProjectsPage from './pages/ProjectsPage.jsx';
import ResourcesPage from './pages/ResourcesPage.jsx';
import ProjectDetailPage from './pages/ProjectDetailPage.jsx';
import { loadProjects } from './data/loadProjects.js';
import { deriveAll } from './lib/derive.js';
import { isNA } from './lib/theme.js';

const rawProjects = loadProjects();

export default function App() {
  const [view, setView] = useState('dashboard');
  const [selectedCode, setSelectedCode] = useState(null);

  const projects = useMemo(() => deriveAll(rawProjects), []);

  const portfolio = useMemo(() => {
    const completedHrs = projects.reduce((s, p) => s + p.completed, 0);
    const hasTarget = projects.length > 0 && projects.every((p) => !isNA(p.targetHours));
    const targetHrs = hasTarget ? projects.reduce((s, p) => s + p.targetHours, 0) : null;
    return {
      completedHrs,
      targetHrs,
      remainingHrs: hasTarget ? Math.max(0, targetHrs - completedHrs) : null,
      portfolioPct: hasTarget ? Math.round((completedHrs / targetHrs) * 100) : 'NA',
      count: (status) => projects.filter((p) => p.status === status).length,
    };
  }, [projects]);

  const handleNavigate = (v) => {
    setView(v);
    setSelectedCode(null);
    window.scrollTo(0, 0);
  };

  const handleOpen = (code) => {
    setSelectedCode(code);
    setView('detail');
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    setView('dashboard');
    setSelectedCode(null);
  };

  const selectedProject = projects.find((p) => p.code === selectedCode) || null;

  return (
    <div className="app-shell">
      <Sidebar view={view} onNavigate={handleNavigate} portfolio={portfolio} />
      <main className="main">
        {view === 'dashboard' && <DashboardPage projects={projects} portfolio={portfolio} onOpen={handleOpen} />}
        {view === 'projects' && <ProjectsPage projects={projects} onOpen={handleOpen} />}
        {view === 'resources' && <ResourcesPage projects={projects} />}
        {view === 'detail' && selectedProject && <ProjectDetailPage project={selectedProject} onBack={handleBack} />}
      </main>
    </div>
  );
}
