// Applies a {TaskID: {status, jiraStatus}} map to src/data/FML-Data.xlsx and
// regenerates generated.json. `status` is the coarse done/inprogress/pending
// bucket the app's math (% complete, run rate) is built on; `jiraStatus` is
// the exact Jira workflow state text (e.g. "In QA", "Ready for Prod") shown
// verbatim on the dashboard checklist. The map is meant to be produced by
// Claude via its connected Jira access (see README — "ask Claude to sync
// Jira statuses"), not typed by hand.
//
// Usage: node scripts/apply-jira-statuses.mjs <path-to-status-map.json>
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const XLSX_PATH = path.join(root, 'src/data/FML-Data.xlsx');

const TASKID_COL = 4;
const STATUS_COL = 7;
const JIRASTATUS_COL = 13;
const STATUS_OPTIONS = new Set(['done', 'inprogress', 'pending']);
const NON_PROJECT_SHEETS = new Set(['Developers', 'Projects', 'HoursOverride', 'Wickets']);

const mapPath = process.argv[2];
if (!mapPath) {
  console.error('Usage: node scripts/apply-jira-statuses.mjs <path-to-status-map.json>');
  process.exit(1);
}

const statusMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
for (const [taskId, entry] of Object.entries(statusMap)) {
  if (!entry || !STATUS_OPTIONS.has(entry.status) || typeof entry.jiraStatus !== 'string' || !entry.jiraStatus) {
    console.error(
      `Invalid entry for ${taskId} — expected {"status": "done"|"inprogress"|"pending", "jiraStatus": "<exact Jira status text>"}, got ${JSON.stringify(entry)}`
    );
    process.exit(1);
  }
}

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(XLSX_PATH);

const changes = [];
wb.worksheets.forEach((ws) => {
  if (NON_PROJECT_SHEETS.has(ws.name)) return;

  // Older workbooks (pre-JiraStatus column) don't have this header yet —
  // add it so xlsx's sheet_to_json (keyed off row 1) picks the column up.
  // A fresh `pnpm sync-sheet` rebuild already includes it via TABLE_HEADERS.
  if (!ws.getRow(1).getCell(JIRASTATUS_COL).value) {
    ws.getRow(1).getCell(JIRASTATUS_COL).value = 'JiraStatus';
  }

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const raw = row.getCell(TASKID_COL).value;
    const taskId = typeof raw === 'string' ? raw : raw && typeof raw === 'object' ? raw.text : null;
    if (!taskId || !(taskId in statusMap)) continue;

    const { status: nextStatus, jiraStatus: nextJiraStatus } = statusMap[taskId];
    const currentStatus = row.getCell(STATUS_COL).value;
    const currentJiraStatus = row.getCell(JIRASTATUS_COL).value;
    if (currentStatus !== nextStatus || currentJiraStatus !== nextJiraStatus) {
      changes.push({
        sheet: ws.name, row: r, taskId,
        from: `${currentStatus ?? 'NA'} / ${currentJiraStatus ?? 'NA'}`,
        to: `${nextStatus} / ${nextJiraStatus}`,
      });
      row.getCell(STATUS_COL).value = nextStatus;
      row.getCell(JIRASTATUS_COL).value = nextJiraStatus;
    }
  }
});

await wb.xlsx.writeFile(XLSX_PATH);
console.log(`Updated ${changes.length} row(s) in ${XLSX_PATH}:`);
changes.forEach((c) => console.log(`  ${c.sheet}\t${c.taskId}\t${c.from} -> ${c.to}`));

console.log('\nRegenerating dashboard data...');
await import('./generate-data.mjs');
