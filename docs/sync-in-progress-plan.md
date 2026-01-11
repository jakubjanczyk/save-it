# Sync In Progress (Plan)

Goal: show that email sync is currently running across refreshes/devices, prevent double-starts, and recover cleanly after crashes/timeouts/redeploys.

## Option Chosen (Simple + History)

Use a single table `syncRuns` that appends one row per sync attempt, and block starting a new run if there is an active (non-stale) `running` run.

Note: If we ever see rare double-start races, we can extend this with a separate lock row/table (or a single-row `syncState`) to guarantee exclusivity.

## Data Model

Add `syncRuns` table:
- `status`: `"running" | "success" | "error" | "aborted"`
- `startedAt`: number
- `finishedAt?`: number
- `lastHeartbeatAt`: number
- `progress`: object (numbers) e.g. `{ fetchedEmails, processedEmails, insertedEmails, storedLinks }`
- `errorName?`, `errorMessage?`, `errorTag?`

Indexes:
- `by_status_startedAt`: `["status", "startedAt"]` (find active running + list history)
- `by_startedAt`: `["startedAt"]` (list history)

## Server API (Convex)

### Queries
- `syncruns:getLatest`
  - Returns the most recent run summary.
- `syncruns:getActive`
  - Returns the current run if `status === "running"`.
  - Also returns whether it is stale based on `now - lastHeartbeatAt > STALE_MS`.

### Mutations (public)
- `syncruns:start`
  - If there is an active non-stale `running` run: return `{ started: false, reason: "alreadyRunning", runId }`.
  - If there is a stale `running` run: mark it `aborted` (best-effort) and start a new run.
  - Otherwise: insert a new `running` run and return `{ started: true, runId }`.

### Mutations (internal)
- `syncruns:heartbeat`
  - Update `lastHeartbeatAt` and optionally `progress`.
- `syncruns:finish`
  - Set `status` to `success` or `error`, set `finishedAt`, and attach error fields when applicable.

## Hook Into Existing Sync Action

Modify `emails:fetchFromGmail`:
- At start: call `syncruns:start` and abort early if already running.
- During work: call `syncruns:heartbeat` periodically (either:
  - on a fixed timer (e.g. every 5–10s), or
  - after each email/batch processed).
- In `finally`: call `syncruns:finish` with success/error.

Crash/redeploy behavior:
- If the action dies mid-run, heartbeats stop.
- UI will treat the run as stale after `STALE_MS`, and a new run can be started.

## UI

### Where
- Reuse the fetch card area on `/inbox` and `/` (Match empty state).

### What to show
- When active running: show "Sync in progress…" and basic progress counters; disable fetch button.
- When stale: show "Last sync interrupted" and allow starting a new sync.
- When idle: normal "Fetch new emails" behavior.

## Tests

- Convex tests:
  - `syncruns:start` blocks when an active running run exists.
  - `syncruns:start` allows new run when previous running is stale and marks it aborted.
  - `emails:fetchFromGmail` throws when already running.
- UI tests (minimal):
  - Fetch button disabled when `getActive` returns running.

## Open Questions

- `STALE_MS` value (suggest 60–120 seconds).
- Which progress counters matter most (emails fetched/processed + links stored?).
- Do we show a “Force clear” control, or is stale-handling sufficient?
