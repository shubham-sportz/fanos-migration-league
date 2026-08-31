// Pulls the latest data from the Google Sheet and rebuilds
// src/data/FML-Data.xlsx from it (Tables, dropdown validation, calendar
// pickers, and TaskID hyperlinks are re-applied fresh each time).
//
// Usage:  pnpm sync-sheet   (then pnpm dev / pnpm build to pick it up)
//
// The sheet must stay shared as "Anyone with the link can view" — this
// fetches its public CSV export per tab, no auth/API key involved.
import ExcelJS from 'exceljs';
import Papa from 'papaparse';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const XLSX_PATH = path.join(__dirname, '../src/data/FML-Data.xlsx');

const SHEET_ID = '1v5u1Re2RQDIlPq06b4x_RcSbcVfZdxS6s6XlSM_aRaM';

// One gid per tab. If a tab is renamed/added/removed in the sheet, update
// this map to match (open the tab in Google Sheets, the gid is the number
// after "gid=" in the URL).
const TAB_GIDS = {
  Developers: '1860575547',
  Projects: '1056595580',
  HoursOverride: '362534489',
  Wickets: '1733431538',
  WF: '1714849695',
  SO: '601254422',
  PVL: '304868248',
  MCFC: '726307464',
};
const PROJECT_CODES = ['WF', 'SO', 'PVL', 'MCFC'];

const TABLE_HEADERS = [
  'Date', 'Developer', 'ProjectCode', 'TaskID', 'TaskName', 'Est hours',
  'Status', 'comments', 'planned start date', 'planned end date',
  'Actual start date', 'Actual end date',
];
const DEVELOPER_COL = 2;
const STATUS_COL = 7;
const TASKID_COL = 4;
const DATE_COLS = [1, 9, 10, 11, 12];
const STATUS_OPTIONS = ['done', 'inprogress', 'pending'];
const EXTRA_BLANK_ROWS = 200;
const TICKET_BASE = 'https://sportzinteractive.atlassian.net/browse/';

async function fetchTabCsv(gid) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch gid ${gid}: HTTP ${res.status}`);
  const text = await res.text();
  if (!text.trim()) return { headers: [], rows: [] };
  const { data } = Papa.parse(text, { skipEmptyLines: true });
  return { headers: data[0] || [], rows: data.slice(1) };
}

const NUMERIC_RE = /^-?\d+(\.\d+)?$/;
const coerce = (v) => (typeof v === 'string' && NUMERIC_RE.test(v) ? Number(v) : v === '' ? null : v);

console.log('Fetching tabs from Google Sheet...');
const tabs = {};
for (const [name, gid] of Object.entries(TAB_GIDS)) {
  tabs[name] = await fetchTabCsv(gid);
  console.log(`  ${name}: ${tabs[name].rows.length} rows`);
}

const wb = new ExcelJS.Workbook();

['Developers', 'Projects', 'HoursOverride', 'Wickets'].forEach((name) => {
  const { headers, rows } = tabs[name];
  const ws = wb.addWorksheet(name);
  if (headers.length) {
    ws.addRow(headers);
    rows.forEach((r) => ws.addRow(r.map(coerce)));
  }
});

const devCount = tabs.Developers.rows.length;
const devRange = `Developers!$A$2:$A$${1 + devCount}`;

PROJECT_CODES.forEach((code) => {
  const { headers, rows } = tabs[code];
  const ws = wb.addWorksheet(code);

  const colIndex = Object.fromEntries(TABLE_HEADERS.map((h) => [h, headers.indexOf(h)]));
  const dataRows = rows.map((r) => TABLE_HEADERS.map((h) => {
    const idx = colIndex[h];
    const v = idx >= 0 ? r[idx] : undefined;
    if (v === undefined || v === '') return null;
    // Est hours is the only numeric column here; every other column (dates,
    // status, names) is left as text.
    return h === 'Est hours' ? coerce(v) : v;
  }));

  const blankRows = Array.from({ length: EXTRA_BLANK_ROWS }, () => TABLE_HEADERS.map(() => null));
  const allRows = dataRows.concat(blankRows);

  ws.addTable({
    name: `${code}Table`,
    ref: 'A1',
    headerRow: true,
    totalsRow: false,
    style: { theme: 'TableStyleMedium9', showRowStripes: true },
    columns: TABLE_HEADERS.map((name) => ({ name, filterButton: true })),
    rows: allRows,
  });

  const lastRow = 1 + allRows.length;
  for (let r = 2; r <= lastRow; r++) {
    ws.getCell(r, DEVELOPER_COL).dataValidation = {
      type: 'list', allowBlank: true, formulae: [devRange],
      showErrorMessage: true, errorStyle: 'warning',
      errorTitle: 'Unknown developer', error: 'Pick a name from the Developers sheet.',
    };
    ws.getCell(r, STATUS_COL).dataValidation = {
      type: 'list', allowBlank: true, formulae: [`"${STATUS_OPTIONS.join(',')}"`],
      showErrorMessage: true, errorStyle: 'warning',
      errorTitle: 'Unknown status', error: `Status must be one of: ${STATUS_OPTIONS.join(', ')}.`,
    };
    DATE_COLS.forEach((colIdx) => {
      ws.getCell(r, colIdx).dataValidation = {
        type: 'date', operator: 'between', allowBlank: true,
        formulae: [new Date(2020, 0, 1), new Date(2035, 11, 31)],
        showErrorMessage: true, errorStyle: 'warning',
        errorTitle: 'Invalid date', error: 'Please enter a valid date.',
      };
    });

    const taskId = ws.getCell(r, TASKID_COL).value;
    if (taskId && taskId !== 'NA' && typeof taskId === 'string') {
      ws.getCell(r, TASKID_COL).value = { text: taskId, hyperlink: `${TICKET_BASE}${taskId}` };
    }
  }

  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.columns.forEach((col, i) => { col.width = i === 4 ? 28 : i === 1 || i === 3 ? 16 : 14; });
});

await wb.xlsx.writeFile(XLSX_PATH);
console.log(`\nRebuilt ${XLSX_PATH} from the Google Sheet.`);

console.log('Regenerating dashboard data...');
await import('./generate-data.mjs');

console.log('\nTip: ask Claude to "sync Jira statuses" to pull live ticket');
console.log('statuses on top of this (see README) — it uses its connected');
console.log('Jira access, no API token needed.');
