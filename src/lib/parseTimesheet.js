import Papa from 'papaparse';

// The source file is a raw developer timesheet, not a project-planning sheet:
// rows = developers, columns = dates, each cell = one or more task lines logged
// that day (free text, sometimes prefixed with a project code like "WF-").
// This parser only recovers what that sheet actually contains: logged hours
// per project/developer, who worked on a project, and the span of dates on
// which work was logged. It cannot recover target hours, priority, kind,
// dependencies, FanOS readiness, official start/end dates, effort-category
// split, blockers, or milestones — those live in project-planning data the
// team hasn't supplied yet, and are left as `NA` in project-data.json.

const PROJECT_CODES = ['WF', 'SO', 'PVL', 'MCFC'];
const NON_WORK = new Set(['free', 'na', 'leave', 'holiday', '']);

const MONTHS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function parseDateLabel(label, year = 2026) {
  const m = /^(\d{1,2})-([A-Za-z]{3})$/.exec(label.trim());
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = MONTHS[m[2].toLowerCase()];
  if (month === undefined) return null;
  return new Date(year, month, day);
}

function parseHours(text) {
  let total = 0;
  const re = /([\d.]+)\s*h\s*(\d+)?\s*m?/gi;
  let m;
  let found = false;
  while ((m = re.exec(text))) {
    found = true;
    const h = parseFloat(m[1]) || 0;
    const mm = m[2] ? parseFloat(m[2]) : 0;
    total += h + mm / 60;
  }
  if (!found) {
    const m2 = /[-–—]\s*([\d.]+)\s*$/.exec(text.trim());
    if (m2) total = parseFloat(m2[1]);
  }
  return total;
}

function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * @param {string} csvText raw CSV text of the timesheet
 * @returns {Record<string, { totalHours: number, developers: Record<string, number>,
 *   squadSize: number, minDate: string|null, maxDate: string|null, taskCount: number,
 *   tasks: Array<{dev: string, date: string, text: string, hours: number}> }>}
 */
export function parseTimesheet(csvText) {
  const parsed = Papa.parse(csvText.trim(), { skipEmptyLines: false });
  const rows = parsed.data;
  const header = rows[0];
  const dateLabels = header.slice(1);
  const dateObjs = dateLabels.map((label) => parseDateLabel(label));

  const projects = {};
  for (const code of PROJECT_CODES) {
    projects[code] = {
      totalHours: 0,
      developers: {},
      minDate: null,
      maxDate: null,
      tasks: [],
    };
  }

  for (const row of rows.slice(1)) {
    const dev = (row[0] || '').trim();
    if (!dev || PROJECT_CODES.includes(dev)) continue; // skip empty trailer rows / project-code rows
    const cells = row.slice(1);
    let currentProject = null;
    cells.forEach((rawCell, ci) => {
      const cell = (rawCell || '').trim();
      if (!cell) return;
      const lines = cell.split('\n').map((l) => l.trim()).filter(Boolean);
      for (const line of lines) {
        const lower = line.toLowerCase();
        let proj = null;
        const m = /^(WF|SO|PVL|MCFC)\b[\s\-–—]*/i.exec(line);
        if (m) {
          proj = m[1].toUpperCase();
          currentProject = proj;
        } else if (NON_WORK.has(lower) || lower.startsWith('holiday') || lower.startsWith('leave') || lower.startsWith('free')) {
          currentProject = null;
          continue;
        } else {
          proj = currentProject;
        }
        if (!proj || !projects[proj]) continue;
        const hrs = parseHours(line);
        const p = projects[proj];
        p.developers[dev] = (p.developers[dev] || 0) + hrs;
        p.totalHours += hrs;
        p.tasks.push({ dev, date: dateLabels[ci], text: line, hours: Math.round(hrs * 100) / 100 });
        const d = dateObjs[ci];
        if (d) {
          if (!p.minDate || d < p.minDate) p.minDate = d;
          if (!p.maxDate || d > p.maxDate) p.maxDate = d;
        }
      }
    });
  }

  const out = {};
  for (const [code, p] of Object.entries(projects)) {
    out[code] = {
      totalHours: Math.round(p.totalHours * 100) / 100,
      developers: Object.fromEntries(
        Object.entries(p.developers).map(([k, v]) => [k, Math.round(v * 100) / 100])
      ),
      squadSize: Object.keys(p.developers).length,
      minDate: p.minDate ? toISO(p.minDate) : null,
      maxDate: p.maxDate ? toISO(p.maxDate) : null,
      taskCount: p.tasks.length,
      tasks: p.tasks,
    };
  }
  return out;
}
