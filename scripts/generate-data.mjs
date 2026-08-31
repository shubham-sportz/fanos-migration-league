// Reads the single source-of-truth workbook (src/data/FML-Data.xlsx) and
// writes src/data/generated.json — the only file the app actually imports.
// generated.json is machine-generated, never hand-edited; runs automatically
// before `dev` and `build` (see package.json). To change any stat on the
// dashboard, edit FML-Data.xlsx and re-run `pnpm dev` / `pnpm build`.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const workbookPath = path.join(root, 'src/data/FML-Data.xlsx');

if (!fs.existsSync(workbookPath)) {
  console.error(`Missing ${workbookPath} — this is the single source-of-truth workbook. Nothing to generate from.`);
  process.exit(1);
}

// cellDates: true so a cell Excel actually formatted as a date comes back as
// a JS Date, not a numeric serial — dateOrNA() below normalizes either that
// or a plain typed string into a "YYYY-MM-DD" string.
const wb = XLSX.readFile(workbookPath, { cellDates: true });
const sheet = (name) => {
  const ws = wb.Sheets[name];
  return ws ? XLSX.utils.sheet_to_json(ws, { defval: 'NA', raw: true }) : [];
};

const NA = 'NA';
const orNA = (v) => (v === '' || v === undefined || v === null ? NA : v);

// Old CSV-header-style date label ("27-Jul") — kept only so any leftover
// entries in that legacy format still parse; new data should just be typed
// as a real date into the cell.
const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
function parseLegacyLabel(label, year = 2026) {
  const m = /^(\d{1,2})-([A-Za-z]{3})$/.exec(String(label).trim());
  if (!m) return null;
  const month = MONTHS[m[2].toLowerCase()];
  if (month === undefined) return null;
  return new Date(year, month, parseInt(m[1], 10));
}
function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
// Normalizes a date cell (JS Date from an Excel date-formatted cell, a
// "YYYY-MM-DD" string, or a legacy "27-Jul" label) into a plain ISO string,
// or NA if it's empty/unparseable — never guesses.
function dateOrNA(v) {
  if (v === '' || v === undefined || v === null || v === 'NA') return NA;
  if (v instanceof Date) return toISO(v);
  const legacy = parseLegacyLabel(v);
  if (legacy) return toISO(legacy);
  return String(v).trim();
}

// --- Capacity: fixed at 8 hours/day (was previously the Config sheet's
// only entry; that sheet has been removed as it never carried anything else). ---
const CAPACITY_HOURS_PER_DAY = 8;

// --- Developers ---
const developers = {};
sheet('Developers').forEach((r) => {
  developers[r.Name] = { team: orNA(r.Team), role: orNA(r.Role) };
});

// --- Projects (planned + actual effort split) ---
const projects = {};
sheet('Projects').forEach((r) => {
  projects[r.Code] = {
    client: orNA(r.Client),
    kind: orNA(r.Kind),
    priority: orNA(r.Priority),
    targetHours: orNA(r.TargetHours),
    startDate: dateOrNA(r.StartDate),
    endDate: dateOrNA(r.EndDate),
    actualEndDate: dateOrNA(r.ActualEndDate),
    statusOverride: orNA(r.StatusOverride),
    effortSplit: {
      buildDev: orNA(r.Planned_BuildDev),
      runConfig: orNA(r.Planned_RunConfig),
      runDev: orNA(r.Planned_RunDev),
      design: orNA(r.Planned_Design),
      qa: orNA(r.Planned_QA),
      delivery: orNA(r.Planned_Delivery),
    },
    actualEffortSplit: {
      buildDev: orNA(r.Actual_BuildDev),
      runConfig: orNA(r.Actual_RunConfig),
      runDev: orNA(r.Actual_RunDev),
      design: orNA(r.Actual_Design),
      qa: orNA(r.Actual_QA),
      delivery: orNA(r.Actual_Delivery),
    },
    actualHoursByDeveloper: {},
    wickets: [],
  };
});

// --- HoursOverride ---
sheet('HoursOverride').forEach((r) => {
  if (!projects[r.ProjectCode]) return;
  projects[r.ProjectCode].actualHoursByDeveloper[r.Developer] = r.Hours;
});

