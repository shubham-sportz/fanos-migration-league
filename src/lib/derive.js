import { isNA, NA, STATUS_META } from './theme.js';

export const TODAY = new Date('2026-08-24T00:00:00');

// Standard delivery-phase weighting used by the original Claude Design mock
// to turn one overall progress % into per-phase milestone bars. It is a
// generic template, not project-specific real data — used only once a
// project's real progress % is known (i.e. target hours supplied), and
// labelled "(template)" everywhere it appears so it never reads as measured
// per-phase completion. Swap in real per-phase targets in project-data.json
// to replace it with real numbers.
export const PHASE_TEMPLATE = [
  ['Design', 0.2667],
  ['Development', 0.4667],
  ['QA', 0.2],
  ['Delivery', 0.0667],
];

// Best-effort keyword match from a logged task's free-text title to a
// delivery phase, used only to color the per-player task Gantt when no real
// phase tag is supplied per task. Flagged "(auto-tagged)" in the UI.
const PHASE_KEYWORDS = [
  [/qa|test|bug|fix|sanity/i, 'QA'],
  [/go[\s-]?live|launch|uat|sign[\s-]?off|deploy|delivery/i, 'Delivery'],
  [/wireframe|design|banner|style|css|visual|ui\b|crest|showcase/i, 'Design'],
];
export function tagTaskPhase(text) {
  for (const [re, phase] of PHASE_KEYWORDS) {
    if (re.test(text)) return phase;
  }
  return 'Development';
}

export function computeMilestones(progressPct) {
  if (isNA(progressPct)) {
    return PHASE_TEMPLATE.map(([label]) => ({ label, pct: NA, marker: '·', color: '#E8E8F2' }));
  }
  let lower = 0;
  return PHASE_TEMPLATE.map(([label, weight]) => {
    const w = weight * 100;
    const done = Math.max(0, Math.min(100, ((progressPct - lower) / w) * 100));
    lower += w;
    const pct = Math.round(done);
    return {
      label,
      pct,
      marker: pct === 100 ? '🏏' : pct > 0 ? '•' : '·',
      color: pct === 100 ? '#2A2AEA' : pct > 0 ? '#7273F4' : '#E8E8F2',
    };
  });
}

/**
 * Real per-phase milestone completion, computed from the master task list
 * (src/data/tasks.json) instead of the generic PHASE_TEMPLATE weighting.
 * Each task is bucketed into a phase via the same best-effort title match
 * used for the task Gantt, then a phase's % is done-tasks ÷ total-tasks in
 * that phase — genuinely measured, not a template estimate, though the
 * phase bucketing itself is still auto-tagged rather than a real per-task
 * phase field.
 */
export function computeMilestonesFromTasks(taskList) {
  const groups = {};
  PHASE_TEMPLATE.forEach(([label]) => {
    groups[label] = { done: 0, total: 0 };
  });
  (taskList || []).forEach((t) => {
    const phase = tagTaskPhase(t.name || '');
    if (!groups[phase]) groups[phase] = { done: 0, total: 0 };
    groups[phase].total += 1;
    if (t.status === 'done') groups[phase].done += 1;
  });
  return PHASE_TEMPLATE.map(([label]) => {
    const g = groups[label];
    const pct = g.total > 0 ? Math.round((g.done / g.total) * 100) : NA;
    return {
      label,
      pct,
      total: g.total,
      done: g.done,
      marker: pct === 100 ? '🏏' : !isNA(pct) && pct > 0 ? '•' : '·',
      color: pct === 100 ? '#2A2AEA' : !isNA(pct) && pct > 0 ? '#7273F4' : '#E8E8F2',
    };
  });
}

/**
 * Project completion, from the master task checklist: done tasks ÷ total
 * tasks. This is now the primary "% complete" for a project — hours stay
 * tracked separately as a budget metric (see marginHours/requiredRR below).
 */
export function computeTaskProgress(taskList) {
  const total = (taskList || []).length;
  if (total === 0) {
    return { hasTasks: false, total: 0, done: 0, inProgress: 0, pending: 0, pct: NA };
  }
  const done = taskList.filter((t) => t.status === 'done').length;
  const inProgress = taskList.filter((t) => t.status === 'inprogress').length;
  const pending = taskList.filter((t) => t.status === 'pending').length;
  return { hasTasks: true, total, done, inProgress, pending, pct: Math.round((done / total) * 100) };
}

