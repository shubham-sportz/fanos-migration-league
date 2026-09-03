import { isNA, NA, STATUS_META, round1 } from './theme.js';

export const TODAY = new Date('2026-08-24T00:00:00');

// Standard delivery-phase weighting used by the original Claude Design mock
// to turn one overall progress % into per-phase milestone bars. It is a
// generic template, not project-specific real data — used only once a
// project's real progress % is known (i.e. target hours supplied), and
// labelled "(template)" everywhere it appears so it never reads as measured
// per-phase completion. Swap in real per-phase targets in FML-Data.xlsx (Projects sheet)
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
 * (FML-Data.xlsx's Tasks sheet) instead of the generic PHASE_TEMPLATE weighting.
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

// How far along each exact Jira workflow status counts a task as being —
// e.g. a task sitting in QA is most of the way done, not 0%, so overall
// project % complete moves as tickets progress through the pipeline instead
// of jumping only when a ticket is fully closed. Falls back to a coarser
// per-bucket weight (see FALLBACK_STATUS_WEIGHT below) for a task with no
// ticket (no jiraStatus) or a Jira status text not listed here.
export const JIRA_STATUS_WEIGHT = {
  'To Do': 0,
  Pending: 0,
  Rejected: 0,
  'Need Clarification': 10,
  'In Dev': 40,
  'Code Review': 60,
  'Ready for QA': 75,
  'In QA': 90,
  'Ready for Prod': 95,
  Done: 100,
};
const FALLBACK_STATUS_WEIGHT = { done: 100, inprogress: 50, pending: 0 };

function taskWeight(t) {
  if (!isNA(t.jiraStatus) && t.jiraStatus in JIRA_STATUS_WEIGHT) return JIRA_STATUS_WEIGHT[t.jiraStatus];
  return FALLBACK_STATUS_WEIGHT[t.status] ?? 0;
}

/**
 * Project completion, from the master task checklist. Each task contributes
 * its Jira status weight (see JIRA_STATUS_WEIGHT) toward the overall %, so a
 * project with every task sitting "In QA" reads as ~90% rather than 0% —
 * hours stay tracked separately as a budget metric (see marginHours/requiredRR
 * below). `done`/`inProgress`/`pending` below stay the coarse counts (used
 * for the checklist's "x done · y in progress · z pending" summary line).
 */
export function computeTaskProgress(taskList) {
  const total = (taskList || []).length;
  if (total === 0) {
    return { hasTasks: false, total: 0, done: 0, inProgress: 0, pending: 0, pct: NA };
  }
  const done = taskList.filter((t) => t.status === 'done').length;
  const inProgress = taskList.filter((t) => t.status === 'inprogress').length;
  const pending = taskList.filter((t) => t.status === 'pending').length;
  const pct = Math.round(taskList.reduce((sum, t) => sum + taskWeight(t), 0) / total);
  return { hasTasks: true, total, done, inProgress, pending, pct };
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

  // Run rate's pace target (rrTargetHours below) is scoped to Build Dev +
  // Run Dev + QA only — Design-role squad hours aren't part of that budget,
  // so they're excluded here too; otherwise a Design contributor's logged
  // hours would inflate the observed pace against a target that never
  // included them. Falls back to `completed` (all roles) if squad data isn't
  // available for some reason.
  const devQaCompleted = Array.isArray(project.squad)
    ? round1(project.squad.filter((m) => m.role !== 'Design').reduce((s, m) => s + m.loggedHours, 0))
    : completed;
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

  // Run rate is scoped to HOURS (dev+QA effort only — Build Dev + Run Dev +
  // QA, since Design/Run Config/Delivery aren't pace-relevant work), not
  // tasks — pace is always "hrs/day". Task completion still drives progress
  // % and status separately (see taskProgress above); this is a distinct
  // "how fast are we burning hours" metric.
  const hasEffortSplit = !isNA(project.effortSplit);
  const devQaTargetHours = hasEffortSplit
    ? project.effortSplit.buildDev + project.effortSplit.runDev + project.effortSplit.qa
    : NA;
  const rrTargetHours = !isNA(devQaTargetHours) ? devQaTargetHours : project.targetHours;
  const hasRRTarget = !isNA(rrTargetHours) && rrTargetHours > 0;
  const rrRemaining = hasRRTarget ? Math.max(0, rrTargetHours - devQaCompleted) : NA;

  const rrUnit = 'runs/over';
  let requiredRR, observedRunRate;
  if (hasActualEnd) {
    // Retrospective, once delivered: "days left from today" is meaningless
    // for a finished project, so compare the fixed budgeted pace (dev+QA
    // hours over the whole planned window) against the pace actually
    // achieved over the real time it took.
    requiredRR = hasRRTarget && !isNA(plannedDurationDays) ? Math.round((rrTargetHours / plannedDurationDays) * 100) / 100 : NA;
    observedRunRate = !isNA(actualDurationDays) ? Math.round((devQaCompleted / actualDurationDays) * 100) / 100 : NA;
  } else {
    // In-flight: the live "required rate from here" (cricket RRR-style),
    // and the pace observed so far across the days work has actually been
    // logged.
    requiredRR = hasRRTarget && hasEnd && daysLeft > 0 ? rrRemaining / daysLeft : NA;
    const observedSpanDays =
      project.firstLoggedDate && project.lastLoggedDate ? Math.max(1, dayDiff(project.firstLoggedDate, project.lastLoggedDate) + 1) : NA;
    observedRunRate = !isNA(observedSpanDays) && observedSpanDays > 0 ? Math.round((devQaCompleted / observedSpanDays) * 100) / 100 : NA;
  }

  // Headline "total logged hours": Home + Away squad hours (`completed`,
  // already the sum of every developer's logged hours split by team) plus
  // the Design/QA/Delivery specialist hours from the Projects sheet's
  // Actual_* columns — those three aren't tracked per-developer in the
  // squad, so they'd otherwise be missing from the total entirely. Build
  // Dev/Run Config/Run Dev are excluded here since that work is already
  // counted inside `completed` via the squad's logged hours. Missing
  // Design/QA/Delivery actuals count as 0 (not logged yet), not NA — the
  // total should never go blank just because one category hasn't started.
  const actualEffort = project.actualEffortSplit || {};
  const PHASE_LOG_KEYS = ['design', 'qa', 'delivery'];
  const phaseLoggedTotal = PHASE_LOG_KEYS.reduce((s, k) => s + (isNA(actualEffort[k]) ? 0 : actualEffort[k]), 0);
  const totalLoggedHours = Math.round((completed + phaseLoggedTotal) * 100) / 100;

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

  // Manual override (FML-Data.xlsx (Projects sheet) `statusOverride`) — use when the
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
    totalLoggedHours,
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
  const parseLabel = (label) => parseDateLabel(label);
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
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(label);
  if (iso) return new Date(parseInt(iso[1], 10), parseInt(iso[2], 10) - 1, parseInt(iso[3], 10));
  const legacy = /^(\d{1,2})-([A-Za-z]{3})$/.exec(label);
  if (legacy) return new Date(2026, MONTHS[legacy[2].toLowerCase()], parseInt(legacy[1], 10));
  return null;
}

// A task's real completed date, from the TaskTimeline sheet's ActualEnd —
// falls back to the last date any timesheet entry mentioning that task's
// ticket ID (or, failing that, its name) was logged, as a real-data proxy
// for tasks that don't have an explicit ActualEnd yet. Only tasks marked
// "done" that resolve to a real date this way can be placed on the trend.
function taskCompletedDate(task, rawTasks) {
  if (!isNA(task.actualEnd)) {
    const d = parseDateLabel(task.actualEnd);
    if (d) return d;
  }
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
 * tasks) × 100, plotted at each done task's real completed date (see
 * taskCompletedDate). Falls back to hasData: false when there's no task
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
    .map((t) => ({ task: t, date: taskCompletedDate(t, project.tasks || []) }))
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
