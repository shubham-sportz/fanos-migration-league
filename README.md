# Fanos Migration League (FML)

Cricket-themed project delivery dashboard, built as a Vite + React app.

## Run it

```
pnpm install
pnpm dev
```

## Where the data comes from

- **`Migration Tracker - Combined.csv`** (a developer timesheet) — parsed
  automatically by `src/lib/parseTimesheet.js` into logged hours per
  project, squad composition, per-developer logged hours, and the span of
  dates work was actually logged on. Update this file and the dashboard
  picks up the new numbers on the next reload — no code changes needed.

- **`src/data/tasks.json`** — the master task checklist per project, and the
  **primary driver of "% complete"** (done tasks ÷ total tasks) — not hours.
  Each task is `{ "id": "FNS-61", "name": "...", "status": "pending" | "inprogress" | "done" }`.
  Add, remove, or reword tasks freely; this doesn't have to mirror the
  timesheet 1:1. It was seeded from the real task titles found in the
  timesheet, with a placeholder status (`"done"` for WF since it's already
  delivered, `"inprogress"` for the still-in-flight projects since the
  timesheet shows time was logged but not whether the task is finished) —
  **these are placeholders, not a real assessment; update them with the
  actual status of each task.** Until you do, an in-flight project with
  every task still marked `"inprogress"` will show 0% complete and
  "Critical", because none are marked `"done"` yet.

  This also drives the "Innings by Phase" milestones (real per-phase
  done/total from the checklist, not the generic template) and feeds into
  the on-track/at-risk/critical call for in-flight projects (tasks done vs.
  how far through the planned schedule today is). Hours stay tracked
  separately as a budget metric (Won/Over budget, run rate) — a project can
  be 100% task-complete while under or over its hour budget, and vice versa.

- **`src/data/project-data.json`** — the single place to edit all static
  planning data: target hours, priority, delivery format (Web/App/Both),
  official start/end dates, effort-category split, wickets/blockers,
  next-over items, and each developer's role/team.
  Use the string `"NA"` for anything unknown — the
  dashboard renders it as `NA` and skips any calculation that depends on it
  (progress %, required run rate, status, etc.) instead of guessing. The
  file has a `_readme` field and `_note` fields at the top of each section
  explaining every key; edit it directly and reload the app.

  Three per-project fields exist specifically to correct/extend what the CSV
  parse got automatically:
  - **`actualHoursByDeveloper`** — override or add a developer's actual
    logged hours for that one project (e.g. `"Shubham": 61`). Use this when
    the timesheet CSV missed a name, or logged 0h because a row's text had
    no hour figure (MCFC's rows are like this).
  - **`actualEndDate`** — when the project actually wrapped. Set it once a
    project is done to flip its status to "Won" (delivered on or before the
    deadline) or "Late" (delivered after it) and show a planned-vs-actual
    delivery date comparison on its detail page. This is a **date** call,
    independent of whether the project came in under or over its hours
    budget — that's tracked separately (see `marginHours` / "hours over/under
    budget" on the scorecard).
  - **`actualEffortSplit`** — actual logged hours per discipline (Build Dev /
    Run Config / Run Dev / Design / QA / Delivery), to compare against the
    planned `effortSplit` for that same project. Fill in whichever
    categories you're tracking (e.g. `"qa": 46`); the rest stay `"NA"` until
    supplied. Shows up as an expected-vs-actual line on both the project's
    Effort Breakdown card and the portfolio-wide Analytics page.

Run rate (Required/Budgeted RR, Observed/Achieved RR, RR gap) is based on
**tasks completed**, not hours, once a project has a task checklist in
`tasks.json` — e.g. "2 tasks/day" required vs. "1.5 tasks/day" achieved.
Falls back to hours/day (development effort only —
`effortSplit.buildDev + runDev + qa`, excluding Design/Run Config/Delivery)
if a project has no task list yet. Either way, run rate is a pace metric,
independent of the hours budget (`targetHours`, `marginHours`, Won/Late).

Each client has a fixed brand color (`src/lib/clientColors.js`) used for its
avatar and its line on the combined "Progress Trend — All Matches" chart on
the dashboard: WF `#EB0A2C`, SO `#96D600`, PVL `#F44914`, MCFC `#6DADDF`.

Everything the dashboard shows is either a real value from one of those two
files, or a clearly labeled `NA` / template estimate — nothing is invented.
Two things in `project-data.json` are policy assumptions rather than facts,
called out at the point they're used:

- `capacityHoursPerDay` — the assumed sustainable hrs/day per developer,
  used only for the Resources page "load %".
- The Timeline Gantt's phase bands still use a generic delivery-phase
  weighting template (`PHASE_TEMPLATE` in `src/lib/derive.js`) shaded by
  overall % — real per-phase task data isn't wired into that chart yet.
  "Innings by Phase" on the detail page, however, now uses the real task
  checklist (see `tasks.json` above) instead of this template, once a
  project has tasks.
- "Innings by Phase" (when using the checklist) buckets each task into a
  phase by guessing from its title (`tagTaskPhase` in `src/lib/derive.js`)
  rather than a real per-task phase field — add one to `tasks.json` entries
  and wire it in if you want that to be exact instead of guessed.

The legacy Claude Design export (`Delivery Dashboard.dc.html`, `support.js`,
`assets/`) is kept at the repo root for reference and is no longer used by
the app.
