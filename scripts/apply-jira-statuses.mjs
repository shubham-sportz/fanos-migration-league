// Applies a {TaskID: 'done'|'inprogress'|'pending'} status map to
// src/data/FML-Data.xlsx and regenerates generated.json. The map is meant to
// be produced by Claude via its connected Jira access (see README — "ask
// Claude to sync Jira statuses"), not typed by hand.
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
const STATUS_OPTIONS = new Set(['done', 'inprogress', 'pending']);
const NON_PROJECT_SHEETS = new Set(['Developers', 'Projects', 'HoursOverride', 'Wickets']);

const mapPath = process.argv[2];
if (!mapPath) {
  console.error('Usage: node scripts/apply-jira-statuses.mjs <path-to-status-map.json>');
  process.exit(1);
}

const statusMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
for (const [taskId, status] of Object.entries(statusMap)) {
  if (!STATUS_OPTIONS.has(status)) {
    console.error(`Invalid status "${status}" for ${taskId} — must be one of ${[...STATUS_OPTIONS].join(', ')}.`);
    process.exit(1);
  }
}

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(XLSX_PATH);

const changes = [];
wb.worksheets.forEach((ws) => {
  if (NON_PROJECT_SHEETS.has(ws.name)) return;
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const raw = row.getCell(TASKID_COL).value;
    const taskId = typeof raw === 'string' ? raw : raw && typeof raw === 'object' ? raw.text : null;
    if (!taskId || !(taskId in statusMap)) continue;

    const next = statusMap[taskId];
    const current = row.getCell(STATUS_COL).value;
    if (current !== next) {
      changes.push({ sheet: ws.name, row: r, taskId, from: current, to: next });
      row.getCell(STATUS_COL).value = next;
    }
  }
});

await wb.xlsx.writeFile(XLSX_PATH);
console.log(`Updated ${changes.length} row(s) in ${XLSX_PATH}:`);
changes.forEach((c) => console.log(`  ${c.sheet}\t${c.taskId}\t${c.from ?? 'NA'} -> ${c.to}`));

console.log('\nRegenerating dashboard data...');
await import('./generate-data.mjs');