const dayDiff = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);

export function initials(name) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 4)
    .toUpperCase();
}

export const fmtDate = (d) =>
  isNA(d) ? NA : new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const shortDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/**
 * Computes everything the dashboard needs from one project record, leaving a
 * value as NA whenever the inputs it depends on are missing. Nothing here is
 * invented — it's either a straight pass-through of real timesheet data or a
 * formula over fields the team has confirmed.
 */
export function deriveProject(project) {
  const hasTarget = !isNA(project.targetHours) && project.targetHours > 0;
  const hasEnd = !isNA(project.endDate);
  const hasStart = !isNA(project.startDate);

  const completed = project.completedHours;
  const remaining = hasTarget ? Math.max(0, project.targetHours - completed) : NA;
  const hoursProgressPct = hasTarget ? Math.round((completed / project.targetHours) * 100) : NA;

  // Completion is driven by the master task checklist (done ÷ total tasks),
  // not the hours ratio — a project can burn its whole hour budget without
  // every task being done, or finish every task using more or fewer hours
  // than budgeted. Hours stay tracked separately below as a budget metric.
  const taskProgress = computeTaskProgress(project.taskList);
  const progressPct = taskProgress.hasTasks ? taskProgress.pct : hoursProgressPct;

  const daysLeft = hasEnd ? Math.max(0, dayDiff('2026-08-24', project.endDate)) : NA;
  const notStarted = hasStart ? new Date(project.startDate + 'T00:00:00') > TODAY : false;

  const hasWickets = (project.wickets || []).length > 0;
  const hasActualEnd = !isNA(project.actualEndDate);

  // Planned vs actual delivery date — a real-world completion can beat or
  // miss the planned deadline independently of the hours-based run rate, so
  // it's tracked and surfaced separately rather than folded into the RR math.
  const deliveryVarianceDays = hasActualEnd && hasEnd ? dayDiff(project.endDate, project.actualEndDate) : NA;
  const deliveryVarianceLabel = isNA(deliveryVarianceDays)
    ? NA
    : deliveryVarianceDays === 0
    ? 'on time'
    : deliveryVarianceDays < 0
    ? `${Math.abs(deliveryVarianceDays)}d early`
    : `${deliveryVarianceDays}d late`;

  const plannedDurationDays = hasStart && hasEnd ? Math.max(1, dayDiff(project.startDate, project.endDate) + 1) : NA;
  const actualDurationDays = hasActualEnd && hasStart ? Math.max(1, dayDiff(project.startDate, project.actualEndDate) + 1) : NA;

  // Run rate is scoped to TASKS completed, not hours — pace is "tasks/day"
  // once a project has a real task checklist (src/data/tasks.json). Falls
  // back to hours/day (dev+QA effort only — Build Dev + Run Dev + QA, since
  // Design/Run Config/Delivery aren't pace-relevant work) when no task list
  // exists yet for the project.
  const hasEffortSplit = !isNA(project.effortSplit);
  const devQaTargetHours = hasEffortSplit
    ? project.effortSplit.buildDev + project.effortSplit.runDev + project.effortSplit.qa
    : NA;
  const rrTargetHours = !isNA(devQaTargetHours) ? devQaTargetHours : project.targetHours;
  const hasRRTarget = !isNA(rrTargetHours) && rrTargetHours > 0;
  const rrRemaining = hasRRTarget ? Math.max(0, rrTargetHours - completed) : NA;

  const rrUnit = taskProgress.hasTasks ? 'tasks/day' : 'hrs/day';
  let requiredRR, observedRunRate;
  if (taskProgress.hasTasks) {
    const tasksRemaining = taskProgress.total - taskProgress.done;
    if (hasActualEnd) {
      // Retrospective, once delivered: compare the fixed budgeted task pace
      // (all tasks over the whole planned window) against the pace actually
      // achieved (tasks done over the real time it took).
      requiredRR = !isNA(plannedDurationDays) ? Math.round((taskProgress.total / plannedDurationDays) * 100) / 100 : NA;
      observedRunRate = !isNA(actualDurationDays) ? Math.round((taskProgress.done / actualDurationDays) * 100) / 100 : NA;
    } else {
      // In-flight: tasks remaining ÷ days left (live required pace), and
      // tasks done so far ÷ days elapsed since start (pace achieved so far).
      requiredRR = hasEnd && daysLeft > 0 ? Math.round((tasksRemaining / daysLeft) * 100) / 100 : NA;
      const elapsedDays = hasStart && !isNA(plannedDurationDays) ? Math.max(1, Math.min(plannedDurationDays, dayDiff(project.startDate, '2026-08-24') + 1)) : NA;
      observedRunRate = !isNA(elapsedDays) ? Math.round((taskProgress.done / elapsedDays) * 100) / 100 : NA;
    }
  } else if (hasActualEnd) {
    // Retrospective fallback (no task list): "days left from today" is
    // meaningless for a finished project, so compare the fixed budgeted pace
    // (dev+QA hours over the whole planned window) against the pace
    // actually achieved over the real time it took.
    requiredRR = hasRRTarget && !isNA(plannedDurationDays) ? Math.round((rrTargetHours / plannedDurationDays) * 100) / 100 : NA;
    observedRunRate = !isNA(actualDurationDays) ? Math.round((completed / actualDurationDays) * 100) / 100 : NA;
  } else {
    // In-flight fallback (no task list): the live "required rate from here"
    // (cricket RRR-style), and the pace observed so far across the days
    // work has actually been logged.
    requiredRR = hasRRTarget && hasEnd && daysLeft > 0 ? rrRemaining / daysLeft : NA;
    const observedSpanDays =
      project.firstLoggedDate && project.lastLoggedDate ? Math.max(1, dayDiff(project.firstLoggedDate, project.lastLoggedDate) + 1) : NA;
    observedRunRate = !isNA(observedSpanDays) && observedSpanDays > 0 ? Math.round((completed / observedSpanDays) * 100) / 100 : NA;
  }

  // The definitive win/loss call for a delivered project: did it finish
  // within the hours actually budgeted? This is independent of the RR
  // comparison above (a project can land under budget even at a slightly
  // lower average pace than budgeted, simply because less total effort than
  // estimated was needed) — so it's computed directly from hours, not rate.
  const marginHours = hasTarget ? Math.round((project.targetHours - completed) * 100) / 100 : NA;

  let status = 'pending';
  if (notStarted) status = 'upcoming';
  // "Won" is a delivery-date call — did it land on or before the deadline —
  // independent of whether it came in under or over the hours budget
  // (marginHours/RR track budget separately, see the scorecard's hours stats).
  else if (hasActualEnd) status = isNA(deliveryVarianceDays) ? 'delivered' : deliveryVarianceDays <= 0 ? 'won' : 'late';
  else if (hasWickets) status = 'blocked';
  else if (taskProgress.hasTasks && hasStart && hasEnd && !isNA(plannedDurationDays)) {
    // In-flight, with a real task checklist: compare tasks actually done
    // against how far through the planned schedule we are today — a
    // task-based stand-in for "are we ahead of or behind where we should be."
    const elapsedDays = Math.max(0, Math.min(plannedDurationDays, dayDiff(project.startDate, '2026-08-24') + 1));
    const expectedPct = plannedDurationDays > 0 ? (elapsedDays / plannedDurationDays) * 100 : 0;
    const ratio = expectedPct > 0 ? taskProgress.pct / expectedPct : 2;
    if (ratio >= 1) status = 'onTrack';
    else if (ratio >= 0.72) status = 'atRisk';
    else status = 'critical';
  } else if (!isNA(requiredRR) && !isNA(observedRunRate)) {
    // Fallback when there's no task checklist yet: the old hours-run-rate comparison.
    const ratio = requiredRR > 0 ? observedRunRate / requiredRR : 2;
    if (ratio >= 1) status = 'onTrack';
    else if (ratio >= 0.72) status = 'atRisk';
    else status = 'critical';
  }

  // Manual override (project-data.json `statusOverride`) — use when the
  // automatic task/schedule comparison above reads wrong for where a
  // project actually stands. Doesn't touch any of the underlying numbers
  // (progress %, RR, hours), only which status badge is shown.
  if (!isNA(project.statusOverride) && STATUS_META[project.statusOverride]) {
    status = project.statusOverride;
  }

  const meta = STATUS_META[status];
  let statusLabel = meta.label;
  if (status === 'won') statusLabel = `Won · ${deliveryVarianceLabel}`;
  else if (status === 'late') statusLabel = `Late by ${deliveryVarianceDays}d`;

  const milestones = taskProgress.hasTasks ? computeMilestonesFromTasks(project.taskList) : computeMilestones(progressPct);

  return {
    ...project,
    completed,
    remaining,
    marginHours,
    progressPct,
    hoursProgressPct,
    taskProgress,
    daysLeft,
    plannedDurationDays,
    actualDurationDays,
    rrTargetHours,
    rrUnit,
    requiredRR,
    observedRunRate,
    milestones,
    progressTrend: taskProgress.hasTasks ? buildTaskProgressTrend(project) : buildProgressTrend(project),
    deliveryVarianceDays,
    deliveryVarianceLabel,
    status,
    statusLabel,
    statusFg: meta.fg,
    statusBg: meta.bg,
    windowLabel: hasStart && hasEnd ? `${fmtDate(project.startDate)} → ${fmtDate(project.endDate)}` : NA,
    shortWindowLabel:
      project.firstLoggedDate && project.lastLoggedDate
        ? `${shortDate(project.firstLoggedDate)} – ${shortDate(project.lastLoggedDate)} logged`
        : NA,
  };
}

