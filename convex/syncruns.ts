import type { GenericId } from "convex/values";
import { v } from "convex/values";

import { internalMutation, query } from "./_generated/server";

export const STALE_MS = 90_000;

export type SyncRunStatus = "running" | "success" | "error" | "aborted";

export interface SyncRunProgress {
  fetchedEmails: number;
  processedEmails: number;
  insertedEmails: number;
  storedLinks: number;
}

export interface SyncRunListItem {
  errorMessage?: string;
  errorName?: string;
  errorTag?: string;
  finishedAt?: number;
  id: GenericId<"syncRuns">;
  isStale: boolean;
  lastHeartbeatAt: number;
  progress: SyncRunProgress;
  startedAt: number;
  status: SyncRunStatus;
}

const progressValidator = v.object({
  fetchedEmails: v.number(),
  processedEmails: v.number(),
  insertedEmails: v.number(),
  storedLinks: v.number(),
});

function isStale(lastHeartbeatAt: number, now: number) {
  return now - lastHeartbeatAt > STALE_MS;
}

function emptyProgress(): SyncRunProgress {
  return {
    fetchedEmails: 0,
    processedEmails: 0,
    insertedEmails: 0,
    storedLinks: 0,
  };
}

export const getLatest = query({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db
      .query("syncRuns")
      .withIndex("by_startedAt", (q) => q)
      .order("desc")
      .first();

    if (!row) {
      return null;
    }

    return {
      finishedAt: row.finishedAt,
      id: row._id,
      lastHeartbeatAt: row.lastHeartbeatAt,
      progress: row.progress,
      startedAt: row.startedAt,
      status: row.status,
    };
  },
});

export const getActive = query({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db
      .query("syncRuns")
      .withIndex("by_status_startedAt", (q) => q.eq("status", "running"))
      .order("desc")
      .first();

    if (!row) {
      return null;
    }

    const now = Date.now();

    return {
      isStale: isStale(row.lastHeartbeatAt, now),
      run: {
        id: row._id,
        lastHeartbeatAt: row.lastHeartbeatAt,
        progress: row.progress,
        startedAt: row.startedAt,
        status: row.status,
      },
    };
  },
});

export const list = query({
  args: {
    limit: v.optional(v.number()),
    status: v.optional(
      v.union(
        v.literal("running"),
        v.literal("success"),
        v.literal("error"),
        v.literal("aborted")
      )
    ),
  },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(200, Math.floor(args.limit ?? 100)));
    const now = Date.now();

    if (args.status !== undefined) {
      const status = args.status;
      const rows = await ctx.db
        .query("syncRuns")
        .withIndex("by_status_startedAt", (q) => q.eq("status", status))
        .order("desc")
        .take(limit);

      return rows.map(
        (row): SyncRunListItem => ({
          errorMessage: row.errorMessage,
          errorName: row.errorName,
          errorTag: row.errorTag,
          finishedAt: row.finishedAt,
          id: row._id,
          isStale:
            row.status === "running"
              ? isStale(row.lastHeartbeatAt, now)
              : false,
          lastHeartbeatAt: row.lastHeartbeatAt,
          progress: row.progress,
          startedAt: row.startedAt,
          status: row.status,
        })
      );
    }

    const rows = await ctx.db
      .query("syncRuns")
      .withIndex("by_startedAt", (q) => q)
      .order("desc")
      .take(limit);

    return rows.map(
      (row): SyncRunListItem => ({
        errorMessage: row.errorMessage,
        errorName: row.errorName,
        errorTag: row.errorTag,
        finishedAt: row.finishedAt,
        id: row._id,
        isStale:
          row.status === "running" ? isStale(row.lastHeartbeatAt, now) : false,
        lastHeartbeatAt: row.lastHeartbeatAt,
        progress: row.progress,
        startedAt: row.startedAt,
        status: row.status,
      })
    );
  },
});

export const start = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("syncRuns")
      .withIndex("by_status_startedAt", (q) => q.eq("status", "running"))
      .order("desc")
      .first();

    if (existing && !isStale(existing.lastHeartbeatAt, now)) {
      return {
        reason: "alreadyRunning" as const,
        runId: existing._id,
        started: false as const,
      };
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        finishedAt: now,
        lastHeartbeatAt: now,
        status: "aborted",
      });
    }

    const runId = await ctx.db.insert("syncRuns", {
      lastHeartbeatAt: now,
      progress: emptyProgress(),
      startedAt: now,
      status: "running",
    });

    return { runId, started: true as const };
  },
});

export const heartbeat = internalMutation({
  args: { progress: progressValidator, runId: v.id("syncRuns") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.runId);
    if (!existing) {
      throw new Error("Sync run not found");
    }

    if (existing.status !== "running") {
      throw new Error("Sync run is not running");
    }

    const now = Date.now();
    await ctx.db.patch(args.runId, {
      lastHeartbeatAt: now,
      progress: args.progress,
    });

    return null;
  },
});

export const finish = internalMutation({
  args: {
    errorMessage: v.optional(v.string()),
    errorName: v.optional(v.string()),
    errorTag: v.optional(v.string()),
    progress: progressValidator,
    runId: v.id("syncRuns"),
    status: v.union(v.literal("success"), v.literal("error")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.runId);
    if (!existing) {
      throw new Error("Sync run not found");
    }

    const now = Date.now();

    await ctx.db.patch(args.runId, {
      errorMessage: args.errorMessage,
      errorName: args.errorName,
      errorTag: args.errorTag,
      finishedAt: now,
      lastHeartbeatAt: now,
      progress: args.progress,
      status: args.status,
    });

    return null;
  },
});
