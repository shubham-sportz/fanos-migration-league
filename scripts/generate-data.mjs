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

// --- Config ---
const configRows = sheet('Config');
const config = Object.fromEntries(configRows.map((r) => [r.Key, r.Value]));

// --- Developers ---
const developers = {};
sheet('Developers').forEach((r) => {
  developers[r.Name] = { role: orNA(r.Role), team: orNA(r.Team) };
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

// --- Tasks ---
const tasks = {};
sheet('Tasks').forEach((r) => {
  (tasks[r.ProjectCode] = tasks[r.ProjectCode] || []).push({
    id: r.TaskID && r.TaskID !== 'NA' ? r.TaskID : null,
    name: r.TaskName,
    status: r.Status,
    plannedStart: NA,
    plannedEnd: NA,
    actualStart: NA,
    actualEnd: NA,
  });
});

// --- TaskTimeline: planned/actual start & end per task, merged onto the matching Tasks entry ---
sheet('TaskTimeline').forEach((r) => {
  const list = tasks[r.ProjectCode];
  if (!list) return;
  const match = r.TaskID && r.TaskID !== 'NA'
    ? list.find((t) => t.id === r.TaskID)
    : list.find((t) => t.name === r.TaskName);
  if (!match) return;
  match.plannedStart = dateOrNA(r.PlannedStart);
  match.plannedEnd = dateOrNA(r.PlannedEnd);
  match.actualStart = dateOrNA(r.ActualStart);
  match.actualEnd = dateOrNA(r.ActualEnd);
});

// --- Timesheet: no hours here — hours come from HoursOverride only. This
// sheet re-aggregates into per-project squad presence (who worked on it) and
// the date range work was logged over; each Timesheet row is now a
// StartDate/EndDate span rather than a single day. ---
const timesheet = {};
Object.keys(projects).forEach((code) => {
  timesheet[code] = { developers: {}, squadSize: 0, minDate: null, maxDate: null, taskCount: 0, tasks: [] };
});
sheet('Timesheet').forEach((r) => {
  const p = timesheet[r.ProjectCode];
  if (!p) return;
  // Presence marker, not an hours sum — actual hours are read from
  // HoursOverride in loadProjects.js. Leaving this at 0 means "mentioned in
  // the timesheet but no hours override supplied yet" rather than dropping
  // the person from the squad entirely.
  if (!(r.Developer in p.developers)) p.developers[r.Developer] = 0;
  const startISO = dateOrNA(r.StartDate);
  const endISO = dateOrNA(r.EndDate) !== NA ? dateOrNA(r.EndDate) : startISO;
  p.tasks.push({ dev: r.Developer, date: endISO, startDate: startISO, endDate: endISO, text: r.TaskText, hours: 0 });
  if (startISO !== NA && (!p.minDate || startISO < p.minDate)) p.minDate = startISO;
  if (endISO !== NA && (!p.maxDate || endISO > p.maxDate)) p.maxDate = endISO;
});
Object.values(timesheet).forEach((p) => {
  p.squadSize = Object.keys(p.developers).length;
  p.taskCount = p.tasks.length;
});

const generated = {
  capacityHoursPerDay: config.capacityHoursPerDay ?? 8,
  developers,
  projects,
  tasks,
  timesheet,
};

const outPath = path.join(root, 'src/data/generated.json');
fs.writeFileSync(outPath, JSON.stringify(generated, null, 2));
console.log(`Generated ${outPath} from FML-Data.xlsx`);
