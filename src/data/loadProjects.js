import generated from './generated.json';
import { NA, round1 } from '../lib/theme.js';

const { projects: projectData, tasks: taskData, timesheet, developers, capacityHoursPerDay } = generated;

const PROJECT_CODES = Object.keys(projectData);
const DEVELOPER_ENTRIES = Object.entries(developers);

export function loadProjects() {
  return PROJECT_CODES.map((code) => {
    const meta = projectData[code];
    const logged = timesheet[code] || {
      developers: {},
      squadSize: 0,
      minDate: null,
      maxDate: null,
      taskCount: 0,
      tasks: [],
    };
    const teamsByName = Object.fromEntries(DEVELOPER_ENTRIES.map(([name, d]) => [name, d]));

    // Logged hours come ONLY from the workbook's HoursOverride sheet — the
    // per-project sheet just tracks who worked on what and when, no hours.
    // `logged.developers` below is a presence map (everyone the timesheet
    // mentions, at 0h) so a developer still shows up in the squad even
    // before their hours are added to HoursOverride.
    const overrides = Object.entries(meta.actualHoursByDeveloper || {});
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
        role: teamsByName[name]?.role || NA,
        team: teamsByName[name]?.team || NA,
        loggedHours: hours,
        isManualOverride: overrides.some(([n]) => n === name),
      }));
    // completedHours counts only named-developer hours (HoursOverride/squad)
    // — actualEffortSplit is shown separately on the Effort Breakdown card as
    // a planned-vs-actual comparison, but no longer added into the total.
    const completedHours = round1(squad.reduce((s, m) => s + m.loggedHours, 0));

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
      // real: timesheet parse, adjusted by any manual overrides above
      completedHours,
      hasManualHours: hasOverride,
      squad,
      squadSize: squad.length,
      firstLoggedDate: logged.minDate,
      lastLoggedDate: logged.maxDate,
      taskCount: logged.taskCount,
      tasks: logged.tasks,
      // Master task checklist (Tasks sheet in FML-Data.xlsx) — the source of
      // truth for completion %, distinct from `tasks` above (the raw timesheet log).
      taskList: taskData[code] || [],
    };
  });
}

export const DEVELOPER_NAMES = DEVELOPER_ENTRIES.map(([name]) => name);
export const CAPACITY_HOURS_PER_DAY = capacityHoursPerDay;
