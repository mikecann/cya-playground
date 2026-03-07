import { mutation } from "./_generated/server";

const BATCH_SIZE = 100;
const MAX_AGE_DAYS = 90;

export const cleanupOldActivity = mutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

    const oldEntries = await ctx.db
      .query("activityLog")
      .withIndex("by_creation_time", (q) => q.lt("_creationTime", cutoff))
      .order("asc")
      .take(BATCH_SIZE);

    for (const entry of oldEntries) {
      await ctx.db.delete("activityLog", entry._id);
    }
  },
});
