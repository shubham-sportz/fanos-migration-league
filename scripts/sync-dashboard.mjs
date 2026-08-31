// One-shot dashboard refresh: applies Jira ticket statuses, replaces
// HoursOverride with worklog-derived hours, optionally adds new task rows
// and new developers — all in a single FML-Data.xlsx write, then
// regenerates generated.json once. Supersedes running apply-jira-statuses
// separately from a hand-rolled hours script.
//
// The payload is meant to be produced by Claude via its connected Jira
// access (see README — "ask Claude to update the dashboard"), not typed by
// hand. Any section can be omitted if there's nothing to apply for it.
//
// Usage: node scripts/sync-dashboard.mjs <path-to-payload.json>
//
// Payload shape:
// {
//   "statuses": { "FNS-10": { "status": "inprogress", "jiraStatus": "In QA" }, ... },
//   "hours": { "WF": { "Amey": 47 }, "SO": { "Mala": 29 }, ... },
//   "newDevelopers": [ { "name": "Gaurav Velankar", "team": "Home" }, ... ],
//   "newTasks": [
//     { "project": "WF", "id": "FNS-56", "name": "WF Homepage design modifications",
//       "developer": "Gaurav Velankar", "status": "done", "jiraStatus": "Done",
//       "date": "2026-08-31" },
//     ...
//   ]
// }
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const XLSX_PATH = path.join(root, 'src/data/FML-Data.xlsx');
const TICKET_BASE = 'https://sportzinteractive.atlassian.net/browse/';

const TASKID_COL = 4;
const NUM_COLS = 13;
const COL = { Date: 1, Developer: 2, ProjectCode: 3, TaskID: 4, TaskName: 5, Status: 7, PlannedStart: 9, PlannedEnd: 10, ActualEnd: 12, JiraStatus: 13 };
const STATUS_OPTIONS = new Set(['done', 'inprogress', 'pending']);
const NON_PROJECT_SHEETS = new Set(['Developers', 'Projects', 'HoursOverride', 'Wickets']);

const payloadPath = process.argv[2];
if (!payloadPath) {
  console.error('Usage: node scripts/sync-dashboard.mjs <path-to-payload.json>');
  process.exit(1);
}
const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));
const { statuses = {}, hours = {}, newDevelopers = [], newTasks = [] } = payload;

for (const [taskId, entry] of Object.entries(statuses)) {
  if (!entry || !STATUS_OPTIONS.has(entry.status) || typeof entry.jiraStatus !== 'string' || !entry.jiraStatus) {
    console.error(`Invalid statuses entry for ${taskId}: ${JSON.stringify(entry)}`);
    process.exit(1);
  }
}

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(XLSX_PATH);

const cellText = (row, col) => { const v = row.getCell(col).value; return typeof v === 'object' && v ? v.text : v; };
const setTaskId = (row, id) => { row.getCell(TASKID_COL).value = { text: id, hyperlink: `${TICKET_BASE}${id}` }; };
function nextBlankRow(ws) {
  for (let r = 2; r <= ws.rowCount; r++) {
    if (!cellText(ws.getRow(r), COL.TaskName)) return ws.getRow(r);
  }
  return ws.getRow(ws.rowCount + 1); // append past padding once it runs out
}
function nextBlankDevRow(ws) {
  for (let r = 2; r <= ws.rowCount + 1; r++) {
    if (!ws.getRow(r).getCell(1).value) return r;
  }
}

// 1. New developers first, so newTasks/hours below can reference them.
if (newDevelopers.length) {
  const devWs = wb.getWorksheet('Developers');
  let r = nextBlankDevRow(devWs);
  newDevelopers.forEach(({ name, team }) => {
    devWs.getRow(r).getCell(1).value = name;
    devWs.getRow(r).getCell(2).value = team;
    r++;
  });
}

// 2. New task rows.
newTasks.forEach((t) => {
  const ws = wb.getWorksheet(t.project);
  if (!ws) { console.error(`Unknown project "${t.project}" for new task ${t.id} — skipped.`); return; }
  const row = nextBlankRow(ws);
  row.getCell(COL.Date).value = t.date;
  row.getCell(COL.Developer).value = t.developer;
  row.getCell(COL.ProjectCode).value = t.project;
  setTaskId(row, t.id);
  row.getCell(COL.TaskName).value = t.name;
  row.getCell(COL.Status).value = t.status;
  row.getCell(COL.PlannedStart).value = t.date;
  row.getCell(COL.PlannedEnd).value = t.date;
  if (t.status === 'done') row.getCell(COL.ActualEnd).value = t.date;
  row.getCell(COL.JiraStatus).value = t.jiraStatus;
});

// 3. Ticket statuses.
let statusChanges = 0;
wb.worksheets.forEach((ws) => {
  if (NON_PROJECT_SHEETS.has(ws.name)) return;
  if (!ws.getRow(1).getCell(COL.JiraStatus).value) ws.getRow(1).getCell(COL.JiraStatus).value = 'JiraStatus';

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const taskId = cellText(row, TASKID_COL);
    if (!taskId || !(taskId in statuses)) continue;
    const { status: nextStatus, jiraStatus: nextJiraStatus } = statuses[taskId];
    if (cellText(row, COL.Status) !== nextStatus || cellText(row, COL.JiraStatus) !== nextJiraStatus) {
      row.getCell(COL.Status).value = nextStatus;
      row.getCell(COL.JiraStatus).value = nextJiraStatus;
      statusChanges++;
    }
  }
});

// 4. Hours — full replace, same as apply-jira-statuses' hours counterpart.
if (Object.keys(hours).length) {
  const hoWs = wb.getWorksheet('HoursOverride');
  for (let r = hoWs.rowCount; r >= 2; r--) hoWs.spliceRows(r, 1);
  let r = 2;
  for (const [project, byDev] of Object.entries(hours)) {
    for (const [dev, h] of Object.entries(byDev)) {
      hoWs.getRow(r).getCell(1).value = project;
      hoWs.getRow(r).getCell(2).value = dev;
      hoWs.getRow(r).getCell(3).value = h;
      r++;
    }
  }
}

await wb.xlsx.writeFile(XLSX_PATH);
console.log(`Applied ${statusChanges} status change(s), ${newTasks.length} new task(s), ${newDevelopers.length} new developer(s), ${Object.keys(hours).length ? 'replaced' : 'left unchanged'} HoursOverride.`);

console.log('\nRegenerating dashboard data...');
await import('./generate-data.mjs');