// Real cumulative hours logged over time, from actual task entries — used as
// the "actual" line on the progress trend chart. Always real; never NA as
// long as there's at least one logged task.
export function cumulativeByDate(tasks) {
  const byDate = {};
  tasks.forEach((t) => {
    byDate[t.date] = (byDate[t.date] || 0) + t.hours;
  });
  const parseLabel = (label) => {
    const m = /^(\d{1,2})-([A-Za-z]{3})$/.exec(label);
    if (!m) return null;
    const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
    return new Date(2026, months[m[2].toLowerCase()], parseInt(m[1], 10));
  };
  const points = Object.entries(byDate)
    .map(([label, hours]) => ({ date: parseLabel(label), label, hours }))
    .filter((p) => p.date)
    .sort((a, b) => a.date - b.date);
  let acc = 0;
  return points.map((p) => {
    acc += p.hours;
    return { date: p.date, label: p.label, cumulative: acc };
  });
}

/**
 * Builds the planned-vs-actual progress trend chart data.
 *  - actual %: real cumulative logged hours / target hours (needs targetHours)
 *  - planned %: straight line from start date to end date (needs both dates)
 * Returns hasData: false when target hours are missing, so the chart can
 * render its axes with an explicit "NA" overlay instead of a fabricated line.
 */
