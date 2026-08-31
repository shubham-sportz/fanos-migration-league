# Fanos Migration League (FML)

Cricket-themed project delivery dashboard, built as a Vite + React app.

## Run it

```
pnpm install
pnpm dev
```

## Where the data comes from

**`src/data/FML-Data.xlsx` is the single source of truth for the entire
dashboard.** There is no other data file to edit — no JSON, no CSV. Open it
in Excel/Numbers/Google Sheets, edit a cell, save, and reload the app (or
re-run `pnpm dev` / `pnpm build`) to see the change everywhere it applies.
It has these sheets:

- **`Config`** — one key/value: `capacityHoursPerDay`, the assumed
  sustainable hrs/day per developer used only for the Resources page
  "load %". A policy assumption, not a fact.

- **`Developers`** — `Name | Role | Team`. `Team` is `Home` or `Away`
  (drives the Home vs Away Innings Split on the dashboard and each
  project's detail page). Use `NA` for an unknown role.

- **`Projects`** — one row per project code: `Client, Kind, Priority,
  TargetHours, StartDate, EndDate, ActualEndDate, StatusOverride`, plus
  planned/actual hours per discipline (`Planned_BuildDev`, `Actual_BuildDev`,
  … for BuildDev/RunConfig/RunDev/Design/QA/Delivery).
  - `TargetHours`/`StartDate`/`EndDate` are the plan; leave `ActualEndDate`
    as `NA` while a project is still in flight — set it once delivered to
    flip the status to "Won" (on/before deadline) or "Late" (after), shown
    independently of whether the project came in under/over its hour
    budget (that's `marginHours`, tracked separately).
  - `StatusOverride` manually forces the status badge (`inprogress`,
    `upcoming`, `blocked`, `onTrack`, `atRisk`, `critical`) when the
    automatic task/schedule comparison reads wrong for where a project
    actually stands. Leave `NA` to trust the computed status.
  - `Actual_*` columns are hours logged against that discipline that are
    **not already** counted in `HoursOverride`/the timesheet (e.g. a QA
    pass by someone outside the tracked squad) — they get added on top of
    the squad's logged hours, so only fill one in if it'd otherwise be
    double-counted-free.

- **`HoursOverride`** — `ProjectCode | Developer | Hours`. **This is the
  only source of logged hours in the whole workbook.** The Timesheet sheet
  (below) tracks what was worked on and when, but not hours — so every
  developer who has hours on a project needs a row here. A developer can
  still show up in a project's squad with `0h` if they appear in Timesheet
  but have no row here yet.

- **`Tasks`** — `ProjectCode | TaskID | TaskName | Status`
  (`pending` | `inprogress` | `done`). The master checklist per project and
  the **primary driver of "% complete"** (done ÷ total) — not hours. Add,
  remove, or reword tasks freely. This also drives "Innings by Phase"
  (real per-phase done/total, bucketed from each task's title via
  `tagTaskPhase` in `src/lib/derive.js` — add a real phase column here and
  wire it in if you want that exact instead of guessed) and the
  onTrack/atRisk/critical call for in-flight projects (tasks done vs. how
  far through the planned schedule today is). An in-flight project with
  every task still `inprogress` shows 0% complete and "Critical" until you
  mark some `done`.

- **`TaskTimeline`** — `ProjectCode | TaskID | TaskName | PlannedStart |
  PlannedEnd | ActualStart | ActualEnd`. One row per task, so you can see the
  planned schedule for a task next to when it actually started/finished.
  `ActualEnd` (when supplied) is what places a `done` task on the project
  detail page's Progress Trend chart — more reliable than the old fallback
  of guessing a task's completion date from the last timesheet entry that
  mentions it, which is still used only when a task has no `ActualEnd` yet.
  Leave any of the four date columns `NA` until you have a real date for it;
  a task with a `TaskID` here is matched to its `Tasks` row by that ID,
  otherwise by matching `TaskName`.

- **`Wickets`** — `ProjectCode | Title | Owner | Impact`. Active blockers
  shown on the project detail page.

- **`Timesheet`** — `StartDate | EndDate | Developer | ProjectCode | TaskID |
  TaskText`, one row per logged unit of work — **no hours column**; hours
  live only in `HoursOverride` above. `StartDate`/`EndDate` let one row span
  the days a developer actually worked that task (a single day is
  `StartDate == EndDate`). This is re-aggregated into each project's squad
  composition (who worked on it) and the date range work was logged over.

Run rate (Required/Budgeted RR, Observed/Achieved RR, RR gap) is based on
**tasks completed**, not hours, once a project has rows in `Tasks` — e.g.
"2 tasks/day" required vs. "1.5 tasks/day" achieved. Falls back to hours/day
(development effort only — `BuildDev + RunDev + QA`, excluding
Design/RunConfig/Delivery) if a project has no tasks yet. Either way, run
rate is a pace metric, independent of the hours budget (`TargetHours`,
`marginHours`, Won/Late).

Each client has a fixed brand color (`src/lib/clientColors.js`) used for its
avatar: WF `#EB0A2C`, SO `#96D600`, PVL `#F44914`, MCFC `#6DADDF`.

Everything the dashboard shows is either a real value from the workbook, or
a clearly labeled `NA` / template estimate — nothing is invented. The
Timeline Gantt's phase bands still use a generic delivery-phase weighting
template (`PHASE_TEMPLATE` in `src/lib/derive.js`) shaded by overall % —
real per-phase task data isn't wired into that chart yet.

### How the workbook becomes app data

`scripts/generate-data.mjs` reads `FML-Data.xlsx` and writes
`src/data/generated.json` — a machine-generated file, never hand-edited,
and gitignored. It runs automatically before `pnpm dev` and `pnpm build`
(`predev`/`prebuild` in `package.json`); run it manually with
`pnpm data:build` if you want to regenerate without starting the app.
`src/data/loadProjects.js` imports only `generated.json`.

The legacy Claude Design export (`Delivery Dashboard.dc.html`, `support.js`,
`assets/`) is kept at the repo root for reference and is no longer used by
the app.

### Syncing from the Google Sheet

`pnpm sync-sheet` (`scripts/sync-from-sheet.mjs`) rebuilds `FML-Data.xlsx`
from the team's Google Sheet, then regenerates `src/data/generated.json`
(same as `pnpm data:build`) so the dashboard reflects the new data
immediately — no separate `pnpm dev` restart needed.

### Syncing Jira statuses

There's no Jira API token wired into the scripts — instead, **ask Claude to
"sync Jira statuses"** (with a Claude session that has Jira connected). It
will:

1. Look up every task row with a `TaskID` (across all project sheets) and
   fetch that issue's current status from Jira (project `FNS`), mapped to
   `done` / `inprogress` / `pending` via Jira's status category.
2. Write the resulting `{TaskID: status}` map to a temp JSON file and run
   `pnpm apply-jira-statuses <that file>` (`scripts/apply-jira-statuses.mjs`),
   which overwrites the `Status` cell for each matched row in
   `FML-Data.xlsx` and regenerates `generated.json`.

Jira is treated as the source of truth for any task that has a ticket — a
task's `Status` cell in the sheet only matters once it has no `TaskID`. Run
`pnpm sync-sheet` first if you also want the latest task list/names from the
Google Sheet before the Jira statuses are layered on top.
