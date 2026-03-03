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

    const enriched = [];
    for (const entry of activity) {
      const user = await ctx.db.get("users", entry.userId);
      enriched.push({
        _id: entry._id,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        metadata: entry.metadata ?? null,
        userName: user?.name ?? "Unknown",
        _creationTime: entry._creationTime,
      });
    }

    return enriched;
  },
});
