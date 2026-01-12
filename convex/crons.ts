import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

crons.hourly(
  "background sync tick",
  { minuteUTC: 0 },
  internal.emails.backgroundSyncTick
);

export default crons;