// --- Wickets ---
sheet('Wickets').forEach((r) => {
  if (!projects[r.ProjectCode]) return;
  projects[r.ProjectCode].wickets.push({ title: orNA(r.Title), owner: orNA(r.Owner), impact: orNA(r.Impact) });
});

// --- Per-project sheet (one sheet per project Code, e.g. "WF", "MCFC"):
// merges what used to be three separate sheets (Tasks, TaskTimeline,
// Timesheet) into one log-entry-per-row sheet. Each row is one developer's
// work-log entry against one task on one date, carrying that task's status
// and planned/actual timeline alongside it (repeated across every row for
// the same task — denormalized, but there's only ever one sheet to edit).
//
// From this we still derive the same two things the rest of the app expects:
//  - tasks[code]: the master task checklist, one entry per unique task
//  - timesheet[code]: per-project squad presence + logged date range
// Ticket links follow one fixed pattern across every project (confirmed
// against the Tickets column in Migration Tracker.xlsx) — a TaskID always
// resolves to its Jira ticket at this base URL.
const TICKET_BASE = 'https://sportzinteractive.atlassian.net/browse/';

const tasks = {};
const timesheet = {};
Object.keys(projects).forEach((code) => {
  // Each project sheet is an Excel Table with a couple hundred blank rows
  // left below the real data for future entries — skip those until a
  // developer name is actually filled in.
  const rows = sheet(code).filter((r) => r.Developer && r.Developer !== 'NA');

  const taskList = [];
  const seen = new Set();
  const p = { developers: {}, squadSize: 0, minDate: null, maxDate: null, taskCount: 0, tasks: [] };

  rows.forEach((r) => {
    // Master checklist: one entry per unique task, keyed by TaskID when
    // present, else by TaskName (mirrors how blank-TaskID rows were already
    // matched back to a task when this workbook still had separate sheets).
    const taskKey = r.TaskID && r.TaskID !== 'NA' ? `id:${r.TaskID}` : `name:${r.TaskName}`;
    if (!seen.has(taskKey)) {
      seen.add(taskKey);
      const id = r.TaskID && r.TaskID !== 'NA' ? r.TaskID : null;
      taskList.push({
        id,
        url: id ? `${TICKET_BASE}${id}` : NA,
        name: r.TaskName,
        developer: orNA(r.Developer),
        status: r.Status,
        // The exact Jira workflow state (e.g. "In QA", "Ready for Prod"),
        // kept separate from `status` above — that stays the coarse
        // done/inprogress/pending bucket the rest of the app's math
        // (% complete, run rate) is built on. NA for tasks with no ticket,
        // or before a Jira sync has ever populated this column.
        jiraStatus: orNA(r.JiraStatus),
        plannedStart: dateOrNA(r['planned start date']),
        plannedEnd: dateOrNA(r['planned end date']),
        actualStart: dateOrNA(r['Actual start date']),
        actualEnd: dateOrNA(r['Actual end date']),
      });
    }

    // Presence marker, not an hours sum — actual hours are read from
    // HoursOverride in loadProjects.js. Leaving this at 0 means "mentioned in
    // the sheet but no hours override supplied yet" rather than dropping the
    // person from the squad entirely.
    if (!(r.Developer in p.developers)) p.developers[r.Developer] = 0;
    const dateISO = dateOrNA(r.Date);
    const text = r.TaskID && r.TaskID !== 'NA' ? `${r.TaskName} [${r.TaskID}]` : String(r.TaskName);
    p.tasks.push({ dev: r.Developer, date: dateISO, startDate: dateISO, endDate: dateISO, text, hours: 0 });
    if (dateISO !== NA && (!p.minDate || dateISO < p.minDate)) p.minDate = dateISO;
    if (dateISO !== NA && (!p.maxDate || dateISO > p.maxDate)) p.maxDate = dateISO;
  });

  p.squadSize = Object.keys(p.developers).length;
  p.taskCount = p.tasks.length;

  tasks[code] = taskList;
  timesheet[code] = p;
});

const generated = {
  capacityHoursPerDay: CAPACITY_HOURS_PER_DAY,
  developers,
  projects,
  tasks,
  timesheet,
};

const outPath = path.join(root, 'src/data/generated.json');
fs.writeFileSync(outPath, JSON.stringify(generated, null, 2));
console.log(`Generated ${outPath} from FML-Data.xlsx`);