export function buildProgressTrend(project) {
  const hasTarget = !isNA(project.targetHours) && project.targetHours > 0;
  const hasWindow = !isNA(project.startDate) && !isNA(project.endDate);
  const series = cumulativeByDate(project.tasks || []);

  if (!hasTarget || series.length === 0) {
    return { hasData: false, plannedPoints: '', actualPoints: '', dots: [], axisLabels: [] };
  }

  const x = (t, minMs, maxMs) => 34 + ((t - minMs) / Math.max(1, maxMs - minMs)) * 518;
  const y = (v) => 160 - (Math.min(100, v) / 100) * 140;

  const minMs = hasWindow ? new Date(project.startDate + 'T00:00:00').getTime() : series[0].date.getTime();
  const maxMs = hasWindow ? new Date(project.endDate + 'T00:00:00').getTime() : series[series.length - 1].date.getTime();

  const actualPoints = series.map((p) => `${x(p.date.getTime(), minMs, maxMs).toFixed(1)},${y((p.cumulative / project.targetHours) * 100).toFixed(1)}`);
  const dots = series.map((p) => ({ x: x(p.date.getTime(), minMs, maxMs).toFixed(1), y: y((p.cumulative / project.targetHours) * 100).toFixed(1) }));

  let plannedPoints = '';
  if (hasWindow) {
    const steps = 6;
    const pts = [];
    for (let i = 0; i < steps; i++) {
      const t = minMs + ((maxMs - minMs) * i) / (steps - 1);
      pts.push(`${x(t, minMs, maxMs).toFixed(1)},${y(((t - minMs) / Math.max(1, maxMs - minMs)) * 100).toFixed(1)}`);
    }
    plannedPoints = pts.join(' ');
  }

  const axisCount = Math.min(6, series.length);
  const axisLabels = Array.from({ length: axisCount }, (_, i) => {
    const idx = Math.round((i / Math.max(1, axisCount - 1)) * (series.length - 1));
    const p = series[idx];
    return { x: x(p.date.getTime(), minMs, maxMs).toFixed(1), label: p.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) };
  });

  return { hasData: true, plannedPoints, actualPoints: actualPoints.join(' '), dots, axisLabels, hasPlanned: hasWindow };
}

