import csvRaw from '../../Migration Tracker - Combined.csv?raw';
import { parseTimesheet } from '../lib/parseTimesheet.js';
import projectData from './project-data.json';
import taskData from './tasks.json';
import { NA } from '../lib/theme.js';

const timesheet = parseTimesheet(csvRaw);

const PROJECT_CODES = Object.keys(projectData.projects).filter((k) => !k.startsWith('_'));
const DEVELOPER_ENTRIES = Object.entries(projectData.developers).filter(([k]) => !k.startsWith('_'));

export function loadProjects() {
  return PROJECT_CODES.map((code) => {
    const meta = projectData.projects[code];
    const logged = timesheet[code] || {
      totalHours: 0,
      developers: {},
      squadSize: 0,
      minDate: null,
      maxDate: null,
      taskCount: 0,
      tasks: [],
    };
    const rolesByName = Object.fromEntries(DEVELOPER_ENTRIES.map(([name, d]) => [name, d]));

    // Manual overrides/additions from project-data.json — used when the CSV
    // parse missed a name entirely, or logged 0h for a row with no hour
    // figure in the source text (e.g. MCFC's "MCFC Fixses" entries).
    const overrides = Object.entries(meta.actualHoursByDeveloper || {}).filter(([k]) => !k.startsWith('_'));
    const hoursByName = { ...logged.developers };
    let hasOverride = false;
    overrides.forEach(([name, hours]) => {
      hoursByName[name] = hours;
      hasOverride = true;
    });

    const squad = Object.entries(hoursByName)
      .sort((a, b) => b[1] - a[1])
      .map(([name, hours]) => ({
        name,
        role: rolesByName[name]?.role || NA,
        team: rolesByName[name]?.team || NA,
        loggedHours: hours,
        isManualOverride: overrides.some(([n]) => n === name),
      }));
    const developerHours = squad.reduce((s, m) => s + m.loggedHours, 0);

    // actualEffortSplit tracks hours by discipline (e.g. QA) that are on top
    // of — not already inside — the named-developer totals above (e.g. a
    // separate QA pass not attributed to any of the tracked developers). It
    // adds to the real completed-hours total; it isn't just a side-by-side
    // comparison against the planned effortSplit.
    const effortAdditions = Object.entries(meta.actualEffortSplit || {})
      .filter(([k, v]) => !k.startsWith('_') && !isNaN(v))
      .reduce((s, [, v]) => s + v, 0);

    const completedHours = developerHours + effortAdditions;

    return {
      code,
      client: meta.client,
      kind: meta.kind,
      priority: meta.priority,
      targetHours: meta.targetHours,
      startDate: meta.startDate,
      endDate: meta.endDate,
      actualEndDate: meta.actualEndDate ?? NA,
      statusOverride: meta.statusOverride ?? NA,
      effortSplit: meta.effortSplit,
      actualEffortSplit: meta.actualEffortSplit || {},
      wickets: meta.wickets || [],
      nextOver: meta.nextOver || [],
      // real: timesheet parse, adjusted by any manual overrides above
      completedHours,
      hasManualHours: hasOverride,
      squad,
      squadSize: squad.length,
      firstLoggedDate: logged.minDate,
      lastLoggedDate: logged.maxDate,
      taskCount: logged.taskCount,
      tasks: logged.tasks,
      // Master task checklist (src/data/tasks.json) — the source of truth
      // for completion %, distinct from `tasks` above (the raw timesheet log).
      taskList: taskData[code] || [],
    };
  });
}

export const DEVELOPER_NAMES = DEVELOPER_ENTRIES.map(([name]) => name);
export const CAPACITY_HOURS_PER_DAY = projectData.capacityHoursPerDay;
