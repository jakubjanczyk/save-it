import type { FunctionReference } from "convex/server";
import { makeFunctionReference } from "convex/server";
import type { GenericId } from "convex/values";
import { convexTest } from "convex-test";
import { expect, test, vi } from "vitest";

import schema from "./schema";
import { STALE_MS } from "./syncruns";

const modules = import.meta.glob("./**/*.*s");

const startSyncRun: FunctionReference<
  "mutation",
  "internal",
  Record<string, never>,
  | { started: true; runId: GenericId<"syncRuns"> }
  | { started: false; reason: "alreadyRunning"; runId: GenericId<"syncRuns"> }
> = makeFunctionReference("syncruns:start") as unknown as FunctionReference<
  "mutation",
  "internal",
  Record<string, never>,
  | { started: true; runId: GenericId<"syncRuns"> }
  | { started: false; reason: "alreadyRunning"; runId: GenericId<"syncRuns"> }
>;

const getActiveSyncRun: FunctionReference<
  "query",
  "public",
  Record<string, never>,
  {
    isStale: boolean;
    run: {
      id: GenericId<"syncRuns">;
      lastHeartbeatAt: number;
      progress: {
        fetchedEmails: number;
        insertedEmails: number;
        processedEmails: number;
        storedLinks: number;
      };
      startedAt: number;
      status: "running";
    };
  } | null
> = makeFunctionReference("syncruns:getActive");

type SyncRunStatus = "running" | "success" | "error" | "aborted";

const listSyncRuns: FunctionReference<
  "query",
  "public",
  { limit?: number; status?: SyncRunStatus },
  Array<{
    id: GenericId<"syncRuns">;
    startedAt: number;
    status: SyncRunStatus;
    isStale: boolean;
  }>
> = makeFunctionReference("syncruns:list");

test("start creates a running sync run", async () => {
  const t = convexTest(schema, modules);
  const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1000);

  try {
    const start = await t.mutation(startSyncRun, {});
    expect(start.started).toBe(true);

    const active = await t.query(getActiveSyncRun, {});
    expect(active?.isStale).toBe(false);
    expect(active?.run.startedAt).toBe(1000);
  } finally {
    nowSpy.mockRestore();
  }
});

test("list returns runs ordered by startedAt descending", async () => {
  const t = convexTest(schema, modules);

  await t.run((ctx) =>
    ctx.db.insert("syncRuns", {
      lastHeartbeatAt: 1,
      progress: {
        fetchedEmails: 0,
        insertedEmails: 0,
        processedEmails: 0,
        storedLinks: 0,
      },
      startedAt: 1,
      status: "success",
    })
  );

  await t.run((ctx) =>
    ctx.db.insert("syncRuns", {
      lastHeartbeatAt: 2,
      progress: {
        fetchedEmails: 0,
        insertedEmails: 0,
        processedEmails: 0,
        storedLinks: 0,
      },
      startedAt: 2,
      status: "success",
    })
  );

  const runs = await t.query(listSyncRuns, {});
  expect(runs.map((row) => row.startedAt)).toEqual([2, 1]);
});

test("list filters by status", async () => {
  const t = convexTest(schema, modules);

  await t.run((ctx) =>
    ctx.db.insert("syncRuns", {
      lastHeartbeatAt: 1,
      progress: {
        fetchedEmails: 0,
        insertedEmails: 0,
        processedEmails: 0,
        storedLinks: 0,
      },
      startedAt: 1,
      status: "success",
    })
  );

  const errorId = await t.run((ctx) =>
    ctx.db.insert("syncRuns", {
      errorMessage: "Boom",
      lastHeartbeatAt: 2,
      progress: {
        fetchedEmails: 0,
        insertedEmails: 0,
        processedEmails: 0,
        storedLinks: 0,
      },
      startedAt: 2,
      status: "error",
    })
  );

  const runs = await t.query(listSyncRuns, { status: "error" });
  expect(runs.map((row) => row.id)).toEqual([errorId]);
});

test("list marks running run as stale when heartbeat is too old", async () => {
  const t = convexTest(schema, modules);
  const nowSpy = vi.spyOn(Date, "now").mockReturnValue(STALE_MS + 1);

  try {
    await t.run((ctx) =>
      ctx.db.insert("syncRuns", {
        lastHeartbeatAt: 0,
        progress: {
          fetchedEmails: 0,
          insertedEmails: 0,
          processedEmails: 0,
          storedLinks: 0,
        },
        startedAt: 0,
        status: "running",
      })
    );

    const runs = await t.query(listSyncRuns, { limit: 1 });
    expect(runs[0]?.isStale).toBe(true);
  } finally {
    nowSpy.mockRestore();
  }
});

test("start blocks when an active run exists", async () => {
  const t = convexTest(schema, modules);
  const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1000);

  try {
    const first = await t.mutation(startSyncRun, {});
    expect(first.started).toBe(true);

    nowSpy.mockReturnValue(2000);
    const second = await t.mutation(startSyncRun, {});

    expect(second.started).toBe(false);
    expect(second).toEqual({
      reason: "alreadyRunning",
      runId: (first as { runId: GenericId<"syncRuns"> }).runId,
      started: false,
    });
  } finally {
    nowSpy.mockRestore();
  }
});

test("start aborts stale run and starts a new one", async () => {
  const t = convexTest(schema, modules);
  const nowSpy = vi.spyOn(Date, "now").mockReturnValue(0);

  try {
    const first = await t.mutation(startSyncRun, {});
    expect(first.started).toBe(true);

    const firstId = (first as { runId: GenericId<"syncRuns"> }).runId;

    nowSpy.mockReturnValue(STALE_MS + 1);
    const second = await t.mutation(startSyncRun, {});
    expect(second.started).toBe(true);

    const firstRow = await t.run((ctx) => ctx.db.get(firstId));
    expect(firstRow?.status).toBe("aborted");
    expect(firstRow?.finishedAt).toBe(STALE_MS + 1);
  } finally {
    nowSpy.mockRestore();
  }
});

test("getActive marks a run as stale after STALE_MS", async () => {
  const t = convexTest(schema, modules);
  const nowSpy = vi.spyOn(Date, "now").mockReturnValue(0);

  try {
    const runId = await t.run((ctx) =>
      ctx.db.insert("syncRuns", {
        lastHeartbeatAt: 0,
        progress: {
          fetchedEmails: 0,
          insertedEmails: 0,
          processedEmails: 0,
          storedLinks: 0,
        },
        startedAt: 0,
        status: "running",
      })
    );

    nowSpy.mockReturnValue(STALE_MS + 1);
    const active = await t.query(getActiveSyncRun, {});
    expect(active?.run.id).toBe(runId);
    expect(active?.isStale).toBe(true);
  } finally {
    nowSpy.mockRestore();
  }
});