const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
function parseDateLabel(label) {
  const m = /^(\d{1,2})-([A-Za-z]{3})$/.exec(label);
  if (!m) return null;
  return new Date(2026, MONTHS[m[2].toLowerCase()], parseInt(m[1], 10));
}

// A task's "completion date" isn't tracked directly (tasks.json only has a
// status), so this uses the last date any timesheet entry mentioning that
// task's ticket ID (or, failing that, its name) was logged as a real-data
// proxy for when it was likely finished. Only tasks marked "done" that have
// at least one matching, dated timesheet entry can be placed on the trend.
function lastLoggedDateForTask(task, rawTasks) {
  const matches = task.id
    ? rawTasks.filter((rt) => rt.text.includes(`[${task.id}]`))
    : rawTasks.filter((rt) => rt.text.toLowerCase().includes(task.name.toLowerCase()));
  const dates = matches.map((rt) => parseDateLabel(rt.date)).filter(Boolean);
  if (!dates.length) return null;
  return new Date(Math.max(...dates.map((d) => d.getTime())));
}

/**
 * Builds the planned-vs-actual progress trend chart from TASK completion,
 * not hours: the actual line is cumulative (done tasks so far ÷ total
 * tasks) × 100, plotted at each done task's real logged-date proxy (see
 * lastLoggedDateForTask). Falls back to hasData: false when there's no task
 * checklist, or no "done" task can be matched to a real date, rather than
 * fabricating a curve.
 */
export function buildTaskProgressTrend(project) {
  const taskList = project.taskList || [];
  if (taskList.length === 0) {
    return { hasData: false, plannedPoints: '', actualPoints: '', dots: [], axisLabels: [] };
  }
  const hasWindow = !isNA(project.startDate) && !isNA(project.endDate);
  const total = taskList.length;

  const doneWithDates = taskList
    .filter((t) => t.status === 'done')
    .map((t) => ({ task: t, date: lastLoggedDateForTask(t, project.tasks || []) }))
    .filter((d) => d.date)
    .sort((a, b) => a.date - b.date);

  if (doneWithDates.length === 0) {
    return { hasData: false, plannedPoints: '', actualPoints: '', dots: [], axisLabels: [] };
  }

  const x = (t, minMs, maxMs) => 34 + ((t - minMs) / Math.max(1, maxMs - minMs)) * 518;
  const y = (v) => 160 - (Math.min(100, v) / 100) * 140;

  const minMs = hasWindow ? new Date(project.startDate + 'T00:00:00').getTime() : doneWithDates[0].date.getTime();
  const maxMs = hasWindow ? new Date(project.endDate + 'T00:00:00').getTime() : doneWithDates[doneWithDates.length - 1].date.getTime();

  let count = 0;
  const pts = doneWithDates.map((d) => {
    count += 1;
    return { x: x(d.date.getTime(), minMs, maxMs), y: y((count / total) * 100) };
  });
  const actualPoints = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const dots = pts.map((p) => ({ x: p.x.toFixed(1), y: p.y.toFixed(1) }));

  let plannedPoints = '';
  if (hasWindow) {
    const steps = 6;
    const linePts = [];
    for (let i = 0; i < steps; i++) {
      const t = minMs + ((maxMs - minMs) * i) / (steps - 1);
      linePts.push(`${x(t, minMs, maxMs).toFixed(1)},${y(((t - minMs) / Math.max(1, maxMs - minMs)) * 100).toFixed(1)}`);
    }
    plannedPoints = linePts.join(' ');
  }

  const axisCount = Math.min(6, doneWithDates.length);
  const axisLabels = Array.from({ length: axisCount }, (_, i) => {
    const idx = Math.round((i / Math.max(1, axisCount - 1)) * (doneWithDates.length - 1));
    const d = doneWithDates[idx].date;
    return { x: x(d.getTime(), minMs, maxMs).toFixed(1), label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) };
  });

  return { hasData: true, plannedPoints, actualPoints, dots, axisLabels, hasPlanned: hasWindow };
}

export function deriveAll(projects) {
  return projects.map(deriveProject);
}
