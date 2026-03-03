import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Reporting queries for use via the Convex Dashboard

export const getActivityForUser = internalQuery({
  args: {
    projectId: v.id("projects"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const activity = await ctx.db
      .query("activityLog")
      .order("desc")
      .filter((q) =>
        q.and(
          q.eq(q.field("projectId"), args.projectId),
          q.eq(q.field("userId"), args.userId),
        ),
      )
      .take(50);

    return activity;
  },
});
