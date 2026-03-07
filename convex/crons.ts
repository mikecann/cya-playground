import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

crons.hourly(
  "cleanup old activity",
  { minuteUTC: 0 },
  api.maintenance.cleanupOldActivity,
);

export default crons;
